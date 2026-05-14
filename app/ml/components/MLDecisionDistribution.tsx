import { BarChart2 } from 'lucide-react'

interface Props {
  counts: { IRRIGATE: number; HOLD: number; LOW_WATER: number; total: number }
}

const ITEMS = [
  {
    key:        'HOLD'      as const,
    label:      'Hold',
    tagline:    'Soil has enough moisture',
    gradient:   'from-emerald-500 to-teal-400',
    bg:         'bg-emerald-50',
    border:     'border-emerald-100',
    text:       'text-emerald-700',
    barBg:      'bg-emerald-100',
  },
  {
    key:        'IRRIGATE'  as const,
    label:      'Irrigate',
    tagline:    'Pump commanded ON',
    gradient:   'from-blue-500 to-cyan-400',
    bg:         'bg-blue-50',
    border:     'border-blue-100',
    text:       'text-blue-700',
    barBg:      'bg-blue-100',
  },
  {
    key:        'LOW_WATER' as const,
    label:      'Low Water',
    tagline:    'Reservoir critically low',
    gradient:   'from-amber-500 to-orange-400',
    bg:         'bg-amber-50',
    border:     'border-amber-100',
    text:       'text-amber-700',
    barBg:      'bg-amber-100',
  },
]

export default function MLDecisionDistribution({ counts }: Props) {
  const { total } = counts

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm h-full">
      <div className="flex items-center gap-2 mb-5">
        <div className="bg-sky-50 p-2 rounded-xl">
          <BarChart2 size={16} className="text-sky-500" />
        </div>
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Decision Distribution</p>
          <p className="text-[10px] text-gray-400">{total.toLocaleString()} total decisions analysed</p>
        </div>
      </div>

      <div className="space-y-4">
        {ITEMS.map(({ key, label, tagline, gradient, bg, border, text, barBg }) => {
          const count = counts[key]
          const pct   = total > 0 ? (count / total) * 100 : 0

          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1.5">
                <div>
                  <span className={`text-sm font-bold ${text}`}>{label}</span>
                  <span className="text-[10px] text-gray-400 ml-2">{tagline}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 tabular-nums">
                    {count.toLocaleString()}
                  </span>
                  <span className={`text-xs font-extrabold tabular-nums ${text} ${bg} border ${border} px-2 py-0.5 rounded-full`}>
                    {pct.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className={`h-4 ${barBg} rounded-full overflow-hidden`}>
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-700`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Total strip */}
      <div className="mt-5 border-t pt-4 flex items-center justify-between">
        <span className="text-xs text-gray-400">Total decisions in database</span>
        <span className="text-sm font-extrabold text-gray-700 tabular-nums">
          {total.toLocaleString()}
        </span>
      </div>
    </div>
  )
}
