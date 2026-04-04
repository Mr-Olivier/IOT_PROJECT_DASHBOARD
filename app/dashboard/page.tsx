// import { getPumpState } from '@/lib/pump'
// import { fetchAndCacheWeather } from '@/lib/weather'
// import { getLatestPrediction } from '@/lib/predictions'
// import { getAlertHistory } from '@/lib/alerts'
// import { getActiveNodes, isNodeOffline } from '@/lib/nodes'
// import { getLatestReading } from '@/lib/readings'
// import { prisma } from '@/lib/prisma'

// import NodeStatusGrid from './components/NodeStatusGrid'
// import PumpControlPanel from './components/PumpControlPanel'
// import WeatherWidget from './components/WeatherWidget'
// import PredictionPanel from './components/PredictionPanel'
// import AlertBanner from './components/AlertBanner'
// import AlertHistoryTable from './components/AlertHistoryTable'

// export const dynamic = 'force-dynamic'

// export default async function DashboardPage() {
//   const now = new Date()

//   // Fetch all initial data server-side in parallel
//   const [
//     activeNodes,
//     pumpEvent,
//     weatherResult,
//     pred24h,
//     pred7d,
//     unackedAlerts,
//     alertTotal,
//   ] = await Promise.all([
//     getActiveNodes(),
//     getPumpState(),
//     fetchAndCacheWeather(),
//     getLatestPrediction('24h'),
//     getLatestPrediction('7d'),
//     getAlertHistory({ acknowledged: false, limit: 10 }),
//     prisma.alert.count(),
//   ])

//   // Enrich nodes with latest readings and offline status
//   const nodesWithStatus = await Promise.all(
//     activeNodes.map(async (node) => {
//       const latest = await getLatestReading(node.id)
//       const offline = latest ? isNodeOffline(latest.timestamp, now) : true
//       return {
//         id: node.id,
//         name: node.name,
//         zone: node.zone ?? undefined,
//         isOffline: offline,
//         lastSeen: latest?.timestamp.toISOString(),
//         soilMoisture: latest?.soilMoisture,
//         temperature: latest?.temperature,
//         humidity: latest?.humidity,
//         reservoirLevel: latest?.reservoirLevel,
//         ph: latest?.ph,
//       }
//     })
//   )

//   // Pump state props
//   const pumpState =
//     pumpEvent?.action === 'on' || pumpEvent?.action === 'off'
//       ? (pumpEvent.action as 'on' | 'off')
//       : 'unknown'
//   const pumpSource = pumpEvent?.source ?? 'manual'

//   // Weather props
//   const weatherData = weatherResult?.data as Parameters<typeof WeatherWidget>[0]['initialData']
//   const weatherIsStale = weatherResult?.isStale ?? false
//   const weatherFetchedAt = weatherResult?.fetchedAt?.toISOString()

//   // Prediction props — serialize Prisma objects to plain JSON-compatible shapes
//   const serializePred = (p: typeof pred24h) => {
//     if (!p) return null
//     return {
//       id: p.id,
//       generatedAt: p.generatedAt.toISOString(),
//       horizon: p.horizon,
//       predictions: p.predictions as { timestamp: string; probability: number; confidence: number }[],
//       inputFeatures: p.inputFeatures as Record<string, unknown>,
//       isStale: p.isStale,
//     }
//   }

//   // Alert props
//   const alertsForBanner = unackedAlerts.map((a) => ({
//     id: a.id,
//     nodeId: a.nodeId,
//     metric: a.metric,
//     breachValue: a.breachValue,
//     thresholdValue: a.thresholdValue,
//     direction: a.direction as 'above' | 'below',
//     acknowledged: a.acknowledged,
//     createdAt: a.createdAt.toISOString(),
//   }))

//   return (
//     <main className="bg-gray-50 min-h-screen px-4 py-6 md:px-8">
//       <h1 className="text-2xl font-bold text-gray-900 mb-6">AquaSense Dashboard</h1>

//       {/* Alert banner — full width */}
//       {alertsForBanner.length > 0 && (
//         <div className="mb-6">
//           <AlertBanner initialAlerts={alertsForBanner} />
//         </div>
//       )}

//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//         {/* Main content — left (2/3) */}
//         <div className="lg:col-span-2 flex flex-col gap-6">
//           <NodeStatusGrid initialNodes={nodesWithStatus} />
//           <AlertHistoryTable
//             initialAlerts={alertsForBanner}
//             initialTotal={alertTotal}
//           />
//         </div>

//         {/* Sidebar — right (1/3) */}
//         <div className="flex flex-col gap-6">
//           <PumpControlPanel
//             initialState={pumpState}
//             initialSource={pumpSource}
//           />
//           <WeatherWidget
//             initialData={weatherData}
//             isStale={weatherIsStale}
//             fetchedAt={weatherFetchedAt}
//           />
//           <PredictionPanel
//             pred24h={serializePred(pred24h)}
//             pred7d={serializePred(pred7d)}
//           />
//         </div>
//       </div>
//     </main>
//   )
// }

import { getPumpState } from "@/lib/pump";
import { fetchAndCacheWeather } from "@/lib/weather";
import { getLatestPrediction } from "@/lib/predictions";
import { getAlertHistory } from "@/lib/alerts";
import { getActiveNodes, isNodeOffline } from "@/lib/nodes";
import { getLatestReading } from "@/lib/readings";
import { prisma } from "@/lib/prisma";

