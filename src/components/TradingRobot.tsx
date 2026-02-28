import { useState, useEffect, useRef } from 'react'

interface Trade {
  id: number
  time: string
  symbol: string
  side: 'BUY' | 'SELL'
  qty: number
  price: string
  pnl: number
}

interface Position {
  symbol: string
  name: string
  allocation: number
  pnl: number
  color: string
}

const RISK_ASSETS: Position[] = [
  { symbol: 'NVDA', name: 'NVIDIA', allocation: 28, pnl: 5.3, color: '#76B900' },
  { symbol: 'AAPL', name: 'Apple', allocation: 25, pnl: 2.1, color: '#A2AAAD' },
  { symbol: 'TSLA', name: 'Tesla', allocation: 18, pnl: -1.2, color: '#E82127' },
  { symbol: 'BTC', name: 'Bitcoin', allocation: 17, pnl: 3.7, color: '#F7931A' },
  { symbol: 'ETH', name: 'Ethereum', allocation: 12, pnl: 2.1, color: '#627EEA' },
]

const SAFE_ASSETS: Position[] = [
  { symbol: 'GLD', name: 'Gold ETF', allocation: 40, pnl: 0.3, color: '#FFD700' },
  { symbol: 'TLT', name: 'US Treasury 20Y', allocation: 35, pnl: 0.1, color: '#4A90D9' },
  { symbol: 'AGG', name: 'Aggregate Bond', allocation: 25, pnl: 0.05, color: '#7CB342' },
]

const SYMBOLS = ['NVDA', 'AAPL', 'TSLA', 'BTC', 'ETH']
const SAFE_SYMBOLS = ['GLD', 'TLT', 'AGG']

const BASE_PRICES: Record<string, number> = {
  NVDA: 892, AAPL: 198, TSLA: 245, BTC: 67420, ETH: 3412,
  GLD: 215, TLT: 92, AGG: 101,
}

function randomPrice(symbol: string): string {
  const b = BASE_PRICES[symbol] || 100
  const val = b + (Math.random() - 0.5) * b * 0.02
  return symbol === 'BTC' ? val.toFixed(0) : val.toFixed(2)
}

function formatTime(): string {
  const d = new Date()
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
}

