"use client";

import { useState, useMemo } from "react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
} from "recharts";
import { type Reading } from "./TimeSeriesChart";
import { Activity, BarChart2 } from "lucide-react";

// ─── Sensor valid ranges (must match lib/validation.ts) ─────────────────────
const SENSOR_RANGES: Record<string, { min: number; max: number; unit: string }> = {
  soilMoisture:   { min: 0,   max: 100,  unit: "%" },
  temperature:    { min: -40, max: 80,   unit: "°C" },
  humidity:       { min: 0,   max: 100,  unit: "%" },
  reservoirLevel: { min: 0,   max: 400,  unit: "cm" },
  nitrogen:       { min: 0,   max: 1999, unit: "mg/kg" },
  phosphorus:     { min: 0,   max: 1999, unit: "mg/kg" },
  potassium:      { min: 0,   max: 1999, unit: "mg/kg" },
};

// ─── Classification zones (applied to normalized 0–100 scale) ───────────────
// Assignment §9.3: "Categorize continuous time-series data into predefined classes"
const CLASSIFICATION_ZONES = [
  { label: "CRITICAL LOW",  from: 0,  to: 20,  fill: "#fecaca", textColor: "#dc2626" },
  { label: "LOW",           from: 20, to: 40,  fill: "#fde68a", textColor: "#b45309" },
  { label: "OPTIMAL",       from: 40, to: 60,  fill: "#bbf7d0", textColor: "#065f46" },
  { label: "HIGH",          from: 60, to: 80,  fill: "#fde68a", textColor: "#b45309" },
  { label: "CRITICAL HIGH", from: 80, to: 100, fill: "#fecaca", textColor: "#dc2626" },
];

const SENSOR_LINES = [
  { key: "soilMoisture",   name: "Soil Moisture",   color: "#10b981" },
  { key: "temperature",    name: "Temperature",     color: "#f59e0b" },
  { key: "humidity",       name: "Humidity",        color: "#38bdf8" },
  { key: "reservoirLevel", name: "Reservoir Level", color: "#818cf8" },
  { key: "nitrogen",       name: "Nitrogen",        color: "#84cc16" },
  { key: "phosphorus",     name: "Phosphorus",      color: "#f97316" },
  { key: "potassium",      name: "Potassium",       color: "#c084fc" },
];

// ─── Normalization formula ───────────────────────────────────────────────────
// Assignment §9.1: "Normalize the row data to a standard range"
// normalized = (value − min) / (max − min) × 100   → produces 0–100 %
function normalize(value: number | undefined | null, key: string): number | null {
  if (value == null || isNaN(value as number)) return null;
  const range = SENSOR_RANGES[key];
  if (!range) return value as number;
  const pct = ((value as number) - range.min) / (range.max - range.min) * 100;
  return Math.round(pct * 100) / 100; // 2 dp
}

function classifyNormalized(pct: number): string {
  if (pct < 20) return "CRITICAL LOW";
  if (pct < 40) return "LOW";
  if (pct < 60) return "OPTIMAL";
  if (pct < 80) return "HIGH";
  return "CRITICAL HIGH";
}


function formatXAxis(ts: string, rangeMs: number): string {
  if (!ts) return "";
  const date = new Date(ts);
  if (isNaN(date.getTime())) return ts;
  if (rangeMs <= 48 * 60 * 60 * 1000) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
}

interface AllSensorsChartProps {
  readings: Reading[];
}

