import { useState, useCallback, useMemo } from 'react'

// ─── Types ───────────────────────────────────────────────────
type Scenario = 'optimistic' | 'likely' | 'pessimistic'
type Billing = 'annual' | 'monthly'

interface Provider {
  key: string
  name: string
  category: string
  color: string
  url: string
  calc: (mau: number, billing: Billing) => number
  scenarioMult: Record<Scenario, number>
}

// ─── Provider definitions (generic, no branding) ─────────────
const PROVIDERS: Provider[] = [
  {
    key: 'chat', name: 'Real-time Chat', category: 'Communication', color: '#4A90D9',
    url: '#', scenarioMult: { optimistic: 0.85, likely: 1, pessimistic: 1.15 },
    calc: (mau, b) => mau <= 2000 ? 0 : mau <= 10000 ? (b === 'annual' ? 399 : 499) : (b === 'annual' ? 1049 : 1299) + Math.max(0, mau - 25000) * 0.08,
  },
  {
    key: 'auth', name: 'Auth & Verification', category: 'Communication', color: '#6BB3E0',
    url: '#', scenarioMult: { optimistic: 0.7, likely: 1, pessimistic: 1.5 },
    calc: (mau) => mau * 1.2 * 0.144,
  },
  {
    key: 'ai', name: 'AI/LLM API', category: 'AI & ML', color: '#8E63EE',
    url: '#', scenarioMult: { optimistic: 0.3, likely: 1, pessimistic: 3 },
    calc: (mau) => mau * 0.10 * 4 * 0.000520,
  },
  {
    key: 'maps', name: 'Location Services', category: 'Location', color: '#43E7D4',
    url: '#', scenarioMult: { optimistic: 0.5, likely: 1, pessimistic: 2 },
    calc: (mau) => Math.max(0, mau * 0.10 - 600),
  },
  {
    key: 'cloud', name: 'Cloud Infrastructure', category: 'Infrastructure', color: '#E8913A',
    url: '#', scenarioMult: { optimistic: 0.8, likely: 1, pessimistic: 1.4 },
    calc: (mau) => (180 + mau * 0.015) * 0.81,
  },
  {
    key: 'push', name: 'Push Notifications', category: 'Communication', color: '#93E362',
    url: '#', scenarioMult: { optimistic: 1, likely: 1, pessimistic: 1 },
    calc: (mau) => mau <= 5000 ? 0 : 19 + mau * 0.012,
  },
  {
    key: 'monitoring', name: 'Error Monitoring', category: 'DevOps', color: '#656565',
    url: '#', scenarioMult: { optimistic: 0.5, likely: 1, pessimistic: 2 },
    calc: (mau, b) => (b === 'annual' ? 26 : 29) + Math.max(0, mau * 3 - 50000) * 0.00036,
  },
  {
    key: 'deploy', name: 'Deployment Platform', category: 'Infrastructure', color: '#F5C542',
    url: '#', scenarioMult: { optimistic: 1, likely: 1, pessimistic: 1 },
    calc: (_mau, b) => b === 'annual' ? 47 : 59,
  },
  {
    key: 'review', name: 'AI Code Review', category: 'DevOps', color: '#A483ED',
    url: '#', scenarioMult: { optimistic: 1, likely: 1, pessimistic: 1.2 },
    calc: (_mau, b) => 3 * (b === 'annual' ? 24 : 30),
  },
  {
    key: 'ci', name: 'CI/CD Pipeline', category: 'DevOps', color: '#5EBF7E',
    url: '#', scenarioMult: { optimistic: 0.7, likely: 1, pessimistic: 1.5 },
    calc: () => 0,
  },
  {
    key: 'orchestration', name: 'Workflow Engine', category: 'Infrastructure', color: '#DC3545',
    url: '#', scenarioMult: { optimistic: 0.5, likely: 1, pessimistic: 2 },
    calc: (mau) => { const a = mau * 0.001; return a * 50 < 100 ? 0 : Math.max(100, a * 50) },
  },
  {
    key: 'weather', name: 'Weather API', category: 'Location', color: '#45B7D1',
    url: '#', scenarioMult: { optimistic: 0.5, likely: 1, pessimistic: 2 },
    calc: (mau) => { const calls = mau * 10; return calls <= 1000000 ? 0 : calls <= 10000000 ? 38 : 185 },
  },
  {
    key: 'design', name: 'Design Tools', category: 'DevOps', color: '#F06292',
    url: '#', scenarioMult: { optimistic: 1, likely: 1, pessimistic: 1 },
    calc: (_mau, b) => 6 * (b === 'annual' ? 15 : 20),
  },
]

