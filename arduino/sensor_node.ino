#include <SoftwareSerial.h>
#include <DHT.h>

// -------------------- NPK SENSOR --------------------
#define RE_DE 4
#define RX_PIN 2
#define TX_PIN 3

SoftwareSerial mod(RX_PIN, TX_PIN); // RX, TX

byte nitrogenCmd[]   = {0x01, 0x03, 0x00, 0x1E, 0x00, 0x01, 0xE4, 0x0C};
byte phosphorusCmd[] = {0x01, 0x03, 0x00, 0x1F, 0x00, 0x01, 0xB5, 0xCC};
byte potassiumCmd[]  = {0x01, 0x03, 0x00, 0x20, 0x00, 0x01, 0x85, 0xC0};

byte values[11];

// -------------------- SOIL MOISTURE + RELAY --------------------
#define MOISTURE_PIN A0
#define RELAY_PIN 8

int moistureThreshold = 300;

// -------------------- ULTRASONIC --------------------
#define TRIG_PIN 9
#define ECHO_PIN 10

float emptyDistance = 12.0;
float fullDistance  = 3.0;
float waterLimit    = 11.0;

// -------------------- DHT --------------------
#define DHTPIN 7
#define DHTTYPE DHT11

DHT dht(DHTPIN, DHTTYPE);

// -------------------- FUNCTIONS --------------------
byte readNPKValue(byte *command) {
  while (mod.available()) mod.read();

  digitalWrite(RE_DE, HIGH);
  delay(10);
  mod.write(command, 8);
  mod.flush();

  digitalWrite(RE_DE, LOW);
  delay(100);

  for (byte i = 0; i < 7; i++) {
    if (mod.available()) values[i] = mod.read();
  }

  return values[4];
}

float readDistance() {
  long duration;
  float distance;

  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);

  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  duration = pulseIn(ECHO_PIN, HIGH, 30000);

  if (duration == 0) return -1;

  distance = duration * 0.0343 / 2.0;
  return distance;
}

float readAverageDistance() {
  float total = 0;
  int count = 0;

  for (int i = 0; i < 5; i++) {
    float d = readDistance();
    if (d > 0) {
      total += d;
      count++;
    }
    delay(50);
  }

  if (count == 0) return -1;
  return total / count;
}

void setup() {
  Serial.begin(9600);

  mod.begin(9600);
  pinMode(RE_DE, OUTPUT);
  digitalWrite(RE_DE, LOW);

  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  dht.begin();

  Serial.println("Smart Irrigation System Started");
  Serial.println("================================");
}

void loop() {

  // -------- Read NPK --------
  byte nitrogen = readNPKValue(nitrogenCmd);
  delay(200);
  byte phosphorus = readNPKValue(phosphorusCmd);
  delay(200);
  byte potassium = readNPKValue(potassiumCmd);
  delay(200);

  // -------- Soil --------
  int moisture = analogRead(MOISTURE_PIN);
  bool soilDry = (moisture > moistureThreshold);

  // -------- Tank --------
  float distance = readAverageDistance();
  bool tankHasWater = false;
  float percentFull = 0;

  if (distance > 0) {
    tankHasWater = (distance < waterLimit);
    percentFull = ((emptyDistance - distance) / (emptyDistance - fullDistance)) * 100.0;

    if (percentFull < 0) percentFull = 0;
    if (percentFull > 100) percentFull = 100;
  }

  // -------- DHT --------
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();

  // -------- Pump --------
  bool pumpOn = soilDry && tankHasWater;
  digitalWrite(RELAY_PIN, pumpOn ? HIGH : LOW);

  // -------- Human-readable output (Serial Monitor) --------
  Serial.println("----------- SENSOR DATA -----------");

  Serial.print("Nitrogen: "); Serial.print(nitrogen); Serial.println(" mg/kg");
  Serial.print("Phosphorus: "); Serial.print(phosphorus); Serial.println(" mg/kg");
  Serial.print("Potassium: "); Serial.print(potassium); Serial.println(" mg/kg");

  Serial.print("Soil Moisture: "); Serial.println(moisture);
  Serial.println(soilDry ? "Soil: DRY" : "Soil: WET");

  Serial.print("Tank %: "); Serial.println(percentFull);

  if (!isnan(humidity) && !isnan(temperature)) {
    Serial.print("Temp: "); Serial.println(temperature);
    Serial.print("Humidity: "); Serial.println(humidity);
  }

  Serial.println(pumpOn ? "Pump: ON" : "Pump: OFF");

  // -------- Dashboard data line — parsed by Python serial bridge --------
  Serial.print("DATA:");
  Serial.print("N="); Serial.print(nitrogen);    Serial.print(",");
  Serial.print("P="); Serial.print(phosphorus);  Serial.print(",");
  Serial.print("K="); Serial.print(potassium);   Serial.print(",");
  Serial.print("M="); Serial.print(moisture);    Serial.print(",");
  Serial.print("T="); Serial.print(temperature); Serial.print(",");
  Serial.print("H="); Serial.print(humidity);    Serial.print(",");
  Serial.print("W="); Serial.print(percentFull); Serial.print(",");
  Serial.print("PUMP="); Serial.println(pumpOn ? 1 : 0);

  Serial.println("-----------------------------------");
  Serial.println();

  delay(2000);
}
