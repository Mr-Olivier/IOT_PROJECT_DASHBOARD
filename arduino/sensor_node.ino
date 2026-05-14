/*
 * AquaSense IoT — Smart Irrigation Node
 * Arduino Uno — sensor_node.ino
 *
 * WHAT THIS SKETCH DOES:
 *  1. Reads all sensors every 2 seconds:
 *       - NPK  (nitrogen, phosphorus, potassium)  via RS-485 Modbus
 *       - Soil moisture                            via analogue ADC
 *       - Water reservoir level                   via HC-SR04 ultrasonic
 *       - Air temperature & humidity              via DHT11
 *
 *  2. Sends a compact DATA: line to the Python bridge over USB serial.
 *     The bridge stores the reading in PostgreSQL and asks the ML model
 *     what to do.
 *
 *  3. Receives ML decisions from the bridge over the same USB serial:
 *       CMD:PUMP=1:IRRIGATE   — ML says irrigate, turn pump ON
 *       CMD:PUMP=0:HOLD       — ML says soil is fine, keep pump OFF
 *       CMD:PUMP=0:LOW_WATER  — ML says tank empty, keep pump OFF
 *
 *  4. Controls the pump relay (pin 8) based on the ML decision.
 *     If no ML command arrives within ML_CMD_TIMEOUT_MS the sketch
 *     falls back to a local rule (pump ON when soil is dry AND tank
 *     has water) so the field is never left unattended if the PC
 *     disconnects.
 *
 *  5. Confirms each command back to the bridge:
 *       ACK:PUMP=1:IRRIGATE
 *
 *  Serial protocol summary
 *  ───────────────────────
 *  Arduino → PC  :  DATA:N=x,P=x,K=x,M=x,T=x,H=x,W=x,PUMP=x,SRC=ML,DECISION=IRRIGATE
 *  PC      → Arduino:  CMD:PUMP=1:IRRIGATE   (or HOLD / LOW_WATER)
 *  Arduino → PC  :  ACK:PUMP=1:IRRIGATE
 */

#include <SoftwareSerial.h>
#include <DHT.h>

// ═══════════════════════════════════════════════════════════
//  PIN DEFINITIONS
// ═══════════════════════════════════════════════════════════

// NPK sensor (RS-485 Modbus via SoftwareSerial)
#define RE_DE    4    // RS-485 direction control (HIGH = transmit)
#define RX_PIN   2
#define TX_PIN   3

// Soil moisture (capacitive, analogue)
#define MOISTURE_PIN  A0
#define RELAY_PIN      8   // Pump relay — HIGH = pump ON

// Ultrasonic reservoir sensor (HC-SR04)
#define TRIG_PIN   9
#define ECHO_PIN  10

// DHT11 temperature + humidity
#define DHTPIN    7
#define DHTTYPE DHT11

// Built-in LED (pin 13) — visual pump status indicator
#define LED_PIN  13

// ═══════════════════════════════════════════════════════════
//  SENSOR CONFIG
// ═══════════════════════════════════════════════════════════

// Soil moisture threshold (raw ADC, 0-1023).
// Above this value  → soil is DRY (capacitive reads LOWER when wet).
// Formula: raw = (1 - pct/100) * 1023  →  78% threshold = (1-0.78)*1023 = 225
// Must match ML service _derive_label(): soil < 78% → IRRIGATE
const int MOISTURE_DRY_THRESHOLD = 225;

// Reservoir geometry (centimetres from sensor face)
const float TANK_EMPTY_CM = 12.0;   // distance when tank is empty
const float TANK_FULL_CM  =  3.0;   // distance when tank is full
const float TANK_LOW_CM   = 11.0;   // distance below which pump is unsafe

// ═══════════════════════════════════════════════════════════
//  ML COMMAND STATE
// ═══════════════════════════════════════════════════════════

// How long (ms) to honour an ML command before reverting to local rule
#define ML_CMD_TIMEOUT_MS 15000

