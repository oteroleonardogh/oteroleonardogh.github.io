import { useState, useRef, useEffect } from 'react'

const CODE_EXAMPLE = `import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

interface UserContext {
  location: { lat: number; lng: number; locality: string };
  visitHistory: { place: string; count: number }[];
  friends: { name: string; distance_km: number }[];
  weather: { temp: number; condition: string };
}

async function generateEncounterSuggestion(ctx: UserContext) {
  const prompt = \`Based on this user context, suggest an encounter:
    Location: \${ctx.location.locality}
    Top visited: \${ctx.visitHistory.map(v => v.place).join(", ")}
    Nearby friends: \${ctx.friends.filter(f => f.distance_km < 5).map(f => f.name).join(", ")}
    Weather: \${ctx.weather.temp}°C, \${ctx.weather.condition}\`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 256,
    messages: [{ role: "user", content: prompt }],
  });

  return message.content[0].text;
}

// Run with sample data
const suggestion = await generateEncounterSuggestion({
  location: { lat: 52.52, lng: 13.405, locality: "Berlin" },
  visitHistory: [
    { place: "Mauerpark", count: 12 },
    { place: "Prater Garten", count: 8 },
    { place: "Tempelhofer Feld", count: 15 },
  ],
  friends: [
    { name: "Sarah", distance_km: 1.2 },
    { name: "Marco", distance_km: 3.8 },
    { name: "Lena", distance_km: 0.5 },
  ],
  weather: { temp: 18, condition: "partly cloudy" },
});

console.log(suggestion);`

const OUTPUT_LINES = [
  { text: '$ npx ts-node encounter.ts', type: 'cmd' as const },
  { text: '', type: 'blank' as const },
  { text: '→ Loading context from PostGIS...', type: 'info' as const },
  { text: '→ visit_history (top 3 by freq)', type: 'info' as const },
  { text: '→ Nearby friends (radius: 5km)', type: 'info' as const },
  { text: '→ OpenWeather: 18°C, cloudy', type: 'info' as const },
  { text: '', type: 'blank' as const },
  { text: '→ Claude API (sonnet-4)...', type: 'info' as const },
  { text: '  📡 Tokens: 142 in, 186 out', type: 'dim' as const },
  { text: '  ⚡ Latency: 1.2s', type: 'dim' as const },
  { text: '', type: 'blank' as const },
  { text: '+-------------------------------+', type: 'border' as const },
  { text: '|  Encounter Suggestion         |', type: 'border' as const },
  { text: '+-------------------------------+', type: 'border' as const },
  { text: '|                               |', type: 'border' as const },
  { text: '|  Perfect afternoon for a      |', type: 'output' as const },
  { text: '|  hang at Tempelhofer Feld     |', type: 'output' as const },
  { text: '|  with Sarah and Lena          |', type: 'output' as const },
  { text: '|  (both under 2km away).       |', type: 'output' as const },
  { text: '|                               |', type: 'border' as const },
  { text: '|  18°C with partial clouds,    |', type: 'output' as const },
  { text: '|  ideal for outdoor fun.       |', type: 'output' as const },
  { text: '|  Top spot: 15 check-ins.      |', type: 'output' as const },
  { text: '|                               |', type: 'border' as const },
  { text: '|  Time: Today 16:00-18:00      |', type: 'output' as const },
  { text: '|  Walk + sunset beers at       |', type: 'output' as const },
  { text: '|  Prater Garten (8 visits)     |', type: 'output' as const },
  { text: '|                               |', type: 'border' as const },
  { text: '+-------------------------------+', type: 'border' as const },
  { text: '', type: 'blank' as const },
  { text: '✅ Done in 1.4s', type: 'success' as const },
]

const colorMap: Record<string, string> = {
  cmd: 'text-amber-400',
  info: 'text-cyan-400',
  dim: 'text-zinc-500',
  border: 'text-zinc-600',
  output: 'text-green-400',
  success: 'text-green-500 font-semibold',
  blank: '',
}

