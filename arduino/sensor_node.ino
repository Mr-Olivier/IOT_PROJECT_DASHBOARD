#include <DHT.h>
#include <SoftwareSerial.h>
#include <ModbusMaster.h>

// ---------------- PIN SETUP ----------------
#define DHTPIN D4
#define DHTTYPE DHT11
#define SOIL_PIN A0
#define TRIG D5
#define ECHO D6
#define RELAY_PIN D1
#define MAX485_DE_RE D2
#define RX_PIN D7
#define TX_PIN D8

// Node identifier — must match a registered node in the dashboard
#define NODE_ID "arduino-node-1"

// ---------------- OBJECTS ----------------
DHT dht(DHTPIN, DHTTYPE);
SoftwareSerial modbusSerial(RX_PIN, TX_PIN);
ModbusMaster node;

// ---------------- VARIABLES ----------------
long duration;
float distance;
int soilValue;
float temp, hum;
uint16_t nitrogen = 0;

// ---------------- PRE/POST TRANSMISSION ----------------
void preTransmission()  { digitalWrite(MAX485_DE_RE, HIGH); }
void postTransmission() { digitalWrite(MAX485_DE_RE, LOW);  }

// ---------------- SETUP ----------------
void setup() {
  Serial.begin(9600);
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(MAX485_DE_RE, OUTPUT);
  digitalWrite(MAX485_DE_RE, LOW);

  dht.begin();
  modbusSerial.begin(9600);
  node.begin(1, modbusSerial);
  node.preTransmission(preTransmission);
  node.postTransmission(postTransmission);

  Serial.println("SYSTEM STARTED...");
}

// ---------------- LOOP ----------------
void loop() {
  // Soil Moisture
  soilValue = analogRead(SOIL_PIN);

  // DHT11
  temp = dht.readTemperature();
  hum  = dht.readHumidity();
  if (isnan(temp) || isnan(hum)) {
    temp = -999;
    hum  = -999;
  }

  // Ultrasonic
  digitalWrite(TRIG, LOW);  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  duration = pulseIn(ECHO, HIGH, 30000);
  distance = (duration == 0) ? -1 : duration * 0.034 / 2;

  // NPK — Nitrogen via Modbus (register 0x001E)
  uint8_t result = node.readHoldingRegisters(0x001E, 1);
  nitrogen = (result == node.ku8MBSuccess) ? node.getResponseBuffer(0) : -1;

  // Pump decision
  if (soilValue > 600 && distance > 0 && distance < 20) {
    digitalWrite(RELAY_PIN, HIGH);
  } else {
    digitalWrite(RELAY_PIN, LOW);
  }

  // Output one CSV line — parsed by the Python bridge
  // Format: NODE_ID,temp,humidity,soilRaw,distCm,nHex,pHex,kHex
  // P and K not measured — send 00 as placeholder
  Serial.print(NODE_ID);
  Serial.print(",");
  Serial.print(temp);
  Serial.print(",");
  Serial.print(hum);
  Serial.print(",");
  Serial.print(soilValue);
  Serial.print(",");
  Serial.print(distance);
  Serial.print(",");
  if (nitrogen == (uint16_t)-1) {
    Serial.print("-1,-1,-1");
  } else {
    Serial.print(nitrogen, HEX);
    Serial.print(",00,00");  // P and K not available
  }
  Serial.println();

  delay(3000);
}
// sketch output