bool          mlPumpOverride   = false;
bool          mlCmdActive      = false;
String        mlDecisionLabel  = "NONE";   // IRRIGATE / HOLD / LOW_WATER
unsigned long mlCmdReceivedAt  = 0;

String serialBuffer = "";   // accumulates incoming USB bytes into complete lines

// ═══════════════════════════════════════════════════════════
//  OBJECTS
// ═══════════════════════════════════════════════════════════

SoftwareSerial mod(RX_PIN, TX_PIN);
DHT dht(DHTPIN, DHTTYPE);

// NPK Modbus query bytes
byte nitrogenCmd[]   = {0x01, 0x03, 0x00, 0x1E, 0x00, 0x01, 0xE4, 0x0C};
byte phosphorusCmd[] = {0x01, 0x03, 0x00, 0x1F, 0x00, 0x01, 0xB5, 0xCC};
byte potassiumCmd[]  = {0x01, 0x03, 0x00, 0x20, 0x00, 0x01, 0x85, 0xC0};
byte npkBuffer[11];

// ═══════════════════════════════════════════════════════════
//  SENSOR READING FUNCTIONS
// ═══════════════════════════════════════════════════════════

byte readNPKValue(byte* command) {
  while (mod.available()) mod.read();       // flush stale bytes
  digitalWrite(RE_DE, HIGH);               // enable transmit
  delay(10);
  mod.write(command, 8);
  mod.flush();
  digitalWrite(RE_DE, LOW);               // switch to receive
  delay(100);
  for (byte i = 0; i < 7; i++) {
    if (mod.available()) npkBuffer[i] = mod.read();
  }
  return npkBuffer[4];                     // payload byte
}

float readDistanceCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  if (duration == 0) return -1.0;
  return duration * 0.0343 / 2.0;
}

float readAverageDistanceCm() {
  float total = 0; int count = 0;
  for (int i = 0; i < 5; i++) {
    float d = readDistanceCm();
    if (d > 0) { total += d; count++; }
    delay(50);
  }
  return (count == 0) ? -1.0 : total / count;
}

// ═══════════════════════════════════════════════════════════
//  SERIAL COMMAND RECEIVER
//  Called every loop iteration — processes any bytes the bridge
//  sent since the last call.
// ═══════════════════════════════════════════════════════════

void processIncomingCommands() {
  while (Serial.available()) {
    char c = (char)Serial.read();
    if (c == '\n' || c == '\r') {
      if (serialBuffer.length() > 0) {
        handleCommand(serialBuffer);
        serialBuffer = "";
      }
    } else {
      serialBuffer += c;
    }
  }
}

/*
 * handleCommand — parse one complete line from the bridge.
 *
 * Supported formats
 *   CMD:PUMP=1:IRRIGATE    → turn pump ON,  store decision = "IRRIGATE"
 *   CMD:PUMP=0:HOLD        → turn pump OFF, store decision = "HOLD"
 *   CMD:PUMP=0:LOW_WATER   → turn pump OFF, store decision = "LOW_WATER"
 *   CMD:PUMP=1             → turn pump ON  (legacy format, no label)
 *   CMD:PUMP=0             → turn pump OFF (legacy format, no label)
 */