export default function InteractiveCodeEditor() {
  const [isRunning, setIsRunning] = useState(false)
  const [visibleLines, setVisibleLines] = useState(0)
  const [activeTab, setActiveTab] = useState<'code' | 'output'>('code')
  const outputRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isRunning) return
    if (visibleLines >= OUTPUT_LINES.length) {
      setIsRunning(false)
      return
    }
    const delay = OUTPUT_LINES[visibleLines]?.type === 'blank' ? 100 :
                  OUTPUT_LINES[visibleLines]?.type === 'cmd' ? 400 :
                  OUTPUT_LINES[visibleLines]?.type === 'info' ? 300 :
                  OUTPUT_LINES[visibleLines]?.type === 'output' ? 60 : 80
    const timer = setTimeout(() => setVisibleLines(v => v + 1), delay)
    return () => clearTimeout(timer)
  }, [isRunning, visibleLines])

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [visibleLines])

  const handleRun = () => {
    setVisibleLines(0)
    setIsRunning(true)
    setActiveTab('output')
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-700/50 bg-[#0d1117]">
      {/* Title bar */}
      <div className="flex items-center justify-between border-b border-zinc-700/50 bg-[#161b22] px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          <span className="ml-3 font-mono text-xs text-zinc-500">encounter-suggestion.ts</span>
        </div>
        <button
          onClick={handleRun}
          disabled={isRunning}
          className="flex items-center gap-1.5 rounded-md bg-green-600/90 px-3 py-1 font-mono text-xs font-medium text-white transition-all hover:bg-green-500 disabled:opacity-50"
        >
          {isRunning ? (
            <>
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Running...
            </>
          ) : (
            <>
              <span className="text-sm">&#9654;</span> Run
            </>
          )}
        </button>
      </div>

      {/* Tabs (mobile) */}
      <div className="flex border-b border-zinc-700/50 md:hidden">
        <button
          onClick={() => setActiveTab('code')}
          className={`flex-1 px-4 py-2 font-mono text-xs transition-colors ${
            activeTab === 'code' ? 'bg-[#0d1117] text-zinc-300' : 'bg-[#161b22] text-zinc-500'
          }`}
        >
          Code
        </button>
        <button
          onClick={() => setActiveTab('output')}
          className={`flex-1 px-4 py-2 font-mono text-xs transition-colors ${
            activeTab === 'output' ? 'bg-[#0d1117] text-zinc-300' : 'bg-[#161b22] text-zinc-500'
          }`}
        >
          Output {visibleLines > 0 && <span className="ml-1 text-green-400">({visibleLines})</span>}
        </button>
      </div>

      {/* Split pane */}
      <div className="flex flex-col md:flex-row">
        {/* Code pane */}
        <div className={`flex-1 max-h-[350px] overflow-auto border-zinc-700/50 md:border-r ${activeTab === 'output' ? 'hidden md:block' : ''}`}>
          <div className="flex">
            <div className="shrink-0 select-none py-3 pr-2 pl-3 text-right font-mono text-xs leading-[1.8] text-zinc-600">
              {CODE_EXAMPLE.split('\n').map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <pre className="overflow-x-auto py-3 pr-4 font-mono text-xs leading-[1.8]">
              <code>
                {CODE_EXAMPLE.split('\n').map((line, i) => {
                  let className = 'text-zinc-300'
                  if (line.startsWith('import') || line.startsWith('export') || line.startsWith('async') || line.startsWith('const') || line.includes('interface') || line.includes('await') || line.includes('return'))
                    className = 'text-purple-400'
                  if (line.trim().startsWith('//')) className = 'text-zinc-600'
                  if (line.includes('"') || line.includes("'") || line.includes('`')) {
                    if (!line.startsWith('import') && !line.includes('interface'))
                      className = 'text-green-400'
                  }
                  if (line.includes('number') || line.includes('string') || line.includes('boolean'))
                    className = 'text-cyan-400'
                  return <div key={i} className={className}>{line || ' '}</div>
                })}
              </code>
            </pre>
          </div>
        </div>

        {/* Output pane */}
        <div
          ref={outputRef}
          className={`flex-1 max-h-[350px] overflow-auto bg-[#0a0e14] p-4 ${activeTab === 'code' ? 'hidden md:block' : ''}`}
        >
          <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-zinc-600">
            Terminal Output
          </div>
          <div className="font-mono text-xs leading-[1.9] whitespace-pre">
            {OUTPUT_LINES.slice(0, visibleLines).map((line, i) => (
              <div key={i} className={colorMap[line.type] || 'text-zinc-400'}>
                {line.text || '\u00A0'}
              </div>
            ))}
            {isRunning && (
              <span className="inline-block h-4 w-1.5 animate-pulse bg-zinc-400" />
            )}
            {!isRunning && visibleLines === 0 && (
              <div className="text-zinc-600">Click "Run" to execute the code...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
