"use client";

import { type Reading } from "./TimeSeriesChart";

// ─── Assignment §9.3 — Per-sensor classification thresholds ─────────────────
// "Categorize your continuous time-series data from all 4 devices into
//  predefined classes or labels"
//
// 5 classes: CRITICAL_LOW | LOW | OPTIMAL | HIGH | CRITICAL_HIGH
// Reference values sourced from agronomic standards and sensor datasheets.
// ─────────────────────────────────────────────────────────────────────────────

interface ThresholdBand {
  max: number;
  label: string;
  color: string;
  bg: string;
  description: string;
}

interface SensorConfig {
  displayName: string;
  unit: string;
  conversionNote: string;
  referenceValue: string;
  correlation: string;
  thresholds: ThresholdBand[];
}

const SENSOR_CONFIG: Record<string, SensorConfig> = {
  soilMoisture: {
    displayName: "Soil Moisture",
    unit: "%",
    conversionNote: "ADC (0–1023) → % via: (1 − ADC/1023) × 100",
    referenceValue: "Gravimetric moisture meter at 55 % (field capacity)",
    correlation:
      "Inversely correlated with temperature (hot air dries soil faster). " +
      "Low soil moisture + low humidity together signal drought stress. " +
      "High soil moisture after pump activation confirms correct actuator response.",
    thresholds: [
      { max: 20,  label: "CRITICAL LOW",  color: "#dc2626", bg: "#fee2e2", description: "Drought stress — irrigation required immediately" },
      { max: 40,  label: "LOW",           color: "#d97706", bg: "#fef3c7", description: "Dry soil — irrigate soon" },
      { max: 70,  label: "OPTIMAL",       color: "#059669", bg: "#d1fae5", description: "Good field moisture for most crops" },
      { max: 85,  label: "HIGH",          color: "#d97706", bg: "#fef3c7", description: "Slightly wet — check drainage" },
      { max: 100, label: "CRITICAL HIGH", color: "#dc2626", bg: "#fee2e2", description: "Waterlogged — root rot risk" },
    ],
  },
  temperature: {
    displayName: "Temperature",
    unit: "°C",
    conversionNote: "DHT11 outputs calibrated °C directly (±2 °C accuracy)",
    referenceValue: "NIST-traceable thermometer reading in same environment",
    correlation:
      "Positively correlated with reservoir evaporation rate and NPK uptake speed. " +
      "High temperature → lower humidity → faster soil drying. " +
      "Temperature above 30 °C combined with low soil moisture triggers critical alert.",
    thresholds: [
      { max: 10,  label: "CRITICAL LOW",  color: "#dc2626", bg: "#fee2e2", description: "Frost risk — crop damage likely" },
      { max: 18,  label: "LOW",           color: "#d97706", bg: "#fef3c7", description: "Cool — slow germination and growth" },
      { max: 30,  label: "OPTIMAL",       color: "#059669", bg: "#d1fae5", description: "Ideal range for most tropical/subtropical crops" },
      { max: 38,  label: "HIGH",          color: "#d97706", bg: "#fef3c7", description: "Heat stress — increase irrigation frequency" },
      { max: 80,  label: "CRITICAL HIGH", color: "#dc2626", bg: "#fee2e2", description: "Severe heat — crop wilting likely" },
    ],
  },
  humidity: {
    displayName: "Humidity",
    unit: "%",
    conversionNote: "DHT11 outputs relative humidity % directly (±5 % accuracy)",
    referenceValue: "Calibrated hygrometer at same location",
    correlation:
      "Inversely correlated with temperature (warmer air holds more water vapour). " +
      "Low humidity accelerates plant transpiration, increasing soil moisture depletion. " +
      "High humidity combined with warm temperature creates fungal disease conditions.",
    thresholds: [
      { max: 30,  label: "CRITICAL LOW",  color: "#dc2626", bg: "#fee2e2", description: "Very dry air — high transpiration stress" },
      { max: 45,  label: "LOW",           color: "#d97706", bg: "#fef3c7", description: "Dry conditions — monitor plant wilt" },
      { max: 75,  label: "OPTIMAL",       color: "#059669", bg: "#d1fae5", description: "Comfortable humidity for crop growth" },
      { max: 85,  label: "HIGH",          color: "#d97706", bg: "#fef3c7", description: "Humid — elevated fungal disease pressure" },
      { max: 100, label: "CRITICAL HIGH", color: "#dc2626", bg: "#fee2e2", description: "Saturated air — downy mildew / botrytis risk" },
    ],
  },
  reservoirLevel: {
    displayName: "Reservoir Level",
    unit: "cm",
    conversionNote: "HC-SR04 pulse duration → cm via: duration × 0.034 / 2",
    referenceValue: "Physical ruler measurement of distance from sensor to water surface",
    correlation:
      "Decreases as irrigation pump activates (water leaving tank). " +
      "Rate of decrease correlates with soil moisture deficit magnitude. " +
      "Low reservoir combined with low soil moisture is the highest-priority alert.",
    thresholds: [
      { max: 5,   label: "CRITICAL LOW",  color: "#dc2626", bg: "#fee2e2", description: "Tank nearly empty — refill urgently" },
      { max: 15,  label: "LOW",           color: "#d97706", bg: "#fef3c7", description: "Low water level — schedule refill" },
      { max: 35,  label: "OPTIMAL",       color: "#059669", bg: "#d1fae5", description: "Adequate water supply for irrigation" },
      { max: 50,  label: "HIGH",          color: "#d97706", bg: "#fef3c7", description: "Tank nearly full — normal" },
      { max: 400, label: "CRITICAL HIGH", color: "#dc2626", bg: "#fee2e2", description: "Sensor out-of-range or overflow risk" },
    ],
  },
  nitrogen: {
    displayName: "Nitrogen (N)",
    unit: "mg/kg",
    conversionNote: "RS485 Modbus response bytes [3:4] big-endian integer → mg/kg",
    referenceValue: "Soil lab test (Kjeldahl method) on same soil sample",
    correlation:
      "Depletes faster at high temperatures due to increased microbial mineralisation. " +
      "Low N combined with low soil moisture inhibits uptake even if N is present in soil. " +
      "N, P, K together indicate overall soil fertility.",
    thresholds: [
      { max: 50,   label: "CRITICAL LOW",  color: "#dc2626", bg: "#fee2e2", description: "Severe N deficiency — apply nitrogenous fertilizer" },
      { max: 100,  label: "LOW",           color: "#d97706", bg: "#fef3c7", description: "Low N — yellowing (chlorosis) expected" },
      { max: 300,  label: "OPTIMAL",       color: "#059669", bg: "#d1fae5", description: "Good nitrogen availability for growth" },
      { max: 600,  label: "HIGH",          color: "#d97706", bg: "#fef3c7", description: "Elevated N — monitor for excess growth / burning" },
      { max: 1999, label: "CRITICAL HIGH", color: "#dc2626", bg: "#fee2e2", description: "Toxic N — leaching/runoff environmental risk" },
    ],
  },
  phosphorus: {
    displayName: "Phosphorus (P)",
    unit: "mg/kg",
    conversionNote: "RS485 Modbus response bytes [5:6] big-endian integer → mg/kg",
    referenceValue: "Soil lab test (Olsen / Mehlich-3 extraction) on same sample",
    correlation:
      "Uptake is reduced in waterlogged soils (high soil moisture cuts P availability). " +
      "P works synergistically with K for root development and disease resistance. " +
      "Low P with adequate N creates nutrient imbalance; plant shows purple-tinged leaves.",
    thresholds: [
      { max: 25,   label: "CRITICAL LOW",  color: "#dc2626", bg: "#fee2e2", description: "Severe P deficiency — purple discolouration of leaves" },
      { max: 50,   label: "LOW",           color: "#d97706", bg: "#fef3c7", description: "Low phosphorus — slow root development" },
      { max: 150,  label: "OPTIMAL",       color: "#059669", bg: "#d1fae5", description: "Good P availability for root and flower development" },
      { max: 400,  label: "HIGH",          color: "#d97706", bg: "#fef3c7", description: "High P — may lock out zinc and iron" },
      { max: 1999, label: "CRITICAL HIGH", color: "#dc2626", bg: "#fee2e2", description: "Excess P — eutrophication risk if runoff occurs" },
    ],
  },
  potassium: {
    displayName: "Potassium (K)",
    unit: "mg/kg",
    conversionNote: "RS485 Modbus response bytes [7:8] big-endian integer → mg/kg",
    referenceValue: "Soil lab test (ammonium acetate extraction) on same sample",
    correlation:
      "Regulates stomatal opening — plants with low K cannot control water loss, amplifying " +
      "drought stress when soil moisture is low. K also strengthens cell walls against disease " +
      "pressure correlated with high humidity.",
    thresholds: [
      { max: 100,  label: "CRITICAL LOW",  color: "#dc2626", bg: "#fee2e2", description: "Severe K deficiency — leaf scorch / tip burn" },
      { max: 200,  label: "LOW",           color: "#d97706", bg: "#fef3c7", description: "Low K — reduced drought and disease tolerance" },
      { max: 500,  label: "OPTIMAL",       color: "#059669", bg: "#d1fae5", description: "Good potassium availability" },
      { max: 800,  label: "HIGH",          color: "#d97706", bg: "#fef3c7", description: "High K — may reduce calcium/magnesium uptake" },
      { max: 1999, label: "CRITICAL HIGH", color: "#dc2626", bg: "#fee2e2", description: "Excess K — salt toxicity risk" },
    ],
  },
};

