import { useState, useEffect, useRef, useCallback } from 'react'

interface Metric {
  time: number
  vus: number
  rps: number
  p50: number
  p95: number
  p99: number
  successRate: number
  errors: number
}

interface Scenario {
  name: string
  method: string
  endpoint: string
  color: string
}

const SCENARIOS: Scenario[] = [
  { name: 'Login Flow', method: 'POST', endpoint: '/auth/login', color: '#6366f1' },
  { name: 'Location Update', method: 'POST', endpoint: '/users/me/location', color: '#06b6d4' },
  { name: 'Session Create', method: 'POST', endpoint: '/sessions', color: '#10b981' },
  { name: 'Contacts List', method: 'GET', endpoint: '/contacts?grouped=true', color: '#f59e0b' },
  { name: 'Event Ingest', method: 'POST', endpoint: '/events', color: '#ec4899' },
]

function generateMetric(step: number, totalSteps: number): Metric {
  const progress = step / totalSteps
  // Ramp up VUs, then sustain, then ramp down
  let vus = 0
  if (progress < 0.2) vus = Math.floor((progress / 0.2) * 200)
  else if (progress < 0.75) vus = 200 + Math.floor(Math.random() * 20) - 10
  else vus = Math.floor((1 - (progress - 0.75) / 0.25) * 200)
  vus = Math.max(0, vus)

  const baseRps = vus * (2 + Math.random() * 0.5)
  const rps = Math.floor(baseRps + Math.random() * 20 - 10)

  // Latencies increase slightly under load
  const loadFactor = vus / 200
  const p50 = 12 + loadFactor * 8 + Math.random() * 5
  const p95 = 45 + loadFactor * 35 + Math.random() * 15
  const p99 = 120 + loadFactor * 80 + Math.random() * 30

  const successRate = vus > 0 ? 99.2 + Math.random() * 0.79 : 100
  const errors = vus > 150 ? Math.floor(Math.random() * 3) : 0

  return {
    time: step,
    vus: Math.max(0, vus),
    rps: Math.max(0, rps),
    p50: Math.round(p50 * 10) / 10,
    p95: Math.round(p95 * 10) / 10,
    p99: Math.round(p99 * 10) / 10,
    successRate: Math.round(successRate * 100) / 100,
    errors,
  }
}