void handleCommand(String line) {
  line.trim();

  if (!line.startsWith("CMD:PUMP=")) return;

  // Everything after "CMD:PUMP=" — could be "1:IRRIGATE" or just "1"
  String rest = line.substring(9);
  rest.trim();

  String pumpVal;
  String decision = "UNKNOWN";

  int colonIdx = rest.indexOf(':');
  if (colonIdx >= 0) {
    pumpVal  = rest.substring(0, colonIdx);
    decision = rest.substring(colonIdx + 1);
  } else {
    pumpVal = rest;
  }

  pumpVal.trim();
  decision.trim();

  bool newPumpState = (pumpVal == "1");

  mlPumpOverride  = newPumpState;
  mlCmdActive     = true;
  mlCmdReceivedAt = millis();
  mlDecisionLabel = decision;

  // Immediately apply the relay so there is zero lag between the ML
  // decision arriving and the pump responding
  digitalWrite(RELAY_PIN, newPumpState ? HIGH : LOW);
  digitalWrite(LED_PIN,   newPumpState ? HIGH : LOW);

  // Acknowledge to the bridge — it logs this as confirmation
  Serial.print("ACK:PUMP=");
  Serial.print(newPumpState ? "1" : "0");
  Serial.print(":");
  Serial.println(decision);

  // Detailed status to Serial Monitor so the viewer can see the ML chain
  Serial.println();
  Serial.println("╔══════════════════════════════════════╗");
  Serial.print  ("║  ML DECISION RECEIVED : "); Serial.println(decision + "  ║");
  Serial.print  ("║  Pump relay           : "); Serial.println(newPumpState ? "ON   ║" : "OFF  ║");
  Serial.println("╚══════════════════════════════════════╝");
  Serial.println();
}

// ═══════════════════════════════════════════════════════════
//  SETUP
// ═══════════════════════════════════════════════════════════

void setup() {
  Serial.begin(9600);

  mod.begin(9600);
  pinMode(RE_DE, OUTPUT);
  digitalWrite(RE_DE, LOW);

  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);   // pump OFF on boot

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  dht.begin();

  Serial.println();
  Serial.println("╔════════════════════════════════════════════╗");
  Serial.println("║   AquaSense IoT — Smart Irrigation Node    ║");
  Serial.println("║   Arduino Uno ready                        ║");
  Serial.println("║   Waiting for ML commands on USB serial    ║");
  Serial.println("╚════════════════════════════════════════════╝");
  Serial.println();
  Serial.println("Command format:  CMD:PUMP=1:IRRIGATE");
  Serial.println("                 CMD:PUMP=0:HOLD");
  Serial.println("                 CMD:PUMP=0:LOW_WATER");
  Serial.println();
}

// ═══════════════════════════════════════════════════════════
//  MAIN LOOP  (runs every ~2 seconds)
// ═══════════════════════════════════════════════════════════