function classify(value: number, thresholds: ThresholdBand[]): ThresholdBand {
  for (const band of thresholds) {
    if (value <= band.max) return band;
  }
  return thresholds[thresholds.length - 1];
}

interface ClassificationPanelProps {
  readings: Reading[];
}

export default function ClassificationPanel({ readings }: ClassificationPanelProps) {
  if (readings.length === 0) return null;

  const latest = readings[readings.length - 1];

  const sensorValues: Record<string, number | null> = {
    soilMoisture:   latest.soilMoisture   ?? null,
    temperature:    latest.temperature    ?? null,
    humidity:       latest.humidity       ?? null,
    reservoirLevel: latest.reservoirLevel ?? null,
    nitrogen:       latest.nitrogen       ?? null,
    phosphorus:     latest.phosphorus     ?? null,
    potassium:      latest.potassium      ?? null,
  };

  return (
    <div className="p-6">
      {/* Per-sensor classification cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {Object.entries(SENSOR_CONFIG).map(([key, cfg]) => {
          const val = sensorValues[key];
          const band = val != null ? classify(val, cfg.thresholds) : null;

          return (
            <div
              key={key}
              className="border rounded-xl p-4"
              style={{ borderColor: band?.color ?? "#e5e7eb" }}
            >
              {/* Sensor name + value */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-sm font-semibold text-gray-800">{cfg.displayName}</span>
                {band && val != null ? (
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: band.bg, color: band.color }}
                  >
                    {band.label}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400 px-2 py-0.5 bg-gray-100 rounded-full">
                    NO DATA
                  </span>
                )}
              </div>

              {val != null && (
                <p className="text-2xl font-bold text-gray-900 mb-1">
                  {val.toFixed(1)}{" "}
                  <span className="text-sm font-normal text-gray-400">{cfg.unit}</span>
                </p>
              )}

              {band && (
                <p className="text-xs text-gray-500 mb-3" style={{ color: band.color }}>
                  {band.description}
                </p>
              )}

              {/* Classification zones mini-bar */}
              <div className="flex h-2 rounded-full overflow-hidden mb-3">
                {cfg.thresholds.map((t, i) => (
                  <div
                    key={i}
                    className="flex-1 transition-opacity"
                    style={{
                      backgroundColor: t.color,
                      opacity: band?.label === t.label ? 1 : 0.18,
                    }}
                  />
                ))}
              </div>

              {/* Conversion + reference */}
              <div className="space-y-1">
                <p className="text-xs text-gray-400">
                  <span className="font-medium text-gray-500">Conversion: </span>
                  {cfg.conversionNote}
                </p>
                <p className="text-xs text-gray-400">
                  <span className="font-medium text-gray-500">Reference: </span>
                  {cfg.referenceValue}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Correlation matrix */}
      <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">
          Sensor Correlation Documentation
        </h4>
        <p className="text-xs text-gray-500 mb-3">
          Assignment §9.2 — "Understanding your sensor data correlation before you can classify to predict"
        </p>
        <div className="space-y-3">
          {Object.entries(SENSOR_CONFIG).map(([key, cfg]) => (
            <div key={key} className="flex gap-3">
              <span
                className="text-xs font-semibold shrink-0 mt-0.5 w-28"
                style={{
                  color:
                    sensorValues[key] != null
                      ? classify(sensorValues[key]!, cfg.thresholds).color
                      : "#9ca3af",
                }}
              >
                {cfg.displayName}
              </span>
              <p className="text-xs text-gray-500 leading-relaxed">{cfg.correlation}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Classification table */}
      <div className="mt-4 border border-gray-100 rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-2 text-gray-500 font-semibold">Sensor</th>
              <th className="text-left px-4 py-2 text-gray-500 font-semibold">CRITICAL LOW</th>
              <th className="text-left px-4 py-2 text-gray-500 font-semibold">LOW</th>
              <th className="text-left px-4 py-2 text-gray-500 font-semibold">OPTIMAL</th>
              <th className="text-left px-4 py-2 text-gray-500 font-semibold">HIGH</th>
              <th className="text-left px-4 py-2 text-gray-500 font-semibold">CRITICAL HIGH</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {Object.entries(SENSOR_CONFIG).map(([key, cfg]) => (
              <tr key={key} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-2 font-medium text-gray-700">
                  {cfg.displayName} <span className="text-gray-400">({cfg.unit})</span>
                </td>
                {cfg.thresholds.map((t, i) => (
                  <td key={i} className="px-4 py-2">
                    <span
                      className="px-1.5 py-0.5 rounded font-medium"
                      style={{ backgroundColor: t.bg, color: t.color }}
                    >
                      {"≤ " + t.max}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
