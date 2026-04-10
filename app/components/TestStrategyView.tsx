'use client'

import { useState, useEffect, useRef } from 'react'
import { Star, Loader2, CheckCircle, Download, Trash2, Eye, Search, History } from 'lucide-react'
import { saveStrategy, loadStrategies, deleteStrategy } from '@/lib/strategyStorage'
import type { StrategyEntry } from '@/lib/strategyStorage'
import type { LLMConnection, TestStrategyResult } from '@/types'
import { cn } from '@/lib/utils'
import { FormattedContent } from '@/components/TestPlanViewer'

interface Props {
  llmConn: LLMConnection | null
  initialStrategy?: { strategy: TestStrategyResult; projectName: string; generatedAt: string } | null
  prefillFromPlan?: { projectName: string; scope: string } | null
}

const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-[#5B21B6]'
const inputStyle = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
}

export default function TestStrategyView({ llmConn, initialStrategy, prefillFromPlan }: Props) {
  const [activeTab, setActiveTab] = useState<'generated' | 'history'>(initialStrategy || prefillFromPlan ? 'generated' : 'generated')

  // Form state
  const [projectName, setProjectName]             = useState(initialStrategy?.projectName || '')
  const [scope, setScope]                         = useState('')
  const [techStack, setTechStack]                 = useState('')
  const [releaseType, setReleaseType]             = useState('Major Release')
  const [riskLevel, setRiskLevel]                 = useState('Medium')
  const [additionalContext, setAdditionalContext] = useState('')
  const [generating, setGenerating]               = useState(false)
  const [error, setError]                         = useState('')
  const [result, setResult]                       = useState<{
    strategy: TestStrategyResult; projectName: string; generatedAt: string
  } | null>(initialStrategy || null)

  // History state
  const [history, setHistory]   = useState<StrategyEntry[]>([])
  const [search, setSearch]     = useState('')

  const prefillRef = useRef<string | null>(null)

  // Load history when switching to history tab
  useEffect(() => {
    if (activeTab === 'history') setHistory(loadStrategies())
  }, [activeTab])

  // Auto-prefill and generate from plan
  useEffect(() => {
    if (!prefillFromPlan) return
    const key = prefillFromPlan.projectName
    if (prefillRef.current === key) return
    prefillRef.current = key
    setProjectName(prefillFromPlan.projectName)
    setScope(prefillFromPlan.scope)
    setResult(null)
    setActiveTab('generated')
    const timer = setTimeout(() => {
      generateWithValues(prefillFromPlan.projectName, prefillFromPlan.scope)
    }, 100)
    return () => clearTimeout(timer)
  }, [prefillFromPlan]) // eslint-disable-line react-hooks/exhaustive-deps

  async function generateWithValues(
    name: string, scopeVal: string,
    techStackVal = '', releaseTypeVal = 'Major Release',
    riskLevelVal = 'Medium', additionalCtx = '',
  ) {
    if (!llmConn || !name.trim()) return
    setGenerating(true)
    setError('')
    try {
      const res = await fetch('/api/generate-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: name, scope: scopeVal, techStack: techStackVal,
          releaseType: releaseTypeVal, riskLevel: riskLevelVal,
          additionalContext: additionalCtx, llmConnection: llmConn,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
      saveStrategy({
        id: `strat-${Date.now()}`,
        projectName: data.projectName,
        strategy: data.strategy,
        generatedAt: data.generatedAt,
        llmProvider: llmConn.provider,
        llmModel: llmConn.model,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  async function generate() {
    await generateWithValues(projectName, scope, techStack, releaseType, riskLevel, additionalContext)
  }

  async function exportDocx() {
    if (!result) return
    try {
      const res = await fetch('/api/export-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `test-strategy-${result.projectName.replace(/\s+/g, '-')}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      /* silently ignore */
    }
  }

  function handleViewHistory(entry: StrategyEntry) {
    setResult({ strategy: entry.strategy, projectName: entry.projectName, generatedAt: entry.generatedAt })
    setProjectName(entry.projectName)
    setActiveTab('generated')
  }

  function handleDeleteHistory(id: string) {
    deleteStrategy(id)
    setHistory(h => h.filter(e => e.id !== id))
  }

  const filteredHistory = history.filter(e =>
    !search || e.projectName.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 border-b" style={{ borderColor: 'var(--border)' }}>
        {([['generated', '⭐ Generated'], ['history', '🕓 History']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn('px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors',
              activeTab === key ? 'border-[#5B21B6] text-[#5B21B6]' : 'border-transparent')}
            style={{ color: activeTab === key ? '#5B21B6' : 'var(--text-secondary)' }}
          >{label}</button>
        ))}
      </div>

      {/* Generated tab */}
      {activeTab === 'generated' && (
        <div className="flex gap-6" style={{ minHeight: 0 }}>
          {/* Left Panel: Form */}
          <div className="shrink-0 flex flex-col gap-4" style={{ width: 380 }}>
            <div className="rounded-2xl overflow-hidden shadow-sm"
                 style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="px-5 py-4"
                   style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4" style={{ color: '#5B21B6' }} />
                  <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Test Strategy Generator</h2>
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Fill in the details to generate a comprehensive testing strategy
                </p>
              </div>

              <div className="px-5 py-5 space-y-4">
                {!llmConn && (
                  <div className="rounded-lg px-4 py-3 text-sm"
                       style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)', color: '#ca8a04' }}>
                    Configure LLM in the Configuration section first.
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                    Project Name *
                  </label>
                  <input value={projectName} onChange={e => setProjectName(e.target.value)}
                    placeholder="e.g. E-Commerce Platform" className={inputCls} style={inputStyle} />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                    Scope
                  </label>
                  <textarea value={scope} onChange={e => setScope(e.target.value)}
                    placeholder="Describe what is in scope for testing..." rows={3}
                    className={inputCls} style={{ ...inputStyle, resize: 'vertical' }} />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                    Tech Stack
                  </label>
                  <input value={techStack} onChange={e => setTechStack(e.target.value)}
                    placeholder="e.g. React, Node.js, PostgreSQL" className={inputCls} style={inputStyle} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                      Release Type
                    </label>
                    <select value={releaseType} onChange={e => setReleaseType(e.target.value)} className={inputCls} style={inputStyle}>
                      <option>Major Release</option>
                      <option>Minor Release</option>
                      <option>Hotfix</option>
                      <option>MVP Launch</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                      Risk Level
                    </label>
                    <select value={riskLevel} onChange={e => setRiskLevel(e.target.value)} className={inputCls} style={inputStyle}>
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                    Additional Context
                  </label>
                  <textarea value={additionalContext} onChange={e => setAdditionalContext(e.target.value)}
                    placeholder="Any special requirements, constraints, or context..." rows={2}
                    className={inputCls} style={{ ...inputStyle, resize: 'vertical' }} />
                </div>

                {error && (
                  <div className="rounded-lg px-3 py-2 text-sm"
                       style={{ background: 'rgba(225,29,72,0.08)', border: '1px solid rgba(225,29,72,0.2)', color: '#E11D48' }}>
                    {error}
                  </div>
                )}

                <button
                  onClick={generate}
                  disabled={generating || !llmConn || !projectName.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #5B21B6, #E11D48)', color: '#fff', boxShadow: '0 4px 14px rgba(91,33,182,0.35)' }}
                >
                  {generating
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating Strategy...</>
                    : <><Star className="w-4 h-4" /> Generate Strategy</>
                  }
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel: Output */}
          <div className="flex-1 min-w-0">
            {generating ? (
              <SkeletonLoader />
            ) : result ? (
              <StrategyOutput result={result} llmConn={llmConn} onExport={exportDocx} />
            ) : (
              <EmptyState />
            )}
          </div>
        </div>
      )}

      {/* History tab */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {history.length} strateg{history.length !== 1 ? 'ies' : 'y'} saved
            </p>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search strategies…"
                className="pl-8 pr-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#5B21B6]"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', width: 200 }}
              />
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <History className="w-10 h-10" style={{ color: 'var(--border)' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>No history yet</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Generated strategies will appear here</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredHistory.map(entry => (
                <div key={entry.id} className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl transition"
                     style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                         style={{ background: 'rgba(91,33,182,0.1)', border: '1px solid rgba(91,33,182,0.2)' }}>
                      <Star className="w-4 h-4" style={{ color: '#7C3AED' }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {entry.projectName}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {entry.llmProvider} · {entry.llmModel} · {new Date(entry.generatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => handleViewHistory(entry)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                      <Eye className="w-3 h-3" /> View
                    </button>
                    <button onClick={() => handleDeleteHistory(entry.id)}
                      className="p-1.5 rounded-lg transition"
                      style={{ color: 'var(--text-secondary)' }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full rounded-2xl"
         style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', minHeight: 400 }}>
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
           style={{ background: 'rgba(91,33,182,0.08)', border: '1px solid rgba(91,33,182,0.18)' }}>
        <Star className="w-7 h-7" style={{ color: '#5B21B6' }} />
      </div>
      <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
        No strategy generated yet
      </h3>
      <p className="text-sm text-center max-w-xs" style={{ color: 'var(--text-secondary)' }}>
        Fill in the project details and click Generate Strategy to create a comprehensive test strategy.
      </p>
    </div>
  )
}

function SkeletonLoader() {
  return (
    <div className="rounded-2xl overflow-hidden animate-pulse"
         style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="h-5 rounded w-1/3" style={{ background: 'var(--border)' }} />
        <div className="h-3 rounded w-1/4 mt-2" style={{ background: 'var(--border)' }} />
      </div>
      <div className="p-5 space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 rounded w-1/4" style={{ background: 'var(--border)' }} />
            <div className="h-12 rounded" style={{ background: 'var(--bg-secondary)' }} />
          </div>
        ))}
      </div>
    </div>
  )
}

function StrategyOutput({
  result, llmConn, onExport,
}: {
  result: { strategy: TestStrategyResult; projectName: string; generatedAt: string }
  llmConn: LLMConnection | null
  onExport: () => void
}) {
  const s = result.strategy

  const automationBars = [
    { label: 'Unit Tests',        pct: 80 },
    { label: 'Integration Tests', pct: 70 },
    { label: 'E2E Tests',         pct: 60 },
  ]

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm"
         style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>

      {/* Header */}
      <div className="px-5 py-4 flex items-start justify-between gap-4"
           style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4" style={{ color: '#10B981' }} />
            <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              {result.projectName}
            </h3>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Generated {new Date(result.generatedAt).toLocaleString()}
            {llmConn && <> · {llmConn.provider} / {llmConn.model}</>}
          </p>
        </div>
        <button
          onClick={onExport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0"
          style={{ background: 'rgba(91,33,182,0.08)', border: '1px solid rgba(91,33,182,0.2)', color: '#5B21B6' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(91,33,182,0.15)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(91,33,182,0.08)' }}
        >
          <Download className="w-3.5 h-3.5" />
          Export DOCX
        </button>
      </div>

      {/* Sections */}
      <div className="p-5 space-y-5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>

        <StrategySection title="Testing Objectives" accent="#5B21B6">
          <FormattedContent content={s.testingObjectives} />
        </StrategySection>

        <StrategySection title="Testing Types" accent="#0284c7">
          <div className="flex flex-wrap gap-2">
            {(Array.isArray(s.testingTypes) ? s.testingTypes : String(s.testingTypes || '').split(/,|\n/).filter(Boolean)).map((t, i) => (
              <span key={i} className="px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{ background: 'rgba(2,132,199,0.1)', color: '#0284c7', border: '1px solid rgba(2,132,199,0.2)' }}>
                {String(t).trim()}
              </span>
            ))}
          </div>
        </StrategySection>

        <StrategySection title="Tools & Frameworks" accent="#059669">
          <FormattedContent content={s.toolsAndFrameworks} />
        </StrategySection>

        <StrategySection title="Automation Approach" accent="#7C3AED">
          <div className="mb-3"><FormattedContent content={s.automationApproach} /></div>
          <div className="space-y-2">
            {automationBars.map(({ label, pct }) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                  <span>{label}</span><span>{pct}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                  <div className="h-full rounded-full transition-all"
                       style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #5B21B6, #7C3AED)' }} />
                </div>
              </div>
            ))}
          </div>
        </StrategySection>

        <StrategySection title="Risk Assessment" accent="#E11D48">
          <FormattedContent content={s.riskAssessment} />
        </StrategySection>

        <StrategySection title="Entry / Exit Criteria" accent="#ca8a04">
          <FormattedContent content={s.entryExitCriteria} />
        </StrategySection>

        <StrategySection title="Metrics & Reporting" accent="#0284c7">
          <FormattedContent content={s.metricsAndReporting} />
        </StrategySection>
      </div>
    </div>
  )
}

function StrategySection({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-4 rounded-full shrink-0" style={{ background: accent }} />
        <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: accent }}>{title}</h4>
      </div>
      {children}
    </div>
  )
}