export default function TradingRobot() {
  const [isRunning, setIsRunning] = useState(false)
  const [isPanicking, setIsPanicking] = useState(false)
  const [isSafeMode, setIsSafeMode] = useState(false)
  const [trades, setTrades] = useState<Trade[]>([])
  const [positions, setPositions] = useState<Position[]>(RISK_ASSETS)
  const [totalPnl, setTotalPnl] = useState(847.32)
  const [tradeCount, setTradeCount] = useState(0)
  const [winRate, setWinRate] = useState(62)
  const [riskLevel, setRiskLevel] = useState(70)
  const [maxPosition, setMaxPosition] = useState(25)
  const [speed, setSpeed] = useState(60)
  const [strategy, setStrategy] = useState('momentum')
  const [activeTab, setActiveTab] = useState<'trades' | 'controls'>('trades')
  const feedRef = useRef<HTMLDivElement>(null)
  const tradeIdRef = useRef(0)

  // Generate trades when running
  useEffect(() => {
    if (!isRunning || isPanicking || isSafeMode) return
    const interval = setInterval(() => {
      const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
      const side: 'BUY' | 'SELL' = Math.random() > 0.42 ? 'BUY' : 'SELL'
      const qty = Math.floor(Math.random() * 80) + 1
      const price = randomPrice(symbol)
      const pnl = (Math.random() - 0.35) * 120

      tradeIdRef.current += 1
      setTrades(prev => [{
        id: tradeIdRef.current,
        time: formatTime(),
        symbol,
        side,
        qty,
        price,
        pnl,
      }, ...prev.slice(0, 24)])

      setTotalPnl(prev => prev + pnl)
      setTradeCount(prev => prev + 1)
      setWinRate(prev => {
        const delta = pnl > 0 ? 0.3 : -0.2
        return Math.min(85, Math.max(45, prev + delta))
      })

      // Fluctuate positions
      setPositions(prev => prev.map(p => ({
        ...p,
        pnl: p.pnl + (Math.random() - 0.48) * 0.3,
        allocation: Math.max(5, Math.min(40, p.allocation + (Math.random() - 0.5) * 1.5))
      })))
    }, Math.max(300, 1200 - speed * 10))

    return () => clearInterval(interval)
  }, [isRunning, isPanicking, isSafeMode, speed])

  const handleStart = () => {
    setIsRunning(true)
    setIsSafeMode(false)
    setIsPanicking(false)
    setPositions(RISK_ASSETS.map(a => ({ ...a })))
    setTrades([])
    setTotalPnl(847.32)
    setTradeCount(0)
    setWinRate(62)
  }

  const handlePanic = () => {
    if (!isRunning || isPanicking) return
    setIsPanicking(true)

    // Rapid sell-off
    let sellCount = 0
    const sellInterval = setInterval(() => {
      const symbol = SYMBOLS[sellCount % SYMBOLS.length]
      tradeIdRef.current += 1
      setTrades(prev => [{
        id: tradeIdRef.current,
        time: formatTime(),
        symbol,
        side: 'SELL' as const,
        qty: Math.floor(Math.random() * 200) + 50,
        price: randomPrice(symbol),
        pnl: -(Math.random() * 50 + 20),
      }, ...prev.slice(0, 24)])

      setTotalPnl(prev => prev - Math.random() * 80)
      sellCount++

      // Shrink risky positions during sell-off
      setPositions(prev => prev.map(p => ({
        ...p,
        allocation: Math.max(0, p.allocation - 5),
        pnl: p.pnl - Math.random() * 2,
      })))

      if (sellCount >= 8) {
        clearInterval(sellInterval)

        // Buy safe assets
        let buyCount = 0
        const buyInterval = setInterval(() => {
          const symbol = SAFE_SYMBOLS[buyCount % SAFE_SYMBOLS.length]
          tradeIdRef.current += 1
          setTrades(prev => [{
            id: tradeIdRef.current,
            time: formatTime(),
            symbol,
            side: 'BUY' as const,
            qty: Math.floor(Math.random() * 150) + 30,
            price: randomPrice(symbol),
            pnl: 0,
          }, ...prev.slice(0, 24)])

          buyCount++
          if (buyCount >= 6) {
            clearInterval(buyInterval)
            setIsPanicking(false)
            setIsSafeMode(true)
            setIsRunning(false)
            setPositions(SAFE_ASSETS.map(a => ({ ...a })))
          }
        }, 250)
      }
    }, 200)
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-700/50 bg-[#0d1117]">
      {/* Title bar */}
      <div className="flex items-center justify-between border-b border-zinc-700/50 bg-[#161b22] px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          <span className="ml-3 font-mono text-xs text-zinc-500">algo-trader.ts</span>
        </div>
        <div className="flex items-center gap-2">
          {!isRunning && !isPanicking && (
            <button
              onClick={handleStart}
              className="flex items-center gap-1.5 rounded-md bg-green-600/90 px-3 py-1 font-mono text-xs font-medium text-white transition-all hover:bg-green-500"
            >
              <span className="text-sm">&#9654;</span> {isSafeMode ? 'Restart' : 'Start'}
            </button>
          )}
          <button
            onClick={handlePanic}
            disabled={!isRunning || isPanicking}
            className={`flex items-center gap-1.5 rounded-md px-4 py-2 font-mono text-sm font-black uppercase tracking-wider text-white transition-all ${
              isPanicking
                ? 'animate-pulse bg-red-600 shadow-lg shadow-red-500/40'
                : isRunning
                  ? 'bg-red-600/90 hover:bg-red-500 hover:scale-105 shadow-lg shadow-red-500/20 active:scale-95'
                  : 'bg-red-900/40 opacity-40 cursor-not-allowed'
            }`}
          >
            <span className="text-base">🚨</span> PANIC
          </button>
        </div>
      </div>

      {/* Mobile tabs */}
      <div className="flex border-b border-zinc-700/50 md:hidden">
        <button
          onClick={() => setActiveTab('trades')}
          className={`flex-1 px-4 py-2 font-mono text-xs transition-colors ${
            activeTab === 'trades' ? 'bg-[#0d1117] text-zinc-300' : 'bg-[#161b22] text-zinc-500'
          }`}
        >
          Trades
        </button>
        <button
          onClick={() => setActiveTab('controls')}
          className={`flex-1 px-4 py-2 font-mono text-xs transition-colors ${
            activeTab === 'controls' ? 'bg-[#0d1117] text-zinc-300' : 'bg-[#161b22] text-zinc-500'
          }`}
        >
          Controls
        </button>
      </div>

      {/* Main content */}
      <div className="flex flex-col md:flex-row">
        {/* Trade Feed */}
        <div
          ref={feedRef}
          className={`flex-1 max-h-[380px] overflow-auto border-zinc-700/50 md:border-r p-3 ${
            activeTab === 'controls' ? 'hidden md:block' : ''
          }`}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
              Live Order Book
            </span>
            {(isRunning || isPanicking) && (
              <span className="flex items-center gap-1 font-mono text-[10px]">
                <span className={`h-1.5 w-1.5 rounded-full ${isPanicking ? 'bg-red-500 animate-ping' : 'bg-green-500 animate-pulse'}`} />
                <span className={isPanicking ? 'text-red-400' : 'text-green-400'}>
                  {isPanicking ? 'LIQUIDATING' : 'LIVE'}
                </span>
              </span>
            )}
          </div>

          <div className="space-y-0.5 font-mono text-xs">
            {trades.length === 0 && !isRunning && !isSafeMode && (
              <div className="py-8 text-center text-zinc-600">
                Click &quot;Start&quot; to begin trading...
              </div>
            )}
            {trades.map((trade) => (
              <div
                key={trade.id}
                className={`flex items-center gap-2 rounded px-1.5 py-0.5 transition-colors ${
                  trade.side === 'BUY' ? 'bg-green-500/5' : 'bg-red-500/5'
                }`}
              >
                <span className="text-zinc-600 tabular-nums">{trade.time}</span>
                <span className={`w-8 font-bold ${
                  trade.side === 'BUY' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {trade.side}
                </span>
                <span className="w-10 text-zinc-300">{trade.symbol}</span>
                <span className="text-zinc-500">x{trade.qty}</span>
                <span className="ml-auto text-zinc-400 tabular-nums">${trade.price}</span>
                {trade.pnl !== 0 && (
                  <span className={`w-14 text-right tabular-nums ${
                    trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(0)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Controls & Portfolio */}
        <div className={`flex-1 max-h-[380px] overflow-auto bg-[#0a0e14] p-3 ${
          activeTab === 'trades' ? 'hidden md:block' : ''
        }`}>
          {/* P&L Header */}
          <div className={`mb-3 rounded-md border p-2.5 ${
            isPanicking
              ? 'border-red-500/40 bg-red-500/10'
              : isSafeMode
                ? 'border-amber-500/30 bg-amber-500/10'
                : 'border-zinc-700/30 bg-zinc-800/30'
          }`}>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                {isPanicking ? 'EMERGENCY SELL-OFF' : isSafeMode ? 'SAFE MODE' : 'Total P&L'}
              </span>
              <span className={`font-mono text-lg font-bold tabular-nums ${
                totalPnl >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
              </span>
            </div>
            <div className="mt-1 flex gap-3 font-mono text-[10px] text-zinc-500">
              <span>Trades: {tradeCount}</span>
              <span>Win: {winRate.toFixed(0)}%</span>
              <span>Sharpe: {(1.2 + totalPnl / 5000).toFixed(1)}</span>
            </div>
          </div>

          {/* Safe Mode Banner */}
          {isSafeMode && (
            <div className="mb-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 font-mono text-xs">
              <div className="flex items-center gap-2 text-amber-400">
                <span className="text-base">🛡️</span>
                <span className="font-bold">SAFE MODE ACTIVE</span>
              </div>
              <div className="mt-1 text-amber-400/70">
                Portfolio reallocated to Gold, Treasury Bonds, and Aggregate Bonds. Capital preserved.
              </div>
            </div>
          )}

          {/* Positions */}
          <div className="mb-3">
            <div className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-zinc-600">
              {isSafeMode ? 'Safe Haven Positions' : 'Active Positions'}
            </div>
            <div className="space-y-1.5">
              {positions.map((pos) => (
                <div key={pos.symbol} className="flex items-center gap-2 font-mono text-xs">
                  <span className="w-10 font-bold text-zinc-300">{pos.symbol}</span>
                  <div className="flex-1">
                    <div className="h-2.5 overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.max(0, pos.allocation)}%`,
                          backgroundColor: pos.color,
                          opacity: 0.75,
                        }}
                      />
                    </div>
                  </div>
                  <span className="w-8 text-right text-zinc-500 tabular-nums">{Math.max(0, pos.allocation).toFixed(0)}%</span>
                  <span className={`w-12 text-right tabular-nums ${
                    pos.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {pos.pnl >= 0 ? '+' : ''}{pos.pnl.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Parameters */}
          <div className="border-t border-zinc-700/30 pt-2">
            <div className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-zinc-600">
              Parameters
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="w-16 font-mono text-xs text-zinc-500">Risk</span>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={riskLevel}
                  onChange={(e) => setRiskLevel(Number(e.target.value))}
                  className="h-1.5 flex-1 cursor-pointer accent-red-500"
                  disabled={isSafeMode}
                />
                <span className={`w-10 text-right font-mono text-xs tabular-nums ${
                  riskLevel > 70 ? 'text-red-400' : riskLevel > 40 ? 'text-amber-400' : 'text-green-400'
                }`}>{riskLevel}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-16 font-mono text-xs text-zinc-500">Position</span>
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={maxPosition}
                  onChange={(e) => setMaxPosition(Number(e.target.value))}
                  className="h-1.5 flex-1 cursor-pointer accent-cyan-500"
                  disabled={isSafeMode}
                />
                <span className="w-10 text-right font-mono text-xs text-zinc-400 tabular-nums">{maxPosition}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-16 font-mono text-xs text-zinc-500">Speed</span>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className="h-1.5 flex-1 cursor-pointer accent-green-500"
                  disabled={isSafeMode}
                />
                <span className="w-10 text-right font-mono text-xs text-zinc-400 tabular-nums">{speed}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-16 font-mono text-xs text-zinc-500">Strategy</span>
                <select
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value)}
                  className="flex-1 rounded border border-zinc-700/50 bg-zinc-800 px-2 py-1 font-mono text-xs text-zinc-300 outline-none focus:border-zinc-600"
                  disabled={isSafeMode}
                >
                  <option value="momentum">Momentum</option>
                  <option value="mean-reversion">Mean Reversion</option>
                  <option value="arbitrage">Arbitrage</option>
                  <option value="ml-signal">ML Signal</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between border-t border-zinc-700/50 bg-[#161b22] px-4 py-1.5 font-mono text-[10px]">
        <div className="flex items-center gap-3 text-zinc-500">
          <span>Trades: {tradeCount}</span>
          <span className="hidden sm:inline">Win: {winRate.toFixed(0)}%</span>
          <span className="hidden sm:inline">Sharpe: {(1.2 + totalPnl / 5000).toFixed(1)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${
            isPanicking ? 'bg-red-500 animate-ping' :
            isSafeMode ? 'bg-amber-500 animate-pulse' :
            isRunning ? 'bg-green-500 animate-pulse' : 'bg-zinc-600'
          }`} />
          <span className={
            isPanicking ? 'text-red-400' :
            isSafeMode ? 'text-amber-400' :
            isRunning ? 'text-green-400' : 'text-zinc-500'
          }>
            {isPanicking ? 'PANIC SELLING' : isSafeMode ? 'SAFE MODE' : isRunning ? 'LIVE' : 'IDLE'}
          </span>
        </div>
      </div>
    </div>
  )
}