const CAT_COLORS: Record<string, string> = {
  'Communication': '#4A90D9',
  'AI & ML': '#8E63EE',
  'Location': '#43E7D4',
  'Infrastructure': '#E8913A',
  'DevOps': '#656565',
}

// ─── MAU Growth Data ─────────────────────────────────────────
const MAU_DATA: Record<Scenario, number[]> = {
  optimistic:  [324, 700, 1400, 2400, 3800, 5800, 8200, 11000, 14500, 18500, 24000, 32000],
  likely:      [324, 600, 1000, 1500, 2200, 3200, 4500, 6000, 7500, 9000, 10500, 12000],
  pessimistic: [324, 420, 600, 850, 1100, 1500, 2000, 2600, 3200, 4000, 5000, 6000],
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// ─── Utility ─────────────────────────────────────────────────
function fmt(n: number): string {
  if (n < 1 && n > 0) return '$' + n.toFixed(2)
  if (n < 10) return '$' + n.toFixed(2)
  return '$' + Math.round(n).toLocaleString('en-US')
}

function fmtK(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(n >= 10000 ? 0 : 1) + 'k'
  return n.toLocaleString('en-US')
}

// ─── SVG Chart helpers ───────────────────────────────────────
function svgPath(
  data: number[],
  width: number,
  height: number,
  padding = { top: 10, bottom: 20, left: 0, right: 0 }
): string {
  if (data.length < 2) return ''
  const w = width - padding.left - padding.right
  const h = height - padding.top - padding.bottom
  const max = Math.max(...data) * 1.1 || 1
  const min = 0
  const range = max - min

  return data
    .map((v, i) => {
      const x = padding.left + (i / (data.length - 1)) * w
      const y = padding.top + h - ((v - min) / range) * h
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

function svgArea(
  data: number[],
  width: number,
  height: number,
  padding = { top: 10, bottom: 20, left: 0, right: 0 }
): string {
  const path = svgPath(data, width, height, padding)
  if (!path) return ''
  const w = width - padding.left - padding.right
  const h = height - padding.top - padding.bottom
  const lastX = padding.left + w
  const bottomY = padding.top + h
  const firstX = padding.left
  return `${path} L${lastX.toFixed(1)},${bottomY.toFixed(1)} L${firstX.toFixed(1)},${bottomY.toFixed(1)} Z`
}

// ─── Donut Chart ─────────────────────────────────────────────
function DonutChart({ data, colors, labels }: { data: number[]; colors: string[]; labels: string[] }) {
  const total = data.reduce((a, b) => a + b, 0)
  if (total === 0) return null

  const cx = 80
  const cy = 80
  const r = 60
  const ir = 38
  let angle = -Math.PI / 2

  const segments = data.map((value, i) => {
    if (value <= 0) return null
    const pct = value / total
    const startAngle = angle
    angle += pct * 2 * Math.PI
    const endAngle = angle
    const large = pct > 0.5 ? 1 : 0

    const x1o = cx + r * Math.cos(startAngle)
    const y1o = cy + r * Math.sin(startAngle)
    const x2o = cx + r * Math.cos(endAngle)
    const y2o = cy + r * Math.sin(endAngle)
    const x1i = cx + ir * Math.cos(endAngle)
    const y1i = cy + ir * Math.sin(endAngle)
    const x2i = cx + ir * Math.cos(startAngle)
    const y2i = cy + ir * Math.sin(startAngle)

    const d = [
      `M${x1o.toFixed(1)},${y1o.toFixed(1)}`,
      `A${r},${r} 0 ${large} 1 ${x2o.toFixed(1)},${y2o.toFixed(1)}`,
      `L${x1i.toFixed(1)},${y1i.toFixed(1)}`,
      `A${ir},${ir} 0 ${large} 0 ${x2i.toFixed(1)},${y2i.toFixed(1)}`,
      'Z',
    ].join(' ')

    return (
      <path key={i} d={d} fill={colors[i]} opacity={0.85} stroke="white" strokeWidth={2}>
        <title>{labels[i]}: {fmt(value)} ({(pct * 100).toFixed(1)}%)</title>
      </path>
    )
  })

  return (
    <svg viewBox="0 0 160 160" className="mx-auto h-40 w-40 md:h-48 md:w-48">
      {segments}
      <text x={cx} y={cy - 6} textAnchor="middle" className="fill-foreground text-[11px] font-bold">
        {fmt(total)}
      </text>
      <text x={cx} y={cy + 8} textAnchor="middle" className="fill-muted-foreground text-[8px]">
        /month
      </text>
    </svg>
  )
}

// ─── Mini Line Chart (for provider cards) ────────────────────
function MiniChart({ data, color, width = 80, height = 24 }: { data: number[]; color: string; width?: number; height?: number }) {
  const path = svgPath(data, width, height, { top: 2, bottom: 2, left: 0, right: 0 })
  const area = svgArea(data, width, height, { top: 2, bottom: 2, left: 0, right: 0 })
  return (
    <svg width={width} height={height} className="shrink-0">
      <path d={area} fill={color} opacity={0.1} />
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} />
    </svg>
  )
}

// ─── Main Component ──────────────────────────────────────────
export default function CostCalculatorDemo() {
  const [scenario, setScenario] = useState<Scenario>('likely')
  const [billing, setBilling] = useState<Billing>('annual')

  // Compute costs for all months and scenarios
  const computeCosts = useCallback(
    (sc: Scenario, bl: Billing) => {
      const mauArr = MAU_DATA[sc]
      return mauArr.map((mau) => {
        const costs: Record<string, number> = {}
        let total = 0
        PROVIDERS.forEach((p) => {
          const raw = p.calc(mau, bl)
          const adjusted = raw * p.scenarioMult[sc]
          costs[p.key] = adjusted
          total += adjusted
        })
        return { mau, costs, total }
      })
    },
    [],
  )

  const data = useMemo(() => computeCosts(scenario, billing), [scenario, billing, computeCosts])
  const dataOpt = useMemo(() => computeCosts('optimistic', billing), [billing, computeCosts])
  const dataPess = useMemo(() => computeCosts('pessimistic', billing), [billing, computeCosts])

  const lastMonth = data[data.length - 1]
  const yearTotal = data.reduce((sum, m) => sum + m.total, 0)
  const costPerUser = lastMonth.mau > 0 ? lastMonth.total / lastMonth.mau : 0

  // Chart dimensions
  const chartW = 400
  const chartH = 160
  const pad = { top: 12, bottom: 24, left: 0, right: 0 }

  // MAU data
  const mauValues = MAU_DATA[scenario]
  const mauMax = Math.max(...MAU_DATA.pessimistic, ...MAU_DATA.optimistic) * 1.1

  // Cost evolution data
  const costTotals = data.map((d) => d.total)
  const costOpt = dataOpt.map((d) => d.total)
  const costPess = dataPess.map((d) => d.total)
  const costMax = Math.max(...costPess) * 1.1 || 1

  // Cost per user evolution
  const cpuData = data.map((d) => (d.mau > 0 ? d.total / d.mau : 0))
  const cpuOpt = dataOpt.map((d) => (d.mau > 0 ? d.total / d.mau : 0))
  const cpuPess = dataPess.map((d) => (d.mau > 0 ? d.total / d.mau : 0))

  // Category breakdown for donut
  const categories: Record<string, number> = {}
  PROVIDERS.forEach((p) => {
    const cat = p.category
    categories[cat] = (categories[cat] || 0) + (lastMonth.costs[p.key] || 0)
  })
  const catKeys = Object.keys(categories).filter((k) => categories[k] > 0)
  const catValues = catKeys.map((k) => categories[k])
  const catColors = catKeys.map((k) => CAT_COLORS[k] || '#999')

  // Provider sparklines (12-month cost trajectory)
  const providerSparklines = useMemo(() => {
    const result: Record<string, number[]> = {}
    PROVIDERS.forEach((p) => {
      result[p.key] = data.map((d) => d.costs[p.key] || 0)
    })
    return result
  }, [data])

  // Y-axis labels helper
  const yLabels = (max: number, count = 4) => {
    const step = max / count
    return Array.from({ length: count + 1 }, (_, i) => max - i * step)
  }

  // PERT estimate
  const pertEstimate = (dataOpt.reduce((s, d) => s + d.total, 0) + 4 * yearTotal + dataPess.reduce((s, d) => s + d.total, 0)) / 6

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Billing</span>
          <div className="flex overflow-hidden rounded-md border text-xs font-medium">
            {(['annual', 'monthly'] as Billing[]).map((b) => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                className={`px-3 py-1 capitalize transition-colors ${billing === b ? 'bg-foreground text-background' : 'bg-muted/30 text-muted-foreground hover:bg-muted'}`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Scenario</span>
          <div className="flex overflow-hidden rounded-md border text-xs font-medium">
            {(['optimistic', 'likely', 'pessimistic'] as Scenario[]).map((s) => (
              <button
                key={s}
                onClick={() => setScenario(s)}
                className={`px-3 py-1 capitalize transition-colors ${scenario === s ? (s === 'optimistic' ? 'bg-green-600 text-white' : s === 'pessimistic' ? 'bg-red-500 text-white' : 'bg-foreground text-background') : 'bg-muted/30 text-muted-foreground hover:bg-muted'}`}
              >
                {s === 'likely' ? 'Most Likely' : s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg border bg-muted/20 px-3 py-2.5 text-center">
          <div className="text-lg font-bold md:text-xl">{fmt(lastMonth.total)}</div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Last Month Cost</div>
        </div>
        <div className="rounded-lg border bg-muted/20 px-3 py-2.5 text-center">
          <div className="text-lg font-bold md:text-xl">{fmt(yearTotal)}</div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">12-Month Total</div>
        </div>
        <div className="rounded-lg border bg-muted/20 px-3 py-2.5 text-center">
          <div className="text-lg font-bold md:text-xl">${costPerUser.toFixed(2)}</div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Cost/MAU</div>
        </div>
        <div className="rounded-lg border bg-muted/20 px-3 py-2.5 text-center">
          <div className="text-lg font-bold md:text-xl">{fmt(pertEstimate)}</div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">PERT Estimate</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* MAU Growth */}
        <div className="rounded-lg border bg-background/80 p-4">
          <h3 className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">User Growth Curve</h3>
          <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full" preserveAspectRatio="xMidYMid meet">
            {/* Grid lines */}
            {yLabels(mauMax).map((v, i) => {
              const y = pad.top + ((chartH - pad.top - pad.bottom) * (1 - v / mauMax))
              return (
                <g key={i}>
                  <line x1={0} y1={y} x2={chartW} y2={y} stroke="currentColor" strokeOpacity={0.06} />
                  <text x={4} y={y - 3} className="fill-muted-foreground text-[7px]">{fmtK(Math.round(v))}</text>
                </g>
              )
            })}
            {/* Area */}
            <path
              d={svgArea(mauValues.map((v) => (v / mauMax) * (chartH - pad.top - pad.bottom)), chartW, chartH, pad)}
              fill="#8E63EE"
              opacity={0.08}
            />
            {/* Line */}
            <path
              d={svgPath(mauValues.map((v) => (v / mauMax) * (chartH - pad.top - pad.bottom)), chartW, chartH, pad)}
              fill="none"
              stroke="#8E63EE"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Dots */}
            {mauValues.map((v, i) => {
              const x = (i / (mauValues.length - 1)) * chartW
              const y = pad.top + (chartH - pad.top - pad.bottom) - (v / mauMax) * (chartH - pad.top - pad.bottom)
              return <circle key={i} cx={x} cy={y} r={2.5} fill="#8E63EE" opacity={0.8}><title>{MONTHS[i]}: {fmtK(v)} MAU</title></circle>
            })}
            {/* Month labels */}
            {MONTHS.map((m, i) => (
              <text key={i} x={(i / 11) * chartW} y={chartH - 4} textAnchor="middle" className="fill-muted-foreground text-[7px]">{m}</text>
            ))}
          </svg>
        </div>

        {/* Cost Evolution */}
        <div className="rounded-lg border bg-background/80 p-4">
          <h3 className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Monthly Cost</h3>
          <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full" preserveAspectRatio="xMidYMid meet">
            {yLabels(costMax).map((v, i) => {
              const y = pad.top + ((chartH - pad.top - pad.bottom) * (1 - v / costMax))
              return (
                <g key={i}>
                  <line x1={0} y1={y} x2={chartW} y2={y} stroke="currentColor" strokeOpacity={0.06} />
                  <text x={4} y={y - 3} className="fill-muted-foreground text-[7px]">{fmt(Math.round(v))}</text>
                </g>
              )
            })}
            {/* Pessimistic band */}
            <path
              d={svgArea(costPess.map((v) => (v / costMax) * (chartH - pad.top - pad.bottom)), chartW, chartH, pad)}
              fill="#FA3E3E"
              opacity={0.04}
            />
            <path d={svgPath(costPess.map((v) => (v / costMax) * (chartH - pad.top - pad.bottom)), chartW, chartH, pad)} fill="none" stroke="#FA3E3E" strokeWidth={1.2} opacity={0.4} />
            {/* Optimistic band */}
            <path
              d={svgArea(costOpt.map((v) => (v / costMax) * (chartH - pad.top - pad.bottom)), chartW, chartH, pad)}
              fill="#5EBF7E"
              opacity={0.04}
            />
            <path d={svgPath(costOpt.map((v) => (v / costMax) * (chartH - pad.top - pad.bottom)), chartW, chartH, pad)} fill="none" stroke="#5EBF7E" strokeWidth={1.2} opacity={0.4} />
            {/* Likely line */}
            <path
              d={svgArea(costTotals.map((v) => (v / costMax) * (chartH - pad.top - pad.bottom)), chartW, chartH, pad)}
              fill="#8E63EE"
              opacity={0.06}
            />
            <path d={svgPath(costTotals.map((v) => (v / costMax) * (chartH - pad.top - pad.bottom)), chartW, chartH, pad)} fill="none" stroke="#8E63EE" strokeWidth={2.5} strokeLinecap="round" />
            {costTotals.map((v, i) => {
              const x = (i / 11) * chartW
              const y = pad.top + (chartH - pad.top - pad.bottom) - (v / costMax) * (chartH - pad.top - pad.bottom)
              return <circle key={i} cx={x} cy={y} r={2} fill="#8E63EE"><title>{MONTHS[i]}: {fmt(v)}</title></circle>
            })}
            {MONTHS.map((m, i) => (
              <text key={i} x={(i / 11) * chartW} y={chartH - 4} textAnchor="middle" className="fill-muted-foreground text-[7px]">{m}</text>
            ))}
          </svg>
          <div className="mt-1 flex items-center justify-center gap-4 text-[9px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-4 rounded-full bg-green-500/40"></span>Optimistic</span>
            <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-4 rounded-full bg-[#8E63EE]"></span>Most Likely</span>
            <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-4 rounded-full bg-red-500/40"></span>Pessimistic</span>
          </div>
        </div>

        {/* Cost per User */}
        <div className="rounded-lg border bg-background/80 p-4">
          <h3 className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cost per User</h3>
          {(() => {
            const allCpu = [...cpuData, ...cpuOpt, ...cpuPess]
            const cpuMax = Math.max(...allCpu) * 1.1 || 1
            return (
              <>
                <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full" preserveAspectRatio="xMidYMid meet">
                  {yLabels(cpuMax).map((v, i) => {
                    const y = pad.top + ((chartH - pad.top - pad.bottom) * (1 - v / cpuMax))
                    return (
                      <g key={i}>
                        <line x1={0} y1={y} x2={chartW} y2={y} stroke="currentColor" strokeOpacity={0.06} />
                        <text x={4} y={y - 3} className="fill-muted-foreground text-[7px]">${v.toFixed(2)}</text>
                      </g>
                    )
                  })}
                  <path d={svgPath(cpuPess.map((v) => (v / cpuMax) * (chartH - pad.top - pad.bottom)), chartW, chartH, pad)} fill="none" stroke="#FA3E3E" strokeWidth={1.2} opacity={0.4} />
                  <path d={svgPath(cpuOpt.map((v) => (v / cpuMax) * (chartH - pad.top - pad.bottom)), chartW, chartH, pad)} fill="none" stroke="#5EBF7E" strokeWidth={1.2} opacity={0.4} />
                  <path d={svgPath(cpuData.map((v) => (v / cpuMax) * (chartH - pad.top - pad.bottom)), chartW, chartH, pad)} fill="none" stroke="#8E63EE" strokeWidth={2.5} strokeLinecap="round" />
                  {cpuData.map((v, i) => {
                    const x = (i / 11) * chartW
                    const y = pad.top + (chartH - pad.top - pad.bottom) - (v / cpuMax) * (chartH - pad.top - pad.bottom)
                    return <circle key={i} cx={x} cy={y} r={2} fill="#8E63EE"><title>{MONTHS[i]}: ${v.toFixed(2)}/user</title></circle>
                  })}
                  {MONTHS.map((m, i) => (
                    <text key={i} x={(i / 11) * chartW} y={chartH - 4} textAnchor="middle" className="fill-muted-foreground text-[7px]">{m}</text>
                  ))}
                </svg>
                <div className="mt-1 flex items-center justify-center gap-4 text-[9px] text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-4 rounded-full bg-green-500/40"></span>Optimistic</span>
                  <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-4 rounded-full bg-[#8E63EE]"></span>Most Likely</span>
                  <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-4 rounded-full bg-red-500/40"></span>Pessimistic</span>
                </div>
              </>
            )
          })()}
        </div>

        {/* Cost Breakdown Donut */}
        <div className="rounded-lg border bg-background/80 p-4">
          <h3 className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cost Breakdown by Category</h3>
          <DonutChart data={catValues} colors={catColors} labels={catKeys} />
          <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
            {catKeys.map((k, i) => (
              <span key={k} className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: catColors[i] }}></span>
                {k}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Provider Cards */}
      <div>
        <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Provider Configuration</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {PROVIDERS.filter((p) => lastMonth.costs[p.key] > 0.5 || p.key === 'cloud' || p.key === 'chat')
            .sort((a, b) => (lastMonth.costs[b.key] || 0) - (lastMonth.costs[a.key] || 0))
            .map((p) => {
              const cost = lastMonth.costs[p.key] || 0
              return (
                <div
                  key={p.key}
                  className="flex items-center gap-3 rounded-lg border bg-background/80 px-3 py-2 transition-shadow hover:shadow-sm"
                  style={{ borderLeftWidth: 3, borderLeftColor: p.color }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs font-semibold">{p.name}</span>
                      <span className="shrink-0 rounded bg-muted/50 px-1.5 py-0.5 text-[8px] font-medium text-muted-foreground">{p.category}</span>
                    </div>
                    <div className="mt-0.5 text-base font-bold">
                      {fmt(cost)}
                      <span className="text-[10px] font-normal text-muted-foreground">/mo</span>
                    </div>
                  </div>
                  <MiniChart data={providerSparklines[p.key]} color={p.color} />
                </div>
              )
            })}
        </div>
      </div>

      {/* Footer note */}
      <p className="text-center text-[10px] text-muted-foreground/60">
        Interactive demo with sample data. Real pricing from 60+ sources. PERT = (O + 4M + P) / 6.
      </p>
    </div>
  )
}
