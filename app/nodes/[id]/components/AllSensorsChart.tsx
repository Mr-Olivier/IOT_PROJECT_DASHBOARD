"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { type Reading } from "./TimeSeriesChart";
import { Activity } from "lucide-react";

interface AllSensorsChartProps {
  readings: Reading[];
}

function formatXAxis(ts: string, rangeMs: number): string {
  if (!ts) return "";
  const date = new Date(ts);
  if (isNaN(date.getTime())) return ts;
  if (rangeMs <= 48 * 60 * 60 * 1000) {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
}

const SENSOR_LINES = [
  { key: "soilMoisture", name: "Soil Moisture (%)", color: "#10b981" },
  { key: "temperature", name: "Temperature (°C)", color: "#f59e0b" },
  { key: "humidity", name: "Humidity (%)", color: "#38bdf8" },
  { key: "reservoirLevel", name: "Reservoir (cm)", color: "#818cf8" },
  { key: "ph", name: "pH", color: "#fb7185" },
  { key: "nitrogen", name: "Nitrogen (mg/kg)", color: "#a3e635" },
  { key: "phosphorus", name: "Phosphorus (mg/kg)", color: "#f97316" },
  { key: "potassium", name: "Potassium (mg/kg)", color: "#c084fc" },
];

export default function AllSensorsChart({ readings }: AllSensorsChartProps) {
  if (readings.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm col-span-2 flex items-center justify-center h-48 text-gray-400 text-sm">
        No data available for this period
      </div>
    );
  }

  const timestamps = readings
    .map((r) => r.bucket ?? r.timestamp ?? "")
    .filter(Boolean)
    .map((ts) => new Date(ts).getTime())
    .filter((t) => !isNaN(t));

  const rangeMs =
    timestamps.length >= 2
      ? Math.max(...timestamps) - Math.min(...timestamps)
      : 0;

  const data = readings.map((r) => ({
    ts: r.bucket ?? r.timestamp ?? "",
    soilMoisture: r.soilMoisture,
    temperature: r.temperature,
    humidity: r.humidity,
    reservoirLevel: r.reservoirLevel,
    ph: r.ph,
    nitrogen: r.nitrogen,
    phosphorus: r.phosphorus,
    potassium: r.potassium,
  }));

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm col-span-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-50 p-2 rounded-xl">
            <Activity size={18} className="text-emerald-600" />
          </div>
          <div>
            <h3 className="text-gray-900 font-semibold text-base">
              All Sensors — Combined View
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              All 7 sensors on one synchronized timeline
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
          <span className="text-xs text-emerald-700 font-medium">
            {readings.length.toLocaleString()} records
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="mt-5">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart
            data={data}
            margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
          >
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
              width={38}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                fontSize: 12,
                boxShadow: "0 4px 24px 0 rgba(0,0,0,0.08)",
              }}
              labelFormatter={(ts) => new Date(ts).toLocaleString()}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: "16px" }}
              iconType="circle"
              iconSize={8}
            />
            {SENSOR_LINES.map(({ key, name, color }) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={name}
                stroke={color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
// multi-line chart
