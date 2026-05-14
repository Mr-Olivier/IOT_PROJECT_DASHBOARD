interface Props {
  metrics: { accuracy: number; precision: number; recall: number; f1: number }
  trainedAt?: string
  recordCount?: number
}

interface MetricCardProps {
  label: string
  value: number
  description: string
  gradient: string
  textColor: string
  bgColor: string
  borderColor: string
}

function MetricCard({ label, value, description, gradient, textColor, bgColor, borderColor }: MetricCardProps) {
  const pct = Math.round(value * 100)
  return (
    <div className={`bg-white border ${borderColor} rounded-2xl p-5 shadow-sm`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</p>
          <p className={`text-4xl font-black tabular-nums mt-1 ${textColor}`}>{pct}%</p>
        </div>
        <div className={`${bgColor} rounded-xl px-2.5 py-1`}>
          <span className={`text-xs font-bold ${textColor}`}>
            {pct >= 95 ? 'Excellent' : pct >= 85 ? 'Good' : pct >= 70 ? 'Fair' : 'Low'}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="text-[11px] text-gray-400 leading-relaxed">{description}</p>
    </div>
  )
}

export default function MLMetricsRow({ metrics, trainedAt, recordCount }: Props) {
  const cards: MetricCardProps[] = [
    {
      label:       'Accuracy',
      value:       metrics.accuracy,
      description: 'Percentage of all decisions the model got correct on unseen test data.',
      gradient:    'from-violet-500 to-purple-400',
      textColor:   'text-violet-700',
      bgColor:     'bg-violet-50',
      borderColor: 'border-violet-100',
    },
    {
      label:       'F1 Score',
      value:       metrics.f1,
      description: 'Harmonic mean of precision and recall — best single measure of overall quality.',
      gradient:    'from-sky-500 to-cyan-400',
      textColor:   'text-sky-700',
      bgColor:     'bg-sky-50',
      borderColor: 'border-sky-100',
    },
    {
      label:       'Precision',
      value:       metrics.precision,
      description: 'Of all the times the model said "IRRIGATE", how often was it actually right.',
      gradient:    'from-emerald-500 to-teal-400',
      textColor:   'text-emerald-700',
      bgColor:     'bg-emerald-50',
      borderColor: 'border-emerald-100',
    },
    {
      label:       'Recall',
      value:       metrics.recall,
      description: 'Of all the readings that truly needed irrigation, how many did the model catch.',
      gradient:    'from-orange-500 to-amber-400',
      textColor:   'text-orange-700',
      bgColor:     'bg-orange-50',
      borderColor: 'border-orange-100',
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => <MetricCard key={c.label} {...c} />)}
      </div>

      {/* Training info strip */}
      {(trainedAt || recordCount) && (
        <div className="bg-white border border-gray-100 rounded-2xl px-6 py-4 shadow-sm flex flex-wrap items-center gap-6 text-sm">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-violet-400" />
            <span className="text-gray-400">Algorithm</span>
            <span className="font-bold text-gray-700">Random Forest Classifier</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-sky-400" />
            <span className="text-gray-400">Trees</span>
            <span className="font-bold text-gray-700">100 estimators</span>
          </div>
          {recordCount && (
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-gray-400">Training records</span>
              <span className="font-bold text-gray-700">{recordCount.toLocaleString()}</span>
            </div>
          )}
          {trainedAt && (
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-orange-400" />
              <span className="text-gray-400">Last trained</span>
              <span className="font-bold text-gray-700">{new Date(trainedAt).toLocaleString()}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