void loop() {

  // ── 1. Check USB serial for ML commands from the bridge ──────────────────
  processIncomingCommands();

  // ── 2. Expire stale ML command — revert to local safety rule ─────────────
  if (mlCmdActive && (millis() - mlCmdReceivedAt > ML_CMD_TIMEOUT_MS)) {
    mlCmdActive     = false;
    mlDecisionLabel = "EXPIRED";
    Serial.println("INFO: ML command expired — using local threshold fallback");
  }

  // ── 3. Read NPK sensor ───────────────────────────────────────────────────
  byte nitrogen   = readNPKValue(nitrogenCmd);   delay(200);
  byte phosphorus = readNPKValue(phosphorusCmd); delay(200);
  byte potassium  = readNPKValue(potassiumCmd);  delay(200);

  // ── 4. Read soil moisture ────────────────────────────────────────────────
  int  moistureRaw = analogRead(MOISTURE_PIN);
  // Convert ADC (0-1023) to percentage: higher ADC = drier = lower %
  float soilPct = (1.0 - (float)moistureRaw / 1023.0) * 100.0;
  bool  soilDry = (moistureRaw > MOISTURE_DRY_THRESHOLD);

  // ── 5. Read reservoir level ──────────────────────────────────────────────
  float distCm      = readAverageDistanceCm();
  bool  tankHasWater = false;
  float reservoirPct = 0.0;

  if (distCm > 0) {
    tankHasWater  = (distCm < TANK_LOW_CM);
    reservoirPct  = ((TANK_EMPTY_CM - distCm) / (TANK_EMPTY_CM - TANK_FULL_CM)) * 100.0;
    reservoirPct  = constrain(reservoirPct, 0.0, 100.0);
  }

  // ── 6. Read temperature + humidity ──────────────────────────────────────
  float humidity    = dht.readHumidity();
  float temperature = dht.readTemperature();

  // ── 7. PUMP DECISION ─────────────────────────────────────────────────────
  //
  //   Priority 1 — ML model command (fresh, within timeout)
  //   Priority 2 — Local threshold rule (bridge offline / ML unavailable)
  //
  bool   pumpOn;
  String pumpSource;
  String decisionOut;

  if (mlCmdActive) {
    // ── ML is in control ──────────────────────────────────────────────────
    pumpOn      = mlPumpOverride;
    pumpSource  = "ML";
    decisionOut = mlDecisionLabel;
  } else {
    // ── Local fallback rule ───────────────────────────────────────────────
    // IRRIGATE  : soil dry AND tank has water
    // LOW_WATER : soil dry but tank empty — hold pump to protect motor
    // HOLD      : soil already moist enough
    if (!tankHasWater && soilDry) {
      pumpOn      = false;
      decisionOut = "LOW_WATER";
    } else if (soilDry && tankHasWater) {
      pumpOn      = true;
      decisionOut = "IRRIGATE";
    } else {
      pumpOn      = false;
      decisionOut = "HOLD";
    }
    pumpSource = "LOCAL";
  }

  // Apply relay + LED
  digitalWrite(RELAY_PIN, pumpOn ? HIGH : LOW);
  digitalWrite(LED_PIN,   pumpOn ? HIGH : LOW);

  // ── 8. Human-readable Serial Monitor output ──────────────────────────────
  Serial.println("─────────────────────────────────────────────");
  Serial.print("Nitrogen   : "); Serial.print(nitrogen);   Serial.println(" mg/kg");
  Serial.print("Phosphorus : "); Serial.print(phosphorus); Serial.println(" mg/kg");
  Serial.print("Potassium  : "); Serial.print(potassium);  Serial.println(" mg/kg");
  Serial.println();

  Serial.print("Soil moisture  : "); Serial.print(soilPct, 1);  Serial.print("%");
  Serial.println(soilDry ? "  [DRY]" : "  [OK]");

  Serial.print("Reservoir      : "); Serial.print(reservoirPct, 1); Serial.print("%");
  Serial.println(tankHasWater ? "  [OK]" : "  [LOW]");

  if (!isnan(temperature) && !isnan(humidity)) {
    Serial.print("Temperature    : "); Serial.print(temperature, 1); Serial.println(" °C");
    Serial.print("Humidity       : "); Serial.print(humidity, 1);    Serial.println(" %");
  }

  Serial.println();
  Serial.print("Decision source: "); Serial.println(pumpSource);
  Serial.print("ML decision    : "); Serial.println(decisionOut);
  Serial.print("Pump relay     : "); Serial.println(pumpOn ? "ON  ← relay energised, water flowing" : "OFF ← relay open, no flow");
  Serial.println("─────────────────────────────────────────────");
  Serial.println();

  // ── 9. DATA line — parsed by the Python bridge ───────────────────────────
  //
  //   Format: DATA:N=x,P=x,K=x,M=x,T=x,H=x,W=x,PUMP=x,SRC=ML,DECISION=IRRIGATE
  //
  //   SRC      = ML or LOCAL  (who made the pump decision)
  //   DECISION = IRRIGATE / HOLD / LOW_WATER / EXPIRED
  //
  Serial.print("DATA:");
  Serial.print("N=");        Serial.print(nitrogen);
  Serial.print(",P=");       Serial.print(phosphorus);
  Serial.print(",K=");       Serial.print(potassium);
  Serial.print(",M=");       Serial.print(moistureRaw);
  Serial.print(",T=");       Serial.print(temperature);
  Serial.print(",H=");       Serial.print(humidity);
  Serial.print(",W=");       Serial.print(reservoirPct);
  Serial.print(",PUMP=");    Serial.print(pumpOn ? 1 : 0);
  Serial.print(",SRC=");     Serial.print(pumpSource);
  Serial.print(",DECISION="); Serial.println(decisionOut);

  delay(2000);
}
