import { Brain, GitBranch, Database, Cpu, ArrowRight } from 'lucide-react'

interface Props {
  recordCount: number
  trainedAt: string | null
  classDistrib: Record<string, number> | null
}

function Step({
  number, icon: Icon, title, description, color,
}: {
  number: string
  icon: typeof Brain
  title: string
  description: string
  color: string
}) {
  return (
    <div className="flex gap-4">
      <div className={`shrink-0 w-9 h-9 rounded-xl ${color} flex items-center justify-center shadow-sm`}>
        <Icon size={16} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold text-gray-300 uppercase">Step {number}</span>
          <span className="text-sm font-bold text-gray-700">{title}</span>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

function RuleBox({
  condition, outcome, color,
}: {
  condition: string; outcome: string; color: string
}) {
  return (
    <div className={`bg-white border rounded-xl p-3 flex items-center gap-3 shadow-sm ${color}`}>
      <code className="text-xs font-mono text-gray-700 flex-1 leading-relaxed">{condition}</code>
      <ArrowRight size={12} className="text-gray-300 shrink-0" />
      <span className="text-xs font-bold text-gray-600 shrink-0">{outcome}</span>
    </div>
  )
}

export default function MLHowItWorks({ recordCount, trainedAt, classDistrib }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

      {/* Left — pipeline steps */}
      <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <div className="bg-violet-50 p-2 rounded-xl">
            <Brain size={16} className="text-violet-500" />
          </div>
          <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">
            Machine Learning Pipeline
          </h3>
        </div>

        <div className="space-y-5">
          <Step
            number="1" icon={Database}
            color="bg-emerald-500"
            title="Data Collection"
            description={`${recordCount.toLocaleString()} sensor readings are collected from the Arduino via USB serial. Each reading contains soil moisture, temperature, humidity, reservoir level, and NPK values. Data is stored in PostgreSQL.`}
          />
          <Step
            number="2" icon={GitBranch}
            color="bg-sky-500"
            title="Label Generation"
            description="Each reading is automatically labelled with an irrigation decision based on expert agronomic rules: if soil moisture < 40% and reservoir > 15%, label is IRRIGATE. If reservoir is critically low (< 15%), label is LOW_WATER. Otherwise HOLD."
          />
          <Step
            number="3" icon={Cpu}
            color="bg-violet-500"
            title="Random Forest Training"
            description="A Random Forest classifier with 100 decision trees is trained on 80% of the labelled data. Each tree independently learns sensor-to-decision mappings. The forest votes by majority. The remaining 20% is used to measure accuracy."
          />
          <Step
            number="4" icon={Brain}
            color="bg-orange-500"
            title="Live Inference & Pump Control"
            description="When a new reading arrives from the Arduino, it is passed to the trained model. The model returns a decision (IRRIGATE / HOLD / LOW_WATER) and a confidence score. The bridge.py script writes CMD:PUMP=1 or CMD:PUMP=0 back over the serial port, which the Arduino relay acts on immediately."
          />
        </div>
      </div>

      {/* Right — decision rules + class stats */}
      <div className="space-y-5">

        {/* Decision rules */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
            Decision Rules (Training Labels)
          </h3>
          <div className="space-y-2.5">
            <RuleBox
              condition={'reservoir < 15%'}
              outcome="LOW_WATER"
              color="border-amber-100"
            />
            <RuleBox
              condition={'soil < 40%  AND  reservoir ≥ 15%'}
              outcome="IRRIGATE"
              color="border-blue-100"
            />
            <RuleBox
              condition={'soil ≥ 40%'}
              outcome="HOLD"
              color="border-emerald-100"
            />
          </div>
          <p className="text-[10px] text-gray-300 mt-3 leading-relaxed">
            These rules generate training labels. The model learns the underlying sensor patterns
            and generalises beyond these simple rules once real-world data accumulates.
          </p>
        </div>

        {/* Training class distribution */}
        {classDistrib && (
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
              Training Label Distribution
            </h3>
            {Object.entries(classDistrib).map(([cls, count]) => {
              const t = Object.values(classDistrib).reduce((a, b) => a + b, 0)
              const pct = t > 0 ? Math.round((count / t) * 100) : 0
              const colors: Record<string, string> = {
                HOLD:      'bg-emerald-400',
                IRRIGATE:  'bg-blue-400',
                LOW_WATER: 'bg-amber-400',
              }
              return (
                <div key={cls} className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-gray-600">{cls}</span>
                    <span className="text-gray-400 tabular-nums">{count.toLocaleString()} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${colors[cls] ?? 'bg-gray-300'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Trained at info */}
        {trainedAt && (
          <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 rounded-2xl p-5 shadow-sm">
            <p className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">Model Trained At</p>
            <p className="text-sm font-bold text-violet-700 mt-1">
              {new Date(trainedAt).toLocaleString()}
            </p>
            <p className="text-[10px] text-violet-400 mt-2 leading-relaxed">
              Auto-retrains every 500 new readings. Click the retrain button
              on the dashboard to force an immediate retrain.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