function MiniChart({ data, dataKey, color, height = 60 }: {
  data: Metric[]
  dataKey: keyof Metric
  color: string
  height?: number
}) {
  if (data.length < 2) return <div style={{ height }} />

  const values = data.map(d => d[dataKey] as number)
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1

  const points = values.map((v, i) => {
    const x = (i / (data.length - 1)) * 100
    const y = height - ((v - min) / range) * (height - 8) - 4
    return `${x},${y}`
  }).join(' ')

  const areaPoints = `0,${height} ${points} 100,${height}`

  return (
    <svg viewBox={`0 0 100 ${height}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
      <defs>
        <linearGradient id={`grad-${dataKey}-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#grad-${dataKey}-${color.replace('#', '')})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function RequestLog({ scenarios, isRunning }: { scenarios: Scenario[]; isRunning: boolean }) {
  const [logs, setLogs] = useState<{ scenario: Scenario; status: number; latency: number; time: string }[]>([])
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(() => {
      const scenario = scenarios[Math.floor(Math.random() * scenarios.length)]
      const status = Math.random() > 0.02 ? 200 : (Math.random() > 0.5 ? 201 : 429)
      const latency = Math.floor(10 + Math.random() * 80)
      const now = new Date()
      const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`
      setLogs(prev => [...prev.slice(-30), { scenario, status, latency, time }])
    }, 200)
    return () => clearInterval(interval)
  }, [isRunning, scenarios])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logs])

  return (
    <div ref={logRef} className="h-32 overflow-auto font-mono text-[10px] leading-[1.6]">
      {logs.map((log, i) => (
        <div key={i} className="flex gap-2">
          <span className="text-zinc-600">{log.time}</span>
          <span className="w-8 text-zinc-500">{log.scenario.method}</span>
          <span className={log.status < 300 ? 'text-green-500' : 'text-amber-500'}>{log.status}</span>
          <span className="flex-1 text-zinc-400">{log.scenario.endpoint}</span>
          <span className={log.latency > 50 ? 'text-amber-400' : 'text-zinc-500'}>{log.latency}ms</span>
        </div>
      ))}
      {isRunning && <span className="inline-block h-3 w-1 animate-pulse bg-zinc-500" />}
    </div>
  )
}

export default function K6Dashboard() {
  const [isRunning, setIsRunning] = useState(false)
  const [step, setStep] = useState(0)
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [totalRequests, setTotalRequests] = useState(0)
  const totalSteps = 60

  useEffect(() => {
    if (!isRunning || step >= totalSteps) {
      if (step >= totalSteps) setIsRunning(false)
      return
    }
    const timer = setTimeout(() => {
      const m = generateMetric(step, totalSteps)
      setMetrics(prev => [...prev, m])
      setTotalRequests(prev => prev + m.rps)
      setStep(s => s + 1)
    }, 300)
    return () => clearTimeout(timer)
  }, [isRunning, step])

  const handleStart = () => {
    setMetrics([])
    setStep(0)
    setTotalRequests(0)
    setIsRunning(true)
  }

  const current = metrics[metrics.length - 1] || { vus: 0, rps: 0, p50: 0, p95: 0, p99: 0, successRate: 100, errors: 0 }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-700/50 bg-[#0d1117]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-700/50 bg-[#161b22] px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-semibold text-zinc-300">k6</span>
          <span className="font-mono text-[10px] text-zinc-500">load-test-api.js</span>
          <div className="flex gap-1.5">
            {SCENARIOS.map(s => (
              <span key={s.name} className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} title={s.name} />
            ))}
          </div>
        </div>
        <button
          onClick={handleStart}
          disabled={isRunning}
          className="flex items-center gap-1.5 rounded-md bg-indigo-600/90 px-3 py-1 font-mono text-xs font-medium text-white transition-all hover:bg-indigo-500 disabled:opacity-50"
        >
          {isRunning ? (
            <>
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              {Math.floor((step / totalSteps) * 100)}%
            </>
          ) : (
            <>
              <span className="text-sm">&#9654;</span> Run Test
            </>
          )}
        </button>
      </div>

      <div className="p-4">
        {/* Metrics Grid */}
        <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          <div className="rounded-md border border-zinc-700/50 bg-[#161b22] p-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">Virtual Users</div>
            <div className="font-mono text-xl font-bold text-indigo-400">{current.vus}</div>
            <MiniChart data={metrics} dataKey="vus" color="#6366f1" height={30} />
          </div>
          <div className="rounded-md border border-zinc-700/50 bg-[#161b22] p-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">Requests/sec</div>
            <div className="font-mono text-xl font-bold text-cyan-400">{current.rps}</div>
            <MiniChart data={metrics} dataKey="rps" color="#06b6d4" height={30} />
          </div>
          <div className="rounded-md border border-zinc-700/50 bg-[#161b22] p-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">p95 Latency</div>
            <div className="font-mono text-xl font-bold text-amber-400">{current.p95}<span className="text-xs text-zinc-500">ms</span></div>
            <MiniChart data={metrics} dataKey="p95" color="#f59e0b" height={30} />
          </div>
          <div className="rounded-md border border-zinc-700/50 bg-[#161b22] p-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">Success Rate</div>
            <div className="font-mono text-xl font-bold text-green-400">{current.successRate}<span className="text-xs text-zinc-500">%</span></div>
            <MiniChart data={metrics} dataKey="successRate" color="#10b981" height={30} />
          </div>
        </div>

        {/* Scenario breakdown */}
        <div className="mb-3 flex flex-wrap gap-3">
          {SCENARIOS.map(s => (
            <div key={s.name} className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-400">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-zinc-500">{s.method}</span>
              <span>{s.endpoint}</span>
            </div>
          ))}
        </div>

        {/* Live request log */}
        <div className="rounded-md border border-zinc-700/50 bg-[#0a0e14] p-3">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-zinc-600">Live Requests</div>
          <RequestLog scenarios={SCENARIOS} isRunning={isRunning} />
        </div>

        {/* Summary */}
        {!isRunning && step >= totalSteps && (
          <div className="mt-3 rounded-md border border-green-800/50 bg-green-950/30 p-3 font-mono text-xs">
            <div className="mb-1 font-semibold text-green-400">Test Complete</div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-zinc-400 md:grid-cols-4">
              <div>Total requests: <span className="text-zinc-200">{totalRequests.toLocaleString()}</span></div>
              <div>Peak VUs: <span className="text-zinc-200">200</span></div>
              <div>Avg p95: <span className="text-zinc-200">{(metrics.reduce((a, m) => a + m.p95, 0) / metrics.length).toFixed(1)}ms</span></div>
              <div>Errors: <span className="text-zinc-200">{metrics.reduce((a, m) => a + m.errors, 0)}</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
