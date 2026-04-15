import Link from 'next/link'
import {
  ArrowLeft,
  Droplets,
  Thermometer,
  Wind,
  Waves,
  Leaf,
  Cpu,
  Database,
  Zap,
  AlertTriangle,
  TrendingUp,
  BookOpen,
  ChevronRight,
  Radio,
  Activity,
  Wifi,
} from 'lucide-react'

// ─── Table of contents ────────────────────────────────────────────────────────
const TOC = [
  { id: 'overview',       label: '1. System Overview — What AquaSense Does' },
  { id: 'hardware',       label: '2. Hardware Components & Wiring' },
  { id: 'arduino',        label: '3. Arduino Code — How Each Sensor is Read' },
  { id: 'serial',         label: '4. Python Serial Bridge — Sending Data to the Server' },
  { id: 'conversion',     label: '5. Data Conversion Formulas (Raw → Real Units)' },
  { id: 'pump',           label: '6. Pump Control Logic (Relay Decision)' },
  { id: 'api',            label: '7. Web API & Database Storage' },
  { id: 'classification', label: '8. Data Classification — 5 Classes' },
  { id: 'correlation',    label: '9. Sensor Correlations' },
  { id: 'algorithms',     label: '10. Mathematical Methods & Algorithms' },
]

export default function DocsPage() {
  return (
    <main className="bg-[#f8fafc] min-h-screen pb-20">

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-4 py-8 md:px-8">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-emerald-600 transition-colors mb-5 group"
          >
            <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-3.5 rounded-2xl shadow-md shadow-emerald-100 shrink-0">
              <BookOpen size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                AquaSense — Full Project Documentation
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                Smart Irrigation &amp; Precision Agriculture · Arduino Uno · NPK · DHT11 · HC-SR04 · Soil Moisture
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-8 pt-8 space-y-5">

        {/* ── Table of Contents ──────────────────────────────────────────────── */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
            Table of Contents
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-0.5">
            {TOC.map((t) => (
              <a key={t.id} href={`#${t.id}`}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-emerald-600 py-2 px-2 rounded-xl hover:bg-emerald-50 transition-colors group"
              >
                <ChevronRight size={13} className="text-gray-300 group-hover:text-emerald-500 shrink-0" />
                {t.label}
              </a>
            ))}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            1 — SYSTEM OVERVIEW
        ════════════════════════════════════════════════════════════════════ */}
        <DocSection id="overview" icon={<Activity size={18} className="text-white" />}
          gradient="from-emerald-500 to-teal-600" title="1. System Overview — What AquaSense Does">

          <P>
            AquaSense is a <B>smart irrigation and precision agriculture system</B>. The problem
            it solves is that most farmers water their crops at fixed times — wasting water when
            the soil is already wet and risking crop damage when they miss a watering cycle.
          </P>
          <P>
            AquaSense reads the soil condition every 2 seconds. If the soil is dry <B>and</B> the
            water tank has enough water, the system automatically turns on the irrigation pump.
            The moment the soil becomes wet or the tank runs low, the pump turns off.
            Every reading is also sent to a web dashboard for monitoring, historical analysis,
            and manual control.
          </P>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { icon: '🌱', title: 'Saves water', desc: 'Pump only turns on when the soil actually needs it — not on a fixed timer' },
              { icon: '🚨', title: 'Sends alerts', desc: 'Dashboard raises an alert if any sensor reading goes into CRITICAL range' },
              { icon: '📊', title: 'Records history', desc: '100,000+ readings stored in the database — shows trends over months' },
              { icon: '🖥️', title: 'Live dashboard', desc: 'Real-time web dashboard updates within 2 seconds of each new reading' },
            ].map((f) => (
              <div key={f.title} className="border border-gray-100 rounded-2xl p-4 flex gap-3 items-start">
                <span className="text-2xl shrink-0">{f.icon}</span>
                <div>
                  <p className="text-sm font-bold text-gray-800">{f.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <Note color="emerald">
            <B>One-sentence summary:</B> The Arduino reads 7 sensor values every 2 seconds,
            controls the pump with a relay, sends data over USB to a Python script, which
            converts and saves every reading to a PostgreSQL database shown on a live web dashboard.
          </Note>
        </DocSection>

        {/* ════════════════════════════════════════════════════════════════════
            2 — HARDWARE COMPONENTS & WIRING
        ════════════════════════════════════════════════════════════════════ */}
        <DocSection id="hardware" icon={<Radio size={18} className="text-white" />}
          gradient="from-sky-500 to-blue-600" title="2. Hardware Components & Wiring">

          <P>The system uses an <B>Arduino Uno</B> as the main controller. All sensors connect to the Arduino, which collects the data, controls the pump relay, and sends everything to the laptop over USB.</P>

          {/* Component table */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs border border-gray-100 rounded-xl overflow-hidden">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-3 py-2 text-gray-500 font-semibold">Component</th>
                  <th className="text-left px-3 py-2 text-gray-500 font-semibold">Model</th>
                  <th className="text-left px-3 py-2 text-gray-500 font-semibold">What it measures</th>
                  <th className="text-left px-3 py-2 text-gray-500 font-semibold">Arduino Pins</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-700">
                {[
                  ['Arduino Uno', 'ATmega328P', 'Main controller — reads all sensors, controls relay', 'All pins'],
                  ['NPK Sensor', 'RS485 Modbus', 'Nitrogen, Phosphorus, Potassium in soil (mg/kg)', 'RX=2, TX=3, RE/DE=4'],
                  ['MAX485 Adapter', 'RS485↔TTL', 'Converts RS485 signal to 5V TTL for Arduino', 'Connects between NPK & pins 2,3,4'],
                  ['Soil Moisture Sensor', 'Resistive probe', 'How wet or dry the soil is (ADC 0–1023)', 'A0 (analog)'],
                  ['DHT11', 'Digital sensor', 'Air temperature (°C) and relative humidity (%)', 'Digital pin 7'],
                  ['HC-SR04 Ultrasonic', 'Ultrasonic distance', 'Distance to water surface → tank fill level (%)', 'TRIG=9, ECHO=10'],
                  ['Relay Module', '5V relay', 'Switches the irrigation pump ON or OFF', 'Digital pin 8'],
                  ['Water Pump', 'DC pump', 'Delivers water from tank to the soil', 'Controlled by relay'],
                ].map(([comp, model, what, pins]) => (
                  <tr key={comp} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-semibold">{comp}</td>
                    <td className="px-3 py-2 text-gray-400 font-mono text-[11px]">{model}</td>
                    <td className="px-3 py-2">{what}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-indigo-600">{pins}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Wiring detail */}
          <div className="mt-5 space-y-3">
            <p className="text-sm font-bold text-gray-700">NPK Sensor Wiring (most complex — uses MAX485)</p>
            <p className="text-xs text-gray-500">
              The NPK sensor communicates using <B>RS485</B>, an industrial serial protocol that operates
              at higher voltage than the Arduino&apos;s 5V logic. The <B>MAX485</B> adapter chip converts
              between RS485 and standard 5V TTL signals that the Arduino can read.
            </p>
            <div className="bg-gray-900 rounded-xl p-4 font-mono text-xs space-y-1 overflow-x-auto">
              <p className="text-gray-400">// MAX485 ↔ Arduino connections</p>
              <p className="text-emerald-300">NPK sensor A/B terminals  →  MAX485 A/B pins</p>
              <p className="text-emerald-300">MAX485 RO  (Receive Out)   →  Arduino pin 2  (SoftwareSerial RX)</p>
              <p className="text-emerald-300">MAX485 DI  (Data In)       →  Arduino pin 3  (SoftwareSerial TX)</p>
              <p className="text-yellow-300">MAX485 RE + DE  (joined)   →  Arduino pin 4  (direction control)</p>
              <p className="text-gray-400 mt-1">// When pin 4 = HIGH → Arduino transmits command to sensor</p>
              <p className="text-gray-400">// When pin 4 = LOW  → Arduino receives response from sensor</p>
            </div>

            <p className="text-xs text-gray-500 mt-2">
              <B>Why RE and DE are joined:</B> RE (Receive Enable, active LOW) and DE (Driver Enable, active HIGH)
              are tied together so one Arduino pin controls both at the same time.
              Pulling pin 4 HIGH enables transmit and disables receive.
              Pulling pin 4 LOW enables receive and disables transmit.
              This switching happens automatically inside the <code className="bg-gray-100 px-1 rounded font-mono">readNPKValue()</code> function.
            </p>
          </div>

          <div className="mt-4 space-y-3">
            <p className="text-sm font-bold text-gray-700">Relay Wiring (pump control)</p>
            <div className="bg-gray-900 rounded-xl p-4 font-mono text-xs space-y-1">
              <p className="text-gray-400">// Relay module connections</p>
              <p className="text-emerald-300">Arduino pin 8  →  Relay IN pin  (signal)</p>
              <p className="text-emerald-300">Arduino 5V     →  Relay VCC</p>
              <p className="text-emerald-300">Arduino GND    →  Relay GND</p>
              <p className="text-yellow-300 mt-1">Relay COM      →  Power supply +</p>
              <p className="text-yellow-300">Relay NO       →  Water pump +  (Normally Open)</p>
              <p className="text-yellow-300">Water pump -   →  Power supply -</p>
              <p className="text-gray-400 mt-1">// pin 8 HIGH → relay closes → pump turns ON</p>
              <p className="text-gray-400">// pin 8 LOW  → relay opens  → pump turns OFF</p>
            </div>
          </div>

          <Note color="sky">
            <B>Why a relay?</B> The water pump runs on a higher voltage (12V DC or 220V AC) than the
            Arduino can provide. The relay acts as an electrically controlled switch: the Arduino
            sends a small 5V signal to the relay coil, which closes a separate high-power circuit
            to run the pump safely.
          </Note>
        </DocSection>

        {/* ════════════════════════════════════════════════════════════════════
            3 — ARDUINO CODE
        ════════════════════════════════════════════════════════════════════ */}
        <DocSection id="arduino" icon={<Cpu size={18} className="text-white" />}
          gradient="from-violet-500 to-indigo-600" title="3. Arduino Code — How Each Sensor is Read">

          <P>
            The Arduino sketch runs in a loop every <B>2 seconds</B> (set by <code className="bg-gray-100 px-1 rounded font-mono text-xs">delay(2000)</code> at the end of <code className="bg-gray-100 px-1 rounded font-mono text-xs">loop()</code>).
            Each iteration reads all sensors, makes the pump decision, prints a human-readable block for the Serial Monitor,
            and then prints a single machine-readable <code className="bg-gray-100 px-1 rounded font-mono text-xs">DATA:</code> line for the Python bridge.
          </P>

          {/* NPK reading */}
          <CodeBlock title="Reading the NPK Sensor — readNPKValue() function" lang="cpp">{`// Modbus command bytes for each nutrient (sent to sensor via MAX485)
byte nitrogenCmd[]   = {0x01, 0x03, 0x00, 0x1E, 0x00, 0x01, 0xE4, 0x0C};
byte phosphorusCmd[] = {0x01, 0x03, 0x00, 0x1F, 0x00, 0x01, 0xB5, 0xCC};
byte potassiumCmd[]  = {0x01, 0x03, 0x00, 0x20, 0x00, 0x01, 0x85, 0xC0};

byte readNPKValue(byte *command) {
  while (mod.available()) mod.read();  // flush any old data

  digitalWrite(RE_DE, HIGH);   // switch MAX485 to TRANSMIT mode
  delay(10);
  mod.write(command, 8);       // send 8-byte Modbus request
  mod.flush();

  digitalWrite(RE_DE, LOW);    // switch MAX485 to RECEIVE mode
  delay(100);                  // wait for sensor to respond

  for (byte i = 0; i < 7; i++) {
    if (mod.available()) values[i] = mod.read();  // read 7 response bytes
  }
  return values[4];  // byte[4] contains the nutrient value in mg/kg
}`}</CodeBlock>
          <p className="text-xs text-gray-500 mt-1">
            The Modbus response frame is 7 bytes. Byte index 4 (the 5th byte) contains the 8-bit integer
            value for the requested nutrient in mg/kg. Each nutrient is requested separately with a 200ms
            delay between calls.
          </p>

          {/* Ultrasonic */}
          <CodeBlock title="Reading the Ultrasonic Sensor — readAverageDistance()" lang="cpp">{`// Tank calibration constants (measured with a ruler)
float emptyDistance = 12.0;  // cm from sensor to tank bottom (empty tank)
float fullDistance  =  3.0;  // cm from sensor to water surface (full tank)
float waterLimit    = 11.0;  // cm threshold: if distance < 11, tank has water

float readDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);    // send 10µs ultrasonic pulse
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 30000);  // measure echo time (µs)
  if (duration == 0) return -1;                     // no echo = sensor error

  return duration * 0.0343 / 2.0;  // convert µs → cm using speed of sound
}

// Takes 5 readings and returns the average (removes noise)
float readAverageDistance() {
  float total = 0; int count = 0;
  for (int i = 0; i < 5; i++) {
    float d = readDistance();
    if (d > 0) { total += d; count++; }
    delay(50);
  }
  return (count == 0) ? -1 : total / count;
}

// In loop():
float distance = readAverageDistance();
bool tankHasWater = (distance < waterLimit);  // distance < 11 cm = has water
percentFull = ((emptyDistance - distance) / (emptyDistance - fullDistance)) * 100.0;
// = ((12 - distance) / (12 - 3)) * 100`}</CodeBlock>

          {/* Soil moisture */}
          <CodeBlock title="Reading Soil Moisture" lang="cpp">{`#define MOISTURE_PIN A0
int moistureThreshold = 300;  // ADC threshold: above 300 = dry soil

int moisture = analogRead(MOISTURE_PIN);   // returns 0–1023
bool soilDry = (moisture > moistureThreshold);  // dry if ADC > 300`}</CodeBlock>
          <p className="text-xs text-gray-500 mt-1">
            The soil sensor works because dry soil has high electrical resistance — less current flows
            through the probe → lower voltage at the pin → higher ADC value. Wet soil conducts
            better → lower ADC. The threshold of <B>300</B> was chosen by testing: above 300 = too dry
            for crops.
          </p>

          {/* DHT11 */}
          <CodeBlock title="Reading Temperature and Humidity (DHT11)" lang="cpp">{`#define DHTPIN 7
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

// In setup():
dht.begin();

// In loop():
float humidity    = dht.readHumidity();     // % relative humidity
float temperature = dht.readTemperature();  // °C`}</CodeBlock>

          {/* DATA output */}
          <CodeBlock title="DATA: Line — machine-readable output for Python bridge" lang="cpp">{`// This line is printed after the human-readable block every 2 seconds.
// Python bridge looks for lines starting with "DATA:" to parse.
Serial.print("DATA:");
Serial.print("N=");    Serial.print(nitrogen);     Serial.print(",");
Serial.print("P=");    Serial.print(phosphorus);   Serial.print(",");
Serial.print("K=");    Serial.print(potassium);    Serial.print(",");
Serial.print("M=");    Serial.print(moisture);     Serial.print(",");  // raw ADC
Serial.print("T=");    Serial.print(temperature);  Serial.print(",");
Serial.print("H=");    Serial.print(humidity);     Serial.print(",");
Serial.print("W=");    Serial.print(percentFull);  Serial.print(",");  // tank %
Serial.print("PUMP="); Serial.println(pumpOn ? 1 : 0);

// Example output:
// DATA:N=17,P=24,K=48,M=509,T=26.40,H=80.00,W=0.00,PUMP=0`}</CodeBlock>

          <Note color="violet">
            <B>Two output formats:</B> The Arduino prints a human-readable block (for viewing in the
            Arduino Serial Monitor) followed by a single compact DATA: line. The Python bridge only
            uses the DATA: line — it ignores all other output. This way you can still open the
            Serial Monitor during development and read the data clearly.
          </Note>
        </DocSection>

        {/* ════════════════════════════════════════════════════════════════════
            4 — PYTHON SERIAL BRIDGE
        ════════════════════════════════════════════════════════════════════ */}
        <DocSection id="serial" icon={<Wifi size={18} className="text-white" />}
          gradient="from-amber-500 to-orange-500" title="4. Python Serial Bridge — Sending Data to the Server">

          <P>
            The Python script <code className="bg-gray-100 px-1 rounded font-mono text-xs">serial_bridge/bridge.py</code> runs
            on the laptop. It opens the USB serial port, waits for DATA: lines from the Arduino,
            converts the raw values to real engineering units, and sends each reading to the
            web server as a JSON POST request.
          </P>

          {/* Config */}
          <CodeBlock title="Configuration file — serial_bridge/config.yaml" lang="yaml">{`serial_port: COM8         # USB port the Arduino Uno is connected to
baud_rate: 9600           # must match Serial.begin(9600) in the Arduino sketch
api_url: http://localhost:3000/api/ingest   # where to POST each reading
api_key: aquasense-demo-key-123            # authentication key
node_id: node-1           # which sensor node this bridge is reading from
interval_ms: 2000         # only used in simulation mode
simulation: false         # false = read from real Arduino via serial port`}</CodeBlock>

          <p className="text-xs text-gray-500 mt-1">
            To find the correct COM port on Windows: open <B>Device Manager → Ports (COM &amp; LPT)</B>.
            The Arduino Uno appears as <B>USB-SERIAL CH340 (COMx)</B> or <B>Arduino Uno (COMx)</B>.
            Set that COMx value in config.yaml.
          </p>

          {/* Parse */}
          <CodeBlock title="parse_line() — reading and parsing the DATA: line" lang="python">{`def parse_line(line: str) -> Optional[dict]:
    cleaned = line.strip()

    # Only process lines that start with "DATA:"
    if cleaned.startswith("DATA:"):
        data_part = cleaned[5:]  # remove "DATA:" prefix → "N=17,P=24,K=48,..."

        pairs = {}
        for item in data_part.split(","):       # split on commas → ["N=17","P=24",...]
            if "=" in item:
                key, _, val = item.partition("=")  # split each on "="
                pairs[key.strip()] = val.strip()

        # Extract each field and convert to the right Python type
        temperature = float(pairs["T"])   # degrees Celsius
        humidity    = float(pairs["H"])   # percent
        soil_raw    = int(float(pairs["M"]))   # raw ADC 0–1023
        water_pct   = float(pairs["W"])   # already % from Arduino
        nitrogen    = float(pairs["N"])   # mg/kg
        phosphorus  = float(pairs["P"])   # mg/kg
        potassium   = float(pairs["K"])   # mg/kg

        return { "soil_raw": soil_raw, "water_pct": water_pct,
                 "temperature": temperature, "humidity": humidity,
                 "nitrogen": nitrogen, "phosphorus": phosphorus,
                 "potassium": potassium }

    return None  # ignore all other Arduino output lines`}</CodeBlock>

          {/* Convert */}
          <CodeBlock title="convert_units() — raw values → engineering units" lang="python">{`def convert_units(raw: dict, cal: dict) -> dict:
    # Soil moisture: invert the ADC reading
    # High ADC = dry, low ADC = wet → we want high % = wet
    soil_pct = (1.0 - raw["soil_raw"] / 1023.0) * 100.0

    # All other values come in already converted from the Arduino:
    # temperature (°C), humidity (%), water_pct (%), NPK (mg/kg)

    # Apply calibration: calibrated = (value + offset) * scale
    # Default config has offset=0, scale=1.0 → no change unless calibrated
    result = {
      "soilMoisture":   soil_pct,          # % (converted from ADC)
      "temperature":    raw["temperature"], # °C (direct from DHT11)
      "humidity":       raw["humidity"],    # % (direct from DHT11)
      "reservoirLevel": raw["water_pct"],   # % (computed on Arduino)
      "nitrogen":       raw["nitrogen"],    # mg/kg (from NPK Modbus)
      "phosphorus":     raw["phosphorus"],  # mg/kg
      "potassium":      raw["potassium"],   # mg/kg
    }
    return result`}</CodeBlock>

          {/* POST */}
          <CodeBlock title="post_reading() — sending to the web server" lang="python">{`def post_reading(payload: dict, cfg: AppConfig) -> bool:
    headers = { "X-API-Key": cfg.api_key, "Content-Type": "application/json" }

    # Try up to 3 times in case of network issues
    for attempt in range(4):
        resp = requests.post(cfg.api_url, json=payload, headers=headers, timeout=10)
        if 200 <= resp.status_code < 300:
            return True   # success
        time.sleep(5)     # wait 5 seconds and retry

    # If all 3 retries fail, save to queue.jsonl for later recovery
    with open("serial_bridge/queue.jsonl", "a") as f:
        f.write(json.dumps(payload) + "\\n")
    return False

# The JSON payload sent to the API looks like:
# {
#   "nodeId": "node-1",
#   "timestamp": "2026-04-15T10:32:05Z",
#   "soilMoisture": 50.2,
#   "temperature": 26.4,
#   "humidity": 80.0,
#   "reservoirLevel": 62.0,
#   "nitrogen": 17.0,
#   "phosphorus": 24.0,
#   "potassium": 48.0
# }`}</CodeBlock>

          <Note color="amber">
            <B>Offline queue:</B> If the laptop has no internet or the server is down, the reading
            is written to <code className="bg-amber-50 px-1 rounded font-mono text-[11px]">serial_bridge/queue.jsonl</code> so no data is lost.
            The queue can be replayed later once the server is back online.
          </Note>
        </DocSection>

        {/* ════════════════════════════════════════════════════════════════════
            5 — DATA CONVERSION FORMULAS
        ════════════════════════════════════════════════════════════════════ */}
        <DocSection id="conversion" icon={<Cpu size={18} className="text-white" />}
          gradient="from-teal-500 to-emerald-600" title="5. Data Conversion Formulas (Raw → Real Units)">

          <P>
            Each sensor sends a raw signal that must be converted to a meaningful unit.
            Here are all the exact formulas used in this project.
          </P>

          {/* Soil moisture */}
          <ConvCard color="emerald" title="Soil Moisture: ADC → Percentage (%)" where="Python bridge — convert_units()">
            <Formula>Moisture (%) = (1 − ADC ÷ 1023) × 100</Formula>
            <p className="text-xs text-gray-600 mt-2">
              The Arduino&apos;s <code className="bg-gray-100 px-1 rounded font-mono text-[11px]">analogRead(A0)</code> returns
              an integer from 0 to 1023 (10-bit ADC). Dry soil → high resistance → low voltage → high ADC number.
              Wet soil → low resistance → higher voltage → lower ADC number. We invert the reading
              so that a higher moisture % means wetter soil.
            </p>
            <div className="mt-2 bg-gray-900 rounded-xl p-3 font-mono text-xs space-y-0.5">
              <p className="text-gray-400">// Worked examples:</p>
              <p className="text-emerald-300">ADC = 509  →  (1 − 509/1023) × 100  =  50.2 %  (damp soil)</p>
              <p className="text-emerald-300">ADC = 300  →  (1 − 300/1023) × 100  =  70.7 %  (pump threshold)</p>
              <p className="text-emerald-300">ADC = 0    →  (1 − 0/1023)   × 100  =  100 %   (submerged)</p>
              <p className="text-emerald-300">ADC = 1023 →  (1 − 1023/1023)× 100  =  0 %     (bone dry)</p>
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              <B>Pump threshold:</B> The Arduino compares raw ADC to 300
              (<code className="font-mono bg-gray-100 px-0.5 rounded">soilDry = moisture &gt; 300</code>).
              ADC &gt; 300 means moisture &lt; 70.7 % → soil is dry → pump candidate to turn on.
            </p>
          </ConvCard>

          {/* Ultrasonic */}
          <ConvCard color="blue" title="Reservoir Level: Echo Time (µs) → Fill Percentage (%)" where="Arduino — loop()">
            <Formula>{`Step 1:  Distance (cm) = echo_duration_µs × 0.0343 ÷ 2
Step 2:  Fill (%)     = ((12.0 − distance) ÷ (12.0 − 3.0)) × 100`}</Formula>
            <p className="text-xs text-gray-600 mt-2">
              <B>Step 1</B> converts pulse duration to centimetres using the speed of sound
              (343 m/s = 0.0343 cm/µs). We divide by 2 because the sound travels to the water
              surface and back — so the actual distance is half the total travel time.
            </p>
            <p className="text-xs text-gray-600 mt-1">
              <B>Step 2</B> maps that distance to a fill percentage using the tank calibration:
              empty depth = 12 cm (sensor to tank floor), full depth = 3 cm (sensor to water surface when full).
            </p>
            <div className="mt-2 bg-gray-900 rounded-xl p-3 font-mono text-xs space-y-0.5">
              <p className="text-gray-400">// Tank calibration: emptyDistance=12 cm, fullDistance=3 cm</p>
              <p className="text-blue-300">echo = 700 µs  →  dist = 700×0.0343/2 = 12.0 cm  →  Fill = (12-12)/(12-3)×100 =   0 %  (empty)</p>
              <p className="text-blue-300">echo = 400 µs  →  dist = 400×0.0343/2 =  6.9 cm  →  Fill = (12-6.9)/(9)×100   =  56.7 %</p>
              <p className="text-blue-300">echo = 175 µs  →  dist = 175×0.0343/2 =  3.0 cm  →  Fill = (12-3)/(9)×100     = 100 %  (full)</p>
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              <B>Pump check:</B> <code className="font-mono bg-gray-100 px-0.5 rounded">tankHasWater = (distance &lt; 11.0)</code>.
              If the sensor reads less than 11 cm, there is water in the tank.
              The Arduino takes the average of 5 readings (with 50ms gaps) to filter out ultrasonic noise.
            </p>
          </ConvCard>

          {/* DHT11 */}
          <ConvCard color="orange" title="Temperature & Humidity: No conversion needed" where="Arduino — DHT library">
            <Formula>Temperature (°C) = dht.readTemperature()   ← direct °C output
Humidity (%) = dht.readHumidity()         ← direct % RH output</Formula>
            <p className="text-xs text-gray-600 mt-2">
              The DHT11 has a calibrated sensor and an internal microcontroller that handles
              all the conversion internally. The DHT Arduino library reads the digital serial output
              and returns the value already in °C and % RH. No formula is applied by our code.
            </p>
            <div className="mt-2 bg-gray-900 rounded-xl p-3 font-mono text-xs">
              <p className="text-orange-300">dht.readTemperature() → 26.40  →  stored as 26.4 °C  (accuracy ±2 °C)</p>
              <p className="text-orange-300">dht.readHumidity()    → 80.00  →  stored as 80.0 %   (accuracy ±5 %)</p>
            </div>
          </ConvCard>

          {/* NPK */}
          <ConvCard color="lime" title="NPK Nutrients: Modbus Byte → mg/kg" where="Arduino — readNPKValue()">
            <Formula>N / P / K (mg/kg) = values[4]   ← 8-bit integer from Modbus byte[4]</Formula>
            <p className="text-xs text-gray-600 mt-2">
              The NPK sensor responds with a 7-byte Modbus RTU frame.
              In this sensor model the measured nutrient value fits in a single byte (8-bit unsigned integer, range 0–255 mg/kg) stored at index 4.
              The Arduino reads 7 bytes into the <code className="bg-gray-100 px-0.5 rounded font-mono text-[11px]">values[]</code> array and returns <code className="bg-gray-100 px-0.5 rounded font-mono text-[11px]">values[4]</code> directly.
            </p>
            <div className="mt-2 bg-gray-900 rounded-xl p-3 font-mono text-xs space-y-0.5">
              <p className="text-gray-400">// Response frame for Nitrogen query:</p>
              <p className="text-lime-300">values = [0x01, 0x03, 0x02, 0x00, 0x11, 0xB8, 0x4A]</p>
              <p className="text-lime-300">              index:  0     1     2     3     4</p>
              <p className="text-lime-300">return values[4]  →  0x11  =  17 mg/kg  (Nitrogen)</p>
              <p className="text-gray-400 mt-1">// Each nutrient uses a different Modbus register address:</p>
              <p className="text-lime-300">Nitrogen   register 0x001E  command: {"{0x01,0x03,0x00,0x1E,0x00,0x01,0xE4,0x0C}"}</p>
              <p className="text-lime-300">Phosphorus register 0x001F  command: {"{0x01,0x03,0x00,0x1F,0x00,0x01,0xB5,0xCC}"}</p>
              <p className="text-lime-300">Potassium  register 0x0020  command: {"{0x01,0x03,0x00,0x20,0x00,0x01,0x85,0xC0}"}</p>
            </div>
          </ConvCard>

          {/* Normalisation */}
          <ConvCard color="slate" title="Normalisation: Any Unit → 0–100 % Scale (graph only)" where="Dashboard — DashboardChart.tsx">
            <Formula>normalised (%) = (value − sensor_min) ÷ (sensor_max − sensor_min) × 100</Formula>
            <p className="text-xs text-gray-600 mt-2">
              This formula is <B>only used for drawing the graph</B>. Because different sensors use
              different units, they cannot share the same Y-axis without scaling. Normalisation maps
              every sensor to 0–100 % so all 7 lines fit on one chart. The original values stored
              in the database are never changed.
            </p>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-xs border border-gray-100 rounded-xl overflow-hidden">
                <thead className="bg-gray-50"><tr>
                  <th className="text-left px-3 py-1.5 text-gray-500 font-semibold">Sensor</th>
                  <th className="text-left px-3 py-1.5 text-gray-500 font-semibold">Min</th>
                  <th className="text-left px-3 py-1.5 text-gray-500 font-semibold">Max</th>
                  <th className="text-left px-3 py-1.5 text-gray-500 font-semibold">Example</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50 text-gray-600">
                  {[
                    ['Soil Moisture', '0 %', '100 %', '65 % → 65 % (no change)'],
                    ['Temperature', '−40 °C', '80 °C', '26 °C → (26+40)/(80+40)×100 = 55 %'],
                    ['Humidity', '0 %', '100 %', '80 % → 80 % (no change)'],
                    ['Reservoir', '0 %', '100 %', '62 % → 62 % (no change)'],
                    ['Nitrogen', '0 mg/kg', '1999 mg/kg', '17 mg/kg → 17/1999×100 = 0.9 %'],
                    ['Phosphorus', '0 mg/kg', '1999 mg/kg', '24 mg/kg → 24/1999×100 = 1.2 %'],
                    ['Potassium', '0 mg/kg', '1999 mg/kg', '48 mg/kg → 48/1999×100 = 2.4 %'],
                  ].map(([s, mn, mx, ex]) => (
                    <tr key={s} className="hover:bg-gray-50">
                      <td className="px-3 py-1.5 font-medium">{s}</td>
                      <td className="px-3 py-1.5 font-mono text-[11px]">{mn}</td>
                      <td className="px-3 py-1.5 font-mono text-[11px]">{mx}</td>
                      <td className="px-3 py-1.5 text-gray-400">{ex}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ConvCard>
        </DocSection>

        {/* ════════════════════════════════════════════════════════════════════
            6 — PUMP CONTROL LOGIC
        ════════════════════════════════════════════════════════════════════ */}
        <DocSection id="pump" icon={<Zap size={18} className="text-white" />}
          gradient="from-yellow-500 to-amber-500" title="6. Pump Control Logic (Relay Decision)">

          <P>
            The pump decision is made <B>on the Arduino itself</B> — not on the web server.
            This means the irrigation still works even if the laptop is disconnected.
            The decision uses two boolean variables computed each loop cycle.
          </P>

          <CodeBlock title="Pump decision logic — from Arduino loop()" lang="cpp">{`// ── Boolean decision variables ──────────────────────────────────────

// soilDry: true when ADC reading exceeds 300 (soil is too dry for crops)
int moisture = analogRead(A0);
bool soilDry = (moisture > 300);

// tankHasWater: true when ultrasonic measures distance < 11 cm
// (meaning water surface is within 11 cm of sensor → tank not empty)
float distance = readAverageDistance();
bool tankHasWater = (distance > 0) && (distance < 11.0);

// ── Pump decision: BOTH conditions must be true ──────────────────────
bool pumpOn = soilDry && tankHasWater;

// ── Relay output: HIGH = pump ON, LOW = pump OFF ─────────────────────
digitalWrite(RELAY_PIN, pumpOn ? HIGH : LOW);  // RELAY_PIN = 8`}</CodeBlock>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { scenario: 'Soil dry (ADC>300) + Tank has water (dist<11)', result: 'Pump ON ✓', color: 'border-emerald-200 bg-emerald-50', rcolor: 'text-emerald-700' },
              { scenario: 'Soil wet (ADC≤300) + Tank has water',           result: 'Pump OFF', color: 'border-gray-200 bg-gray-50', rcolor: 'text-gray-500' },
              { scenario: 'Soil dry + Tank empty (dist≥11)',                result: 'Pump OFF ⚠', color: 'border-red-200 bg-red-50', rcolor: 'text-red-600' },
              { scenario: 'Soil wet + Tank empty',                          result: 'Pump OFF', color: 'border-gray-200 bg-gray-50', rcolor: 'text-gray-500' },
            ].map((r) => (
              <div key={r.scenario} className={`border rounded-xl px-4 py-3 flex items-start justify-between gap-3 ${r.color}`}>
                <p className="text-xs text-gray-600">{r.scenario}</p>
                <p className={`text-xs font-bold shrink-0 ${r.rcolor}`}>{r.result}</p>
              </div>
            ))}
          </div>

          <P>
            The web dashboard also shows the pump state and lets the farmer turn it on or off manually.
            Manual commands are sent to the server API, which records a pump event in the database.
            The Arduino&apos;s local decision logic runs independently — the web control is an <B>override</B>, not the primary controller.
          </P>

          <Note color="amber">
            <B>Why check the tank?</B> If the pump runs when the tank is empty, it runs dry —
            which can burn out the motor. The ultrasonic sensor prevents this by refusing to
            activate the relay when the tank distance is ≥ 11 cm (= nearly empty).
          </Note>
        </DocSection>

        {/* ════════════════════════════════════════════════════════════════════
            7 — WEB API & DATABASE
        ════════════════════════════════════════════════════════════════════ */}
        <DocSection id="api" icon={<Database size={18} className="text-white" />}
          gradient="from-slate-600 to-gray-700" title="7. Web API & Database Storage">

          <P>
            The web server is built with <B>Next.js 14 (App Router)</B>.
            The Python bridge POSTs each reading to <code className="bg-gray-100 px-1 rounded font-mono text-xs">/api/ingest</code>,
            which validates and saves it to a <B>PostgreSQL database</B> via <B>Prisma ORM</B>.
          </P>

          <CodeBlock title="Database schema — sensorReading table (Prisma)" lang="prisma">{`model SensorReading {
  id             String    @id @default(cuid())
  nodeId         String                        // which device sent this
  timestamp      DateTime                      // when the reading was taken (UTC)
  soilMoisture   Float?                        // % (0–100)
  temperature    Float?                        // °C (-40 to 80)
  humidity       Float?                        // % (0–100)
  reservoirLevel Float?                        // % (0–100)
  nitrogen       Float?                        // mg/kg
  phosphorus     Float?                        // mg/kg
  potassium      Float?                        // mg/kg
}`}</CodeBlock>

          <div className="mt-4 space-y-3">
            <div className="border border-gray-100 rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-700 mb-1">Live updates — Server-Sent Events (SSE)</p>
              <p className="text-xs text-gray-500">
                When a new reading arrives, the server pushes it to all open browsers using SSE
                (<code className="font-mono bg-gray-100 px-0.5 rounded text-[11px]">/api/stream</code>).
                The browser holds an open HTTP connection and receives events as they arrive —
                no page refresh needed. The dashboard node cards update within 1 second of each
                new Arduino reading.
              </p>
            </div>
            <div className="border border-gray-100 rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-700 mb-1">Historical data — time-bucketed aggregation</p>
              <p className="text-xs text-gray-500">
                For the 7-day and 30-day graph views, the database groups readings into hourly
                or daily averages using PostgreSQL&apos;s <code className="font-mono bg-gray-100 px-0.5 rounded text-[11px]">date_trunc()</code> and
                <code className="font-mono bg-gray-100 px-0.5 rounded text-[11px]"> AVG()</code>.
                This reduces thousands of rows into a manageable number of data points
                while keeping the trend accurate.
              </p>
            </div>
            <div className="border border-gray-100 rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-700 mb-1">Alerts — automatic anomaly detection</p>
              <p className="text-xs text-gray-500">
                Every time a reading is saved, the API checks if any value has crossed a
                CRITICAL LOW or CRITICAL HIGH threshold. If it has, an alert record is created
                in the database and shown as a banner on the dashboard. Alerts can be
                acknowledged by the farmer once the problem is resolved.
              </p>
            </div>
          </div>
        </DocSection>

        {/* ════════════════════════════════════════════════════════════════════
            8 — CLASSIFICATION
        ════════════════════════════════════════════════════════════════════ */}
        <DocSection id="classification" icon={<AlertTriangle size={18} className="text-white" />}
          gradient="from-rose-500 to-red-600" title="8. Data Classification — 5 Classes">

          <P>
            Every sensor reading that arrives is classified into one of 5 labels.
            The label tells us whether the value is good for the crop or if action is needed.
            Classification uses a simple ordered threshold rule — no machine learning required.
          </P>

          <CodeBlock title="Classification algorithm — TypeScript (ClassificationPanel.tsx)" lang="typescript">{`function classify(value: number, thresholds: ThresholdBand[]): ThresholdBand {
  for (const band of thresholds) {
    if (value <= band.max) return band;   // return the first class the value fits into
  }
  return thresholds[thresholds.length - 1]; // otherwise CRITICAL HIGH
}

// Example thresholds for Soil Moisture:
// max:  20  → CRITICAL LOW   (drought stress)
// max:  40  → LOW            (dry, irrigate soon)
// max:  70  → OPTIMAL        (good for most crops)
// max:  85  → HIGH           (slightly wet)
// max: 100  → CRITICAL HIGH  (waterlogged)

classify(15, soilThresholds)  // 15 ≤ 20  →  CRITICAL LOW  → pump ON + alert
classify(55, soilThresholds)  // 55 ≤ 70  →  OPTIMAL       → pump OFF
classify(92, soilThresholds)  // 92 > 85  →  CRITICAL HIGH → alert`}</CodeBlock>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs border border-gray-100 rounded-xl overflow-hidden">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-3 py-2 text-gray-500 font-semibold">Sensor</th>
                  <th className="px-3 py-2 font-semibold text-[11px]" style={{ color:'#dc2626', background:'#fff5f5' }}>CRITICAL LOW</th>
                  <th className="px-3 py-2 font-semibold text-[11px]" style={{ color:'#d97706', background:'#fffbeb' }}>LOW</th>
                  <th className="px-3 py-2 font-semibold text-[11px]" style={{ color:'#059669', background:'#f0fdf4' }}>OPTIMAL</th>
                  <th className="px-3 py-2 font-semibold text-[11px]" style={{ color:'#d97706', background:'#fffbeb' }}>HIGH</th>
                  <th className="px-3 py-2 font-semibold text-[11px]" style={{ color:'#dc2626', background:'#fff5f5' }}>CRITICAL HIGH</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-700">
                {[
                  ['Soil Moisture (%)',  '≤ 20',  '≤ 40',  '≤ 70',  '≤ 85',  '> 85'],
                  ['Temperature (°C)',   '≤ 10',  '≤ 18',  '≤ 30',  '≤ 38',  '> 38'],
                  ['Humidity (%)',        '≤ 30',  '≤ 45',  '≤ 75',  '≤ 85',  '> 85'],
                  ['Reservoir (%)',       '≤ 5',   '≤ 15',  '≤ 35',  '≤ 50',  '> 50'],
                  ['Nitrogen (mg/kg)',    '≤ 50',  '≤ 100', '≤ 300', '≤ 600', '> 600'],
                  ['Phosphorus (mg/kg)',  '≤ 25',  '≤ 50',  '≤ 150', '≤ 400', '> 400'],
                  ['Potassium (mg/kg)',   '≤ 100', '≤ 200', '≤ 500', '≤ 800', '> 800'],
                ].map(([s, ...cols]) => (
                  <tr key={s} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{s}</td>
                    {cols.map((v, i) => (
                      <td key={i} className="px-3 py-2 text-center font-mono font-semibold text-[11px]"
                        style={{ color: ['#dc2626','#d97706','#059669','#d97706','#dc2626'][i],
                                 backgroundColor: ['#fff5f5','#fffbeb','#f0fdf4','#fffbeb','#fff5f5'][i] }}>
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Note color="rose">
            <B>Where thresholds come from:</B> Agricultural science literature — FAO soil health
            guidelines, DHT11 datasheet crop recommendations, and NPK sensor manufacturer soil
            fertility reference values for tropical and subtropical crops.
          </Note>
        </DocSection>

        {/* ════════════════════════════════════════════════════════════════════
            9 — CORRELATIONS
        ════════════════════════════════════════════════════════════════════ */}
        <DocSection id="correlation" icon={<TrendingUp size={18} className="text-white" />}
          gradient="from-teal-500 to-cyan-600" title="9. Sensor Correlations">

          <P>
            Sensors do not behave independently. When one changes, it often causes another to change too.
            Understanding these links helps explain why the system makes certain decisions and helps
            predict what will happen next.
          </P>

          <div className="mt-4 space-y-3">
            {[
              {
                pair: 'Temperature ↑ ↔ Humidity ↓',
                strength: 'Strong negative (r ≈ −0.8)',
                color: 'red',
                why: 'Warmer air can hold more water vapour, so relative humidity (RH) falls as temperature rises. This is a physical law — the DHT11 consistently shows this inverse relationship in all readings.',
                use: 'If temperature reads HIGH, check humidity — it will likely be LOW or CRITICAL LOW. Together they signal high plant transpiration stress.',
              },
              {
                pair: 'Temperature ↑ → Soil Moisture ↓',
                strength: 'Moderate negative',
                color: 'red',
                why: 'Higher air temperature accelerates evaporation from the soil surface. On hot days, the soil dries faster and irrigation cycles need to run more frequently.',
                use: 'High temperature + low soil moisture together trigger the most urgent pump-ON event in the system.',
              },
              {
                pair: 'Soil Moisture ↑ → Reservoir Level ↓',
                strength: 'Moderate negative (during irrigation)',
                color: 'red',
                why: 'When the pump runs, water leaves the tank and enters the soil. So reservoir level decreases as soil moisture increases — they move in opposite directions during an irrigation cycle.',
                use: 'Confirms the pump is working: if moisture goes up while reservoir goes down, irrigation is happening correctly.',
              },
              {
                pair: 'Nitrogen ↑ ↔ Phosphorus ↑ ↔ Potassium ↑',
                strength: 'Positive (all three move together)',
                color: 'green',
                why: 'N, P, and K are added to the soil by the same fertiliser application events. They all increase after fertilising and decrease together as the plant absorbs them over the following weeks.',
                use: 'If one NPK value is LOW, the others are likely LOW too — a single fertiliser application fixes all three.',
              },
            ].map((item) => (
              <div key={item.pair} className={`border rounded-2xl p-4 ${
                item.color === 'red' ? 'border-red-100 bg-red-50/40' : 'border-emerald-100 bg-emerald-50/40'
              }`}>
                <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-bold text-gray-800">{item.pair}</p>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    item.color === 'red' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>{item.strength}</span>
                </div>
                <p className="text-xs text-gray-600 mb-1"><B>Why:</B> {item.why}</p>
                <p className="text-xs text-gray-500"><B>How we use it:</B> {item.use}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 bg-white border border-gray-100 rounded-2xl p-5">
            <p className="text-sm font-semibold text-gray-700 mb-2">Pearson Correlation Formula (computed from real DB data)</p>
            <p className="text-xs text-gray-500 mb-3">
              The dashboard calculates the exact Pearson r value for each sensor pair using PostgreSQL&apos;s
              built-in <code className="font-mono bg-gray-100 px-1 rounded text-[11px]">corr(X, Y)</code> function
              across all 100,000+ readings. The result is a number between −1 and +1.
            </p>
            <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 mb-3">
              <p className="font-mono text-sm font-bold text-gray-800">
                r(X,Y) = Σ[(xᵢ − x̄)(yᵢ − ȳ)] ÷ √[Σ(xᵢ − x̄)² · Σ(yᵢ − ȳ)²]
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-center">
              <div className="bg-red-50 border border-red-100 rounded-xl px-2 py-2">
                <p className="font-bold text-red-600">r close to −1</p>
                <p className="text-gray-500 mt-0.5">Sensors move in opposite directions</p>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-xl px-2 py-2">
                <p className="font-bold text-gray-500">r close to 0</p>
                <p className="text-gray-500 mt-0.5">No consistent link between sensors</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-2 py-2">
                <p className="font-bold text-emerald-600">r close to +1</p>
                <p className="text-gray-500 mt-0.5">Sensors move in the same direction</p>
              </div>
            </div>
          </div>
        </DocSection>

        {/* ════════════════════════════════════════════════════════════════════
            10 — ALGORITHMS
        ════════════════════════════════════════════════════════════════════ */}
        <DocSection id="algorithms" icon={<Cpu size={18} className="text-white" />}
          gradient="from-indigo-500 to-violet-600" title="10. Mathematical Methods & Algorithms">

          <P>Four algorithms are used throughout the system. Each one solves a specific problem.</P>

          <div className="space-y-4">

            <AlgoBox num="1" color="sky" title="Min-Max Normalisation"
              where="Dashboard graph — DashboardChart.tsx"
              summary="Scales all 7 sensors to a common 0–100 % range so they can all be shown on the same chart.">
              <Formula>x_norm = (x − x_min) ÷ (x_max − x_min) × 100</Formula>
              <p className="text-xs text-gray-500 mt-2">
                <B>Problem it solves:</B> Soil moisture is already in %, temperature is in °C, NPK is in mg/kg.
                You cannot draw these on the same Y-axis without scaling.
                After normalisation, a temperature of 26 °C maps to about 55 % and a nitrogen
                value of 17 mg/kg maps to about 0.9 % — all on the same 0–100 % scale.
              </p>
              <p className="text-[11px] text-gray-400 mt-1">Time complexity: O(1) per value — just arithmetic.</p>
            </AlgoBox>

            <AlgoBox num="2" color="violet" title="Threshold Rule Classifier"
              where="ClassificationPanel.tsx — classify() function"
              summary="Assigns a label (CRITICAL LOW → CRITICAL HIGH) to every sensor reading using ordered boundary values.">
              <div className="bg-violet-50 border border-violet-100 rounded-xl px-4 py-3 font-mono text-xs text-violet-900 space-y-0.5">
                <p>classify(x, thresholds):</p>
                <p className="pl-4">scan bands in order → return first band where x ≤ band.max</p>
                <p className="pl-4 text-violet-500">// x ≤ T[0]  →  CRITICAL LOW</p>
                <p className="pl-4 text-violet-500">// x ≤ T[1]  →  LOW</p>
                <p className="pl-4 text-violet-500">// x ≤ T[2]  →  OPTIMAL</p>
                <p className="pl-4 text-violet-500">// x ≤ T[3]  →  HIGH</p>
                <p className="pl-4 text-violet-500">// else       →  CRITICAL HIGH</p>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                <B>Why this type of classifier:</B> No training data is needed because the threshold values
                come from agricultural science knowledge (FAO guidelines). This is called a
                &quot;rule-based expert system&quot; — it is transparent, fast, and easy to explain.
              </p>
              <p className="text-[11px] text-gray-400 mt-1">Time complexity: O(k) where k = 5 classes — effectively constant time.</p>
            </AlgoBox>

            <AlgoBox num="3" color="emerald" title="Pearson Correlation Coefficient"
              where="lib/classification.ts — PostgreSQL corr() function"
              summary="Measures how strongly two sensors move together, calculated from all 100,000+ readings.">
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2">
                <p className="font-mono text-sm font-bold text-emerald-900">
                  r(X,Y) = Σ[(xᵢ−x̄)(yᵢ−ȳ)] ÷ √[Σ(xᵢ−x̄)² · Σ(yᵢ−ȳ)²]
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                <B>How it is computed in this project:</B> The formula is not written manually.
                PostgreSQL&apos;s built-in <code className="font-mono bg-gray-100 px-0.5 rounded text-[11px]">corr(col_a, col_b)</code> aggregate
                function calculates it across all rows with a single SQL query.
                This is much faster than computing it in JavaScript because the database
                processes the data in one pass without moving all rows to the application.
              </p>
              <p className="text-[11px] text-gray-400 mt-1">Time complexity: O(n) — one pass over all n readings in the database.</p>
            </AlgoBox>

            <AlgoBox num="4" color="amber" title="Time-Bucket Aggregation"
              where="app/api/nodes/[id]/readings/route.ts — PostgreSQL date_trunc() + AVG()"
              summary="Groups many individual readings into hourly or daily averages for long-range graph views.">
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-2 font-mono text-xs text-amber-900">
                <p>SELECT date_trunc(&apos;hour&apos;, timestamp) AS bucket,</p>
                <p className="pl-4">AVG(soilMoisture), AVG(temperature), AVG(humidity), ...</p>
                <p>FROM sensorReading</p>
                <p>WHERE nodeId = ? AND timestamp BETWEEN ? AND ?</p>
                <p>GROUP BY bucket  ORDER BY bucket</p>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                <B>Why it is needed:</B> Returning every individual reading for a 30-day view would
                mean sending 21,600+ rows to the browser — slow and wasteful.
                By grouping into hourly buckets, the same 30-day view only sends 720 data points
                (30 days × 24 hours) while still showing the correct trend.
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                For the 24-hour view, individual readings are returned without aggregation.
                For 7-day and 30-day views, hourly averages are used.
              </p>
            </AlgoBox>

          </div>
        </DocSection>

        {/* Footer */}
        <div className="text-center pt-4 pb-2 text-xs text-gray-300">
          AquaSense — IoT Smart Irrigation &amp; Precision Agriculture · Ubiquitous and Pervasive Computing · Group 1
        </div>

      </div>
    </main>
  )
}

// ─── Reusable layout components ───────────────────────────────────────────────

function DocSection({ id, icon, gradient, title, children }: {
  id: string; icon: React.ReactNode; gradient: string; title: string; children: React.ReactNode
}) {
  return (
    <section id={id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm scroll-mt-20">
      <div className={`h-1 w-full bg-gradient-to-r ${gradient}`} />
      <div className="px-6 pt-5 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`bg-gradient-to-br ${gradient} p-2.5 rounded-xl shadow-sm shrink-0`}>{icon}</div>
          <h2 className="text-lg font-bold text-gray-900 leading-tight">{title}</h2>
        </div>
        <div className="space-y-3 text-gray-700">{children}</div>
      </div>
    </section>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-600 leading-relaxed">{children}</p>
}

function B({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-gray-800">{children}</strong>
}

function Note({ color, children }: { color: string; children: React.ReactNode }) {
  const s: Record<string, string> = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    sky:     'bg-sky-50 border-sky-200 text-sky-800',
    violet:  'bg-violet-50 border-violet-200 text-violet-800',
    amber:   'bg-amber-50 border-amber-200 text-amber-800',
    rose:    'bg-rose-50 border-rose-200 text-rose-800',
  }
  return (
    <div className={`mt-3 border rounded-2xl px-4 py-3 text-xs leading-relaxed ${s[color] ?? s.emerald}`}>
      {children}
    </div>
  )
}

function Formula({ children }: { children: string }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
      {children.split('\n').map((line, i) => (
        <p key={i} className="font-mono text-sm font-bold text-gray-800">{line}</p>
      ))}
    </div>
  )
}

function CodeBlock({ title, lang, children }: { title: string; lang: string; children: string }) {
  return (
    <div className="mt-3">
      <p className="text-[11px] font-semibold text-gray-400 mb-1">{title}</p>
      <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto">
        <pre className="font-mono text-xs text-gray-200 whitespace-pre leading-relaxed">{children}</pre>
      </div>
    </div>
  )
}

function ConvCard({ color, title, where, children }: {
  color: string; title: string; where: string; children: React.ReactNode
}) {
  const borders: Record<string, string> = {
    emerald: 'border-emerald-100', blue: 'border-blue-100', orange: 'border-orange-100',
    lime: 'border-lime-100', slate: 'border-gray-200',
  }
  const headers: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700', blue: 'bg-blue-50 text-blue-700',
    orange: 'bg-orange-50 text-orange-700', lime: 'bg-lime-50 text-lime-700',
    slate: 'bg-gray-50 text-gray-600',
  }
  return (
    <div className={`mt-4 border ${borders[color] ?? 'border-gray-100'} rounded-2xl overflow-hidden`}>
      <div className={`px-4 py-2.5 border-b ${borders[color]} ${headers[color]}`}>
        <p className="text-sm font-bold">{title}</p>
        <p className="text-[11px] opacity-70">{where}</p>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  )
}

function AlgoBox({ num, color, title, where, summary, children }: {
  num: string; color: string; title: string; where: string; summary: string; children: React.ReactNode
}) {
  const c: Record<string, { border: string; bg: string; text: string }> = {
    sky:    { border: 'border-sky-100',    bg: 'bg-sky-50',    text: 'text-sky-700'    },
    violet: { border: 'border-violet-100', bg: 'bg-violet-50', text: 'text-violet-700' },
    emerald:{ border: 'border-emerald-100',bg: 'bg-emerald-50',text: 'text-emerald-700'},
    amber:  { border: 'border-amber-100',  bg: 'bg-amber-50',  text: 'text-amber-700'  },
  }
  const s = c[color] ?? c.sky
  return (
    <div className={`border ${s.border} rounded-2xl p-4`}>
      <div className="flex items-center gap-3 mb-2">
        <span className={`${s.bg} ${s.text} w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm shrink-0`}>{num}</span>
        <div>
          <p className={`text-sm font-bold ${s.text}`}>{title}</p>
          <p className="text-[11px] text-gray-400">{where}</p>
        </div>
      </div>
      <p className="text-xs text-gray-500 mb-2">{summary}</p>
      {children}
    </div>
  )
}