export default function AllSensorsChart({ readings }: AllSensorsChartProps) {
  const [normalized, setNormalized] = useState(true);
  const [visibleSensors, setVisibleSensors] = useState<Set<string>>(
    new Set(SENSOR_LINES.map((s) => s.key))
  );

  const timestamps = useMemo(
    () =>
      readings
        .map((r) => r.bucket ?? r.timestamp ?? "")
        .filter(Boolean)
        .map((ts) => new Date(ts).getTime())
        .filter((t) => !isNaN(t)),
    [readings]
  );

  const rangeMs =
    timestamps.length >= 2 ? Math.max(...timestamps) - Math.min(...timestamps) : 0;

  const data = useMemo(
    () =>
      readings.map((r) => {
        const ts = r.bucket ?? r.timestamp ?? "";
        const point: Record<string, unknown> = { ts };
        for (const { key } of SENSOR_LINES) {
          const raw = (r as Record<string, unknown>)[key] as number | null | undefined;
          point[key] = normalized ? normalize(raw, key) : (raw ?? null);
        }
        return point;
      }),
    [readings, normalized]
  );

  function toggleSensor(key: string) {
    setVisibleSensors((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  if (readings.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex items-center justify-center h-48 text-gray-400 text-sm">
        No data available for this period
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 rounded-xl shadow-sm">
            <Activity size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-gray-900 font-bold text-base">
              All Sensors — Synchronized Timeline
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {normalized
                ? "Normalized 0–100 % · classification zones visible"
                : "Raw engineering units · scales differ per sensor"}
            </p>
          </div>
        </div>

        <button
          onClick={() => setNormalized((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
            normalized
              ? "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 text-emerald-700"
              : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
          }`}
        >
          <BarChart2 size={12} />
          {normalized ? "Normalized (0–100 %)" : "Raw Values"}
        </button>
      </div>

      {/* ── Sensor toggles ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-4">
        {SENSOR_LINES.map(({ key, name, color }) => {
          const active = visibleSensors.has(key);
          return (
            <button
              key={key}
              onClick={() => toggleSensor(key)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all"
              style={
                active
                  ? { backgroundColor: color, borderColor: color, color: "#fff" }
                  : { backgroundColor: "#fff", borderColor: "#e5e7eb", color: "#6b7280" }
              }
            >
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: active ? "#fff" : color }}
              />
              {name}
            </button>
          );
        })}
      </div>

      {/* ── Classification zone legend ──────────────────────────────────────── */}
      {normalized && (
        <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
          <span className="text-gray-400 font-medium mr-1">Zones:</span>
          {CLASSIFICATION_ZONES.map((z) => (
            <span
              key={z.label}
              className="px-2 py-0.5 rounded font-semibold"
              style={{ backgroundColor: z.fill, color: z.textColor }}
            >
              {z.label} · {z.from}–{z.to} %
            </span>
          ))}
        </div>
      )}

      {/* ── Chart ───────────────────────────────────────────────────────────── */}
      <ResponsiveContainer width="100%" height={380}>
        <ComposedChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
          {/* Classification zone bands — only in normalized mode */}
          {normalized &&
            CLASSIFICATION_ZONES.map((z) => (
              <ReferenceArea
                key={z.label}
                y1={z.from}
                y2={z.to}
                fill={z.fill}
                fillOpacity={0.35}
                stroke="none"
              />
            ))}

          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />

          <XAxis
            dataKey="ts"
            tickFormatter={(ts) => formatXAxis(ts, rangeMs)}
            tick={{ fill: "#9ca3af", fontSize: 11 }}
            axisLine={{ stroke: "#e5e7eb" }}
            tickLine={false}
          />

          <YAxis
            tick={{ fill: "#9ca3af", fontSize: 11 }}
            axisLine={{ stroke: "#e5e7eb" }}
            tickLine={false}
            width={46}
            domain={normalized ? [0, 100] : ["auto", "auto"]}
            tickFormatter={(v) => (normalized ? `${v}%` : `${v}`)}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              fontSize: 12,
              boxShadow: "0 4px 24px 0 rgba(0,0,0,0.08)",
            }}
            labelFormatter={(ts) =>
              ts ? new Date(ts as string).toLocaleString() : ""
            }
            formatter={(value: number, name: string) => {
              const sensor = SENSOR_LINES.find((s) => s.name === name);
              if (!sensor) return [`${value}`, name];
              if (normalized) {
                const cls = classifyNormalized(value);
                const range = SENSOR_RANGES[sensor.key];
                // Reverse-calculate raw value for tooltip display
                const raw =
                  value / 100 * (range.max - range.min) + range.min;
                return [
                  `${value.toFixed(1)} % → ${cls}  (raw ≈ ${raw.toFixed(1)} ${range.unit})`,
                  name,
                ];
              }
              const range = SENSOR_RANGES[sensor.key];
              return [`${value} ${range?.unit ?? ""}`, name];
            }}
          />

          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: "14px" }}
            iconType="circle"
            iconSize={8}
          />

          {SENSOR_LINES.filter((s) => visibleSensors.has(s.key)).map(
            ({ key, name, color }) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={name}
                stroke={color}
                strokeWidth={2}
                dot={false}
                connectNulls
                activeDot={{ r: 5, fill: color, strokeWidth: 0 }}
              />
            )
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
        <span>
          Normalization formula:{" "}
          <code className="bg-gray-100 px-1 rounded text-gray-600">
            normalized = (value − min) ÷ (max − min) × 100
          </code>
        </span>
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
          {readings.length.toLocaleString()} records
        </span>
      </div>
    </div>
  );
}
