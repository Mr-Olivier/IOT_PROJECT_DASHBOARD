// 'use client'

// import { useState } from 'react'
// import TimeRangePicker from './TimeRangePicker'
// import TimeSeriesChart, { type Reading } from './TimeSeriesChart'

// interface NodeDetailChartsProps {
//   nodeId: string
//   initialReadings: Reading[]
// }

// const METRICS: Array<{
//   key: 'soilMoisture' | 'temperature' | 'humidity' | 'reservoirLevel' | 'ph'
//   title: string
//   unit: string
//   color: string
// }> = [
//   { key: 'soilMoisture', title: 'Soil Moisture', unit: '%', color: '#10b981' },
//   { key: 'temperature', title: 'Temperature', unit: '°C', color: '#f59e0b' },
//   { key: 'humidity', title: 'Humidity', unit: '%', color: '#38bdf8' },
//   { key: 'reservoirLevel', title: 'Reservoir Level', unit: 'cm', color: '#818cf8' },
//   { key: 'ph', title: 'pH', unit: 'pH', color: '#fb7185' },
// ]

// export default function NodeDetailCharts({ nodeId, initialReadings }: NodeDetailChartsProps) {
//   const [readings, setReadings] = useState<Reading[]>(initialReadings)
//   const [loading, setLoading] = useState(false)

//   async function handleRangeChange(start: Date, end: Date) {
//     setLoading(true)
//     try {
//       const params = new URLSearchParams({
//         start: start.toISOString(),
//         end: end.toISOString(),
//       })
//       const res = await fetch(`/api/nodes/${nodeId}/readings?${params}`)
//       if (res.ok) {
//         const data = await res.json()
//         setReadings(data.readings ?? [])
//       }
//     } finally {
//       setLoading(false)
//     }
//   }

//   return (
//     <div className="flex flex-col gap-6">
//       <div className="flex items-center justify-between gap-4 flex-wrap">
//         <TimeRangePicker onRangeChange={handleRangeChange} />
//         {loading && (
//           <span className="text-sm text-emerald-600 animate-pulse">Loading...</span>
//         )}
//       </div>

//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//         {METRICS.map(({ key, title, unit, color }) => (
//           <TimeSeriesChart
//             key={key}
//             readings={readings}
//             metric={key}
//             title={title}
//             unit={unit}
//             color={color}
//           />
//         ))}
//       </div>
//     </div>
//   )
// }

"use client";

import { useState } from "react";
import TimeRangePicker from "./TimeRangePicker";
import TimeSeriesChart, { type Reading } from "./TimeSeriesChart";
import AllSensorsChart from "./AllSensorsChart";
import { LayoutGrid, Activity } from "lucide-react";

interface NodeDetailChartsProps {
  nodeId: string;
  initialReadings: Reading[];
}

const METRICS: Array<{
  key: "soilMoisture" | "temperature" | "humidity" | "reservoirLevel" | "ph";
  title: string;
  unit: string;
  color: string;
}> = [
  { key: "soilMoisture", title: "Soil Moisture", unit: "%", color: "#10b981" },
  { key: "temperature", title: "Temperature", unit: "°C", color: "#f59e0b" },
  { key: "humidity", title: "Humidity", unit: "%", color: "#38bdf8" },
  {
    key: "reservoirLevel",
    title: "Reservoir Level",
    unit: "cm",
    color: "#818cf8",
  },
  { key: "ph", title: "pH", unit: "pH", color: "#fb7185" },
];

type ViewMode = "combined" | "individual";

export default function NodeDetailCharts({
  nodeId,
  initialReadings,
}: NodeDetailChartsProps) {
  const [readings, setReadings] = useState<Reading[]>(initialReadings);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<ViewMode>("combined");

  async function handleRangeChange(start: Date, end: Date) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        start: start.toISOString(),
        end: end.toISOString(),
      });
      const res = await fetch(`/api/nodes/${nodeId}/readings?${params}`);
      if (res.ok) {
        const data = await res.json();
        setReadings(data.readings ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <TimeRangePicker onRangeChange={handleRangeChange} />

        <div className="flex items-center gap-3">
          {loading && (
            <span className="text-sm text-emerald-600 animate-pulse">
              Loading…
            </span>
          )}
          {/* View toggle */}
          <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
            <button
              onClick={() => setView("combined")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                view === "combined"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Activity size={13} />
              Combined
            </button>
            <button
              onClick={() => setView("individual")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                view === "individual"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <LayoutGrid size={13} />
              Individual
            </button>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Total Records",
            value: readings.length.toLocaleString(),
            color: "text-emerald-600",
          },
          { label: "Sensors Active", value: "4", color: "text-sky-600" },
          {
            label: "Latest Reading",
            value:
              readings.length > 0
                ? new Date(
                    readings[readings.length - 1].timestamp ?? "",
                  ).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—",
            color: "text-violet-600",
          },
          {
            label: "Oldest Reading",
            value:
              readings.length > 0
                ? new Date(readings[0].timestamp ?? "").toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—",
            color: "text-orange-500",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm"
          >
            <p className="text-xs text-gray-400 font-medium">{stat.label}</p>
            <p className={`text-lg font-semibold mt-0.5 ${stat.color}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Charts */}
      {view === "combined" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AllSensorsChart readings={readings} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {METRICS.map(({ key, title, unit, color }) => (
            <TimeSeriesChart
              key={key}
              readings={readings}
              metric={key}
              title={title}
              unit={unit}
              color={color}
            />
          ))}
        </div>
      )}
    </div>
  );
}
