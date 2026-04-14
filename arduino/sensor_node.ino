#include <DHT.h>
#include <SoftwareSerial.h>

// ===== DHT =====
#define DHTPIN 2
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

// ===== SOIL =====
#define SOIL_PIN A0
int threshold = 500;

// ===== ULTRASONIC =====
#define TRIG_PIN 5
#define ECHO_PIN 4

// ===== NPK (RS485) =====
#define DE_RE 0
SoftwareSerial rs485(12, 13);

// ===== VARIABLES =====
long duration;
float distance;
int soilValue;
float temperature;
float humidity;
int N = 0, P = 0, K = 0;

// ===== SETUP =====
void setup() {
  Serial.begin(9600);
  dht.begin();
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(DE_RE, OUTPUT);
  digitalWrite(DE_RE, LOW);
  rs485.begin(9600);
}

// ===== ULTRASONIC =====
void readUltrasonic() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  duration = pulseIn(ECHO_PIN, HIGH, 30000);
  distance = (duration == 0) ? -1 : duration * 0.034 / 2;
}

// ===== SOIL =====
void readSoil() {
  soilValue = analogRead(SOIL_PIN);
}

// ===== DHT =====
void readDHT() {
  temperature = dht.readTemperature();
  humidity = dht.readHumidity();
  if (isnan(temperature) || isnan(humidity)) {
    temperature = -999;
    humidity = -999;
  }
}

// ===== NPK =====
void readNPK() {
  byte request[] = {0x01, 0x03, 0x00, 0x1E, 0x00, 0x03, 0x65, 0xCD};
  while (rs485.available()) rs485.read();
  digitalWrite(DE_RE, HIGH);
  delay(10);
  rs485.write(request, sizeof(request));
  rs485.flush();
  digitalWrite(DE_RE, LOW);
  delay(300);
  if (rs485.available() >= 9) {
    byte response[9];
    for (int i = 0; i < 9; i++) response[i] = rs485.read();
    N = (response[3] << 8) | response[4];
    P = (response[5] << 8) | response[6];
    K = (response[7] << 8) | response[8];
  } else {
    N = -1; P = -1; K = -1;
  }
}

// ===== LOOP =====
void loop() {
  readSoil();
  readDHT();
  readUltrasonic();
  readNPK();

  // Human-readable output parsed by Python bridge
  Serial.println("==============================");
  Serial.print("Soil Value  : "); Serial.print(soilValue);
  Serial.println(soilValue > threshold ? "  -> DRY" : "  -> WET");
  Serial.print("Temperature : "); Serial.print(temperature); Serial.println(" C");
  Serial.print("Humidity    : "); Serial.print(humidity); Serial.println(" %");
  Serial.print("Tank Dist   : "); Serial.print(distance); Serial.println(" cm");
  Serial.println("--------------------------------------------");
  Serial.print("Nitrogen  N : "); Serial.println(N);
  Serial.print("Phosphorus P: "); Serial.println(P);
  Serial.print("Potassium  K: "); Serial.println(K);
  Serial.println("==============================");

  delay(3000);
}