import NodeStatusGrid from "./components/NodeStatusGrid";
import PumpControlPanel from "./components/PumpControlPanel";
import WeatherWidget from "./components/WeatherWidget";
import PredictionPanel from "./components/PredictionPanel";
import AlertBanner from "./components/AlertBanner";
import AlertHistoryTable from "./components/AlertHistoryTable";
import CalibrationPanel from "./components/CalibrationPanel";
import { Leaf, Database, Wifi } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const now = new Date();

  const [
    activeNodes,
    pumpEvent,
    weatherResult,
    pred24h,
    pred7d,
    unackedAlerts,
    alertTotal,
    totalRecords,
  ] = await Promise.all([
    getActiveNodes(),
    getPumpState(),
    fetchAndCacheWeather(),
    getLatestPrediction("24h"),
    getLatestPrediction("7d"),
    getAlertHistory({ acknowledged: false, limit: 10 }),
    prisma.alert.count(),
    prisma.sensorReading.count(),
  ]);

  const nodesWithStatus = await Promise.all(
    activeNodes.map(async (node) => {
      const latest = await getLatestReading(node.id);
      const offline = latest ? isNodeOffline(latest.timestamp, now) : true;
      return {
        id: node.id,
        name: node.name,
        zone: node.zone ?? undefined,
        isOffline: offline,
        lastSeen: latest?.timestamp.toISOString(),
        soilMoisture: latest?.soilMoisture,
        temperature: latest?.temperature,
        humidity: latest?.humidity,
        reservoirLevel: latest?.reservoirLevel,
        ph: latest?.ph,
      };
    }),
  );

  const pumpState =
    pumpEvent?.action === "on" || pumpEvent?.action === "off"
      ? (pumpEvent.action as "on" | "off")
      : "unknown";
  const pumpSource = pumpEvent?.source ?? "manual";

  const weatherData = weatherResult?.data as Parameters<
    typeof WeatherWidget
  >[0]["initialData"];
  const weatherIsStale = weatherResult?.isStale ?? false;
  const weatherFetchedAt = weatherResult?.fetchedAt?.toISOString();

  const serializePred = (p: typeof pred24h) => {
    if (!p) return null;
    return {
      id: p.id,
      generatedAt: p.generatedAt.toISOString(),
      horizon: p.horizon,
      predictions: p.predictions as {
        timestamp: string;
        probability: number;
        confidence: number;
      }[],
      inputFeatures: p.inputFeatures as Record<string, unknown>,
      isStale: p.isStale,
    };
  };

  const alertsForBanner = unackedAlerts.map((a) => ({
    id: a.id,
    nodeId: a.nodeId,
    metric: a.metric,
    breachValue: a.breachValue,
    thresholdValue: a.thresholdValue,
    direction: a.direction as "above" | "below",
    acknowledged: a.acknowledged,
    createdAt: a.createdAt.toISOString(),
  }));

  const onlineCount = nodesWithStatus.filter((n) => !n.isOffline).length;

  return (
    <main className="bg-gray-50 min-h-screen px-4 py-6 md:px-8">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 p-2.5 rounded-xl shadow-sm">
            <Leaf size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">
              AquaSense Dashboard
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Smart Irrigation & Precision Agriculture
            </p>
          </div>
        </div>
        <span className="text-xs text-gray-400">
          Last updated:{" "}
          {now.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </span>
      </div>

      {/* Summary stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4 shadow-sm flex items-center gap-4">
          <div className="bg-emerald-50 p-2.5 rounded-xl">
            <Database size={18} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Total Records</p>
            <p className="text-xl font-bold text-emerald-600 mt-0.5">
              {totalRecords.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4 shadow-sm flex items-center gap-4">
          <div className="bg-sky-50 p-2.5 rounded-xl">
            <Wifi size={18} className="text-sky-500" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Nodes Online</p>
            <p className="text-xl font-bold text-sky-600 mt-0.5">
              {onlineCount} / {activeNodes.length}
            </p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4 shadow-sm flex items-center gap-4 col-span-2 sm:col-span-1">
          <div className="bg-violet-50 p-2.5 rounded-xl">
            <Leaf size={18} className="text-violet-500" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Active Alerts</p>
            <p className="text-xl font-bold text-violet-600 mt-0.5">
              {alertsForBanner.length}
            </p>
          </div>
        </div>
      </div>

      {/* Alert banner */}
      {alertsForBanner.length > 0 && (
        <div className="mb-6">
          <AlertBanner initialAlerts={alertsForBanner} />
        </div>
      )}

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — 2/3 */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <NodeStatusGrid initialNodes={nodesWithStatus} />
          <AlertHistoryTable
            initialAlerts={alertsForBanner}
            initialTotal={alertTotal}
          />
        </div>

        {/* Right sidebar — 1/3 */}
        <div className="flex flex-col gap-6">
          <PumpControlPanel
            initialState={pumpState}
            initialSource={pumpSource}
          />
          <WeatherWidget
            initialData={weatherData}
            isStale={weatherIsStale}
            fetchedAt={weatherFetchedAt}
          />
          <PredictionPanel
            pred24h={serializePred(pred24h)}
            pred7d={serializePred(pred7d)}
          />
          <CalibrationPanel />
        </div>
      </div>
    </main>
  );
}
// dashboard update
