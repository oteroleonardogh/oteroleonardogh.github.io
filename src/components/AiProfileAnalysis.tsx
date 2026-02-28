import { useState, useEffect, useRef } from 'react'

const ANALYSIS_LINES = [
  'Leonardo Otero is a rare breed of software architect who combines deep technical expertise with genuine AI innovation.',
  '',
  'With 20+ years building production systems across fintech investment platforms, real estate solutions, and social apps, he has the battle-tested experience that can\'t be shortcut.',
  '',
  'What stands out most is his approach to AI: he doesn\'t just use AI tools, he builds them. His 19 custom AI development skills for Claude Code and Codex represent a systematic approach to multiplying engineering output.',
  '',
  'His technical range is remarkable: from PostGIS and pgvector for location intelligence, to Kubernetes and AWS infrastructure, to data science models with DBSCAN clustering. Few architects can operate effectively across this many domains.',
  '',
  'The result? Features that traditionally take teams weeks now ship in days, with full test coverage and documentation. That\'s not hype, that\'s engineering discipline amplified by AI.',
  '',
  'Verdict: A senior architect who\'s genuinely pushing the boundary of AI-augmented development, backed by two decades of real-world delivery.',
]

export default function AiProfileAnalysis() {
  const [isOpen, setIsOpen] = useState(false)
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const charIndexRef = useRef(0)
  const fullText = ANALYSIS_LINES.join('\n')

  useEffect(() => {
    if (!isOpen) return
    setDisplayedText('')
    setIsTyping(false)
    setIsAnalyzing(true)
    charIndexRef.current = 0

    const analyzeTimer = setTimeout(() => {
      setIsAnalyzing(false)
      setIsTyping(true)
    }, 2200)

    return () => clearTimeout(analyzeTimer)
  }, [isOpen])

  useEffect(() => {
    if (!isTyping) return
    if (charIndexRef.current >= fullText.length) {
      setIsTyping(false)
      return
    }

    const char = fullText[charIndexRef.current]
    const delay = char === '\n' ? 60 : char === '.' ? 35 : char === ',' ? 15 : 6

    const timer = setTimeout(() => {
      charIndexRef.current += 1
      setDisplayedText(fullText.slice(0, charIndexRef.current))
    }, delay)

    return () => clearTimeout(timer)
  }, [isTyping, displayedText, fullText])

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen])

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="group relative inline-flex items-center justify-center rounded-full border-2 border-indigo-500/30 bg-indigo-500/10 p-2.5 text-2xl transition-all hover:border-indigo-500/60 hover:bg-indigo-500/20 hover:scale-110 active:scale-95"
        title="Ask AI about my profile"
        aria-label="AI Profile Analysis"
      >
        <span className="relative leading-none">
          🤖
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
        </span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false)
          }}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-xl border border-zinc-700/50 bg-[#0d1117] shadow-2xl shadow-indigo-500/10 animate-in fade-in zoom-in-95">
            {/* Title bar */}
            <div className="flex items-center justify-between border-b border-zinc-700/50 bg-[#161b22] px-4 py-2.5">
              <div className="flex items-center gap-2">
                <button onClick={() => setIsOpen(false)} className="h-3 w-3 rounded-full bg-[#ff5f57] transition-opacity hover:opacity-80" aria-label="Close" />
                <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
                <span className="h-3 w-3 rounded-full bg-[#28c840]" />
                <span className="ml-3 font-mono text-xs text-zinc-500">ai-profile-analysis.ts</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[10px]">
                <span className={`h-1.5 w-1.5 rounded-full ${isAnalyzing || isTyping ? 'bg-indigo-500 animate-pulse' : 'bg-green-500'}`} />
                <span className={isAnalyzing || isTyping ? 'text-indigo-400' : 'text-green-400'}>
                  {isAnalyzing ? 'ANALYZING' : isTyping ? 'GENERATING' : 'COMPLETE'}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="max-h-[60vh] overflow-auto p-4">
              {/* Source badges */}
              <div className="mb-3 flex flex-wrap gap-1.5 font-mono text-[10px]">
                <span className="rounded border border-zinc-700/50 bg-zinc-800/50 px-2 py-0.5 text-zinc-500">
                  LinkedIn Profile
                </span>
                <span className="rounded border border-zinc-700/50 bg-zinc-800/50 px-2 py-0.5 text-zinc-500">
                  GitHub Repos
                </span>
                <span className="rounded border border-zinc-700/50 bg-zinc-800/50 px-2 py-0.5 text-zinc-500">
                  Portfolio Site
                </span>
              </div>

              {isAnalyzing && (
                <div className="flex flex-col items-center gap-3 py-8">
                  <div className="text-4xl animate-bounce">🤖</div>
                  <div className="flex items-center gap-2 font-mono text-sm text-indigo-400">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-500" />
                    Analyzing profile data...
                  </div>
                  <div className="font-mono text-[10px] text-zinc-600">
                    Scanning LinkedIn, GitHub repos, and portfolio...
                  </div>
                </div>
              )}

              {!isAnalyzing && (
                <div className="font-mono text-xs leading-relaxed text-zinc-300 whitespace-pre-line">
                  {displayedText}
                  {isTyping && <span className="inline-block h-3.5 w-1.5 animate-pulse bg-indigo-400 ml-0.5 align-middle" />}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-zinc-700/50 bg-[#161b22] px-4 py-2.5">
              <div className="flex gap-2">
                <a
                  href="https://www.linkedin.com/in/leonardootero/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border border-zinc-700/50 bg-zinc-800/50 px-3 py-1 font-mono text-[10px] text-zinc-400 transition-colors hover:border-blue-500/40 hover:text-blue-400"
                >
                  LinkedIn &rarr;
                </a>
                <a
                  href="https://github.com/oteroleonardogh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border border-zinc-700/50 bg-zinc-800/50 px-3 py-1 font-mono text-[10px] text-zinc-400 transition-colors hover:border-zinc-500/40 hover:text-zinc-300"
                >
                  GitHub &rarr;
                </a>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-md bg-zinc-800 px-3 py-1 font-mono text-xs text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
