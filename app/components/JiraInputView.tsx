'use client'

import { useState } from 'react'
import { Database, CheckCircle, XCircle, Loader2, Sparkles, ChevronRight, Zap, Star, ClipboardList } from 'lucide-react'
import TicketPreview from './TicketPreview'
import TestPlanViewer from './TestPlanViewer'
import ExportButtons from './ExportButtons'
import { saveToHistory } from '@/lib/history'
import { saveTestCaseSet } from '@/lib/testCaseStorage'
import { saveStrategy } from '@/lib/strategyStorage'
import type {
  LLMConnection, SourceConnection, SourceType, ConnectionStatus,
  JiraTicketFields, TestPlanSections, TestCase, TestStrategyResult
} from '@/types'
import { cn } from '@/lib/utils'

type Step = 1 | 2 | 3

interface Props {
  llmConn: LLMConnection | null
  sourceConn: SourceConnection | null
  onSourceConnChange: (c: SourceConnection | null) => void
  onNavToTestPlan?: () => void
  onNavToTestCases?: () => void
  onNavToStrategy?: () => void
}

const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-[#5B21B6]'
const inputStyle = { background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }

export default function JiraInputView({ llmConn, sourceConn, onSourceConnChange, onNavToTestPlan, onNavToTestCases, onNavToStrategy }: Props) {
  const [step, setStep] = useState<Step>(sourceConn ? 2 : 1)

  // Step 1 — Source config
  const [platform, setPlatform] = useState<SourceType>(sourceConn?.type ?? 'jira')
  const [baseUrl, setBaseUrl]   = useState(sourceConn?.baseUrl ?? '')
  const [email, setEmail]       = useState(sourceConn?.email ?? '')
  const [apiToken, setApiToken] = useState(sourceConn?.apiToken ?? '')
  const [projectKey, setProjectKey] = useState(sourceConn?.projectKey ?? '')
  const [connStatus, setConnStatus] = useState<ConnectionStatus>('idle')
  const [connMsg, setConnMsg]   = useState('')

  // Step 2 — Fetch ticket
  const [ticketId, setTicketId]       = useState('')
  const [fetchStatus, setFetchStatus] = useState<'idle'|'loading'|'done'|'error'>('idle')
  const [fetchError, setFetchError]   = useState('')
  const [ticketFields, setTicketFields] = useState<JiraTicketFields | null>(null)
  const [additionalCtx, setAdditionalCtx] = useState('')

  // Step 3 — Generate
  const [generating, setGenerating]   = useState<'plan'|'cases'|'strategy'|null>(null)
  const [genError, setGenError]       = useState('')
  const [planResult, setPlanResult]   = useState<{ testPlan: TestPlanSections; ticketId: string; generatedAt: string } | null>(null)
  const [casesResult, setCasesResult] = useState<TestCase[] | null>(null)
  const [strategyResult, setStrategyResult] = useState<{ strategy: TestStrategyResult; projectName: string; generatedAt: string } | null>(null)

  async function testConnection() {
    if (!baseUrl || !apiToken) return
    setConnStatus('testing'); setConnMsg('')
    const conn: SourceConnection = { type: platform, baseUrl, apiToken, email, projectKey }
    try {
      const res = await fetch('/api/test-connection', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'source', connection: conn }) })
      const data = await res.json()
      if (data.ok) {
        setConnStatus('success'); setConnMsg(data.message || 'Connected successfully')
        onSourceConnChange(conn)
        localStorage.setItem('atp_source_conn', JSON.stringify(conn))
      } else {
        setConnStatus('error'); setConnMsg(data.message || 'Connection failed')
      }
    } catch {
      setConnStatus('error'); setConnMsg('Network error')
    }
  }

  async function fetchTicket() {
    if (!ticketId.trim() || !sourceConn) return
    setFetchStatus('loading'); setFetchError(''); setTicketFields(null)
    try {
      const res = await fetch('/api/jira', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticketId: ticketId.trim(), connection: sourceConn }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch')
      setTicketFields(data.fields); setFetchStatus('done')
    } catch (e: unknown) {
      setFetchStatus('error'); setFetchError(e instanceof Error ? e.message : 'Failed')
    }
  }

  async function generate(type: 'plan' | 'cases' | 'strategy') {
    if (!llmConn || !ticketFields) return
    setGenerating(type); setGenError(''); setPlanResult(null); setCasesResult(null); setStrategyResult(null)
    try {
      if (type === 'plan') {
        const res = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticketFields, additionalContext: additionalCtx, llmConnection: llmConn, templateSections: [] }) })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Generation failed')
        setPlanResult(data)
        saveToHistory({ id: crypto.randomUUID(), ...data, llmProvider: llmConn.provider, llmModel: llmConn.model, ticketSummary: ticketFields.summary })
      } else if (type === 'cases') {
        const res = await fetch('/api/generate-test-cases', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: 'ticket', ticketFields, additionalContext: additionalCtx, llmConnection: llmConn }) })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Generation failed')
        setCasesResult(data.cases)
        saveTestCaseSet({ id: crypto.randomUUID(), ticketId: ticketFields.ticketId, ticketSummary: ticketFields.summary, cases: data.cases, generatedAt: data.generatedAt, llmProvider: llmConn.provider, llmModel: llmConn.model })
      } else {
        const res = await fetch('/api/generate-strategy', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectName: ticketFields.summary, scope: ticketFields.userStory, techStack: '', releaseType: 'Major Release', riskLevel: 'Medium', additionalContext: additionalCtx, llmConnection: llmConn }) })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Generation failed')
        setStrategyResult(data)
        saveStrategy({ id: crypto.randomUUID(), projectName: data.projectName, strategy: data.strategy, generatedAt: data.generatedAt, llmProvider: llmConn.provider, llmModel: llmConn.model })
      }
    } catch (e: unknown) {
      setGenError(e instanceof Error ? e.message : 'Generation failed')
    } finally {
      setGenerating(null)
    }
  }

  const steps = [
    { num: 1, label: 'Connect Source', sub: sourceConn ? `${platform.toUpperCase()} · Connected` : 'Configure connection' },
    { num: 2, label: 'Fetch Ticket',   sub: ticketFields ? ticketFields.ticketId : 'Enter ticket ID' },
    { num: 3, label: 'Generate',       sub: 'Choose output type' },
  ]

  return (
    <div className="rounded-2xl overflow-hidden flex" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', minHeight: 480 }}>
      {/* Left steps */}
      <div className="w-48 flex-shrink-0 flex flex-col py-5" style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)' }}>
        {steps.map((s, i) => {
          const done   = s.num < step
          const active = s.num === step
          return (
            <div key={s.num} className="relative">
              {i < steps.length - 1 && (
                <div className="absolute left-8 top-12 w-0.5 h-8 z-0" style={{ background: done ? '#5B21B6' : 'var(--border)' }} />
              )}
              <button onClick={() => { if (done || active) setStep(s.num as Step) }}
                className={cn('relative z-10 w-full flex items-start gap-3 px-4 py-4 text-left transition', active && 'bg-[#5B21B6]/10')}
              >
                <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 border-2 transition',
                  done   ? 'bg-[#10B981] border-[#10B981] text-white' :
                  active ? 'bg-[#5B21B6] border-[#5B21B6] text-white shadow-[0_0_0_3px_rgba(91,33,182,0.2)]' :
                           'bg-transparent border-[var(--border)] text-[var(--text-secondary)]'
                )}>
                  {done ? '✓' : s.num}
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Step {s.num}</p>
                  <p className={cn('text-xs font-semibold', active ? 'text-[var(--text-primary)]' : done ? 'text-[#10B981]' : 'text-[var(--text-secondary)]')}>{s.label}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: done ? '#10B981' : 'var(--text-secondary)' }}>{s.sub}</p>
                </div>
              </button>
            </div>
          )
        })}
      </div>

      {/* Right content */}
      <div className="flex-1 p-6 overflow-y-auto">

        {/* No LLM warning */}
        {!llmConn && (
          <div className="mb-4 flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm"
            style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)', color: '#ca8a04' }}>
            ⚠ Configure your LLM in <strong className="mx-1">Configuration</strong> before generating.
          </div>
        )}

        {/* ── Step 1 ── */}
        {step === 1 && (
          <div>
            <h2 className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Connect Source</h2>
            <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>Configure your Jira or Azure DevOps connection</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="mb-3">
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>Platform</label>
                  <select value={platform} onChange={e => setPlatform(e.target.value as SourceType)} className={inputCls} style={inputStyle}>
                    <option value="jira">Jira (Cloud / Server)</option>
                    <option value="ado">Azure DevOps</option>
                    <option value="xray">X-Ray (Jira)</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>Base URL</label>
                  <input value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="https://yourorg.atlassian.net" className={inputCls} style={inputStyle} />
                </div>
                {platform === 'ado' && (
                  <div className="mb-3">
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>Project Name</label>
                    <input value={projectKey} onChange={e => setProjectKey(e.target.value)} placeholder="MyProject" className={inputCls} style={inputStyle} />
                  </div>
                )}
              </div>
              <div>
                {platform !== 'ado' && (
                  <div className="mb-3">
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email</label>
                    <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" className={inputCls} style={inputStyle} />
                  </div>
                )}
                <div className="mb-3">
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>API Token</label>
                  <input type="password" value={apiToken} onChange={e => setApiToken(e.target.value)} placeholder="Your API token" className={inputCls} style={inputStyle} />
                </div>
              </div>
            </div>

            {connStatus === 'success' && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-3" style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', color: '#10B981' }}>
                <CheckCircle className="w-4 h-4" /> {connMsg}
              </div>
            )}
            {connStatus === 'error' && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-3" style={{ background: 'rgba(225,29,72,0.07)', border: '1px solid rgba(225,29,72,0.2)', color: '#f87171' }}>
                <XCircle className="w-4 h-4" /> {connMsg}
              </div>
            )}

            <div className="flex gap-2 mt-2">
              <button onClick={testConnection} disabled={connStatus === 'testing' || !baseUrl || !apiToken}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                {connStatus === 'testing' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                Test Connection
              </button>
              <button onClick={() => { if (sourceConn || connStatus === 'success') setStep(2) }}
                disabled={!sourceConn && connStatus !== 'success'}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition"
                style={{ background: '#5B21B6', opacity: (!sourceConn && connStatus !== 'success') ? 0.5 : 1 }}>
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2 ── */}
        {step === 2 && (
          <div>
            <h2 className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Fetch Ticket</h2>
            <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>Enter your ticket ID to preview its content</p>

            <div className="flex gap-3 mb-4">
              <input value={ticketId} onChange={e => setTicketId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchTicket()}
                placeholder="e.g. ATP-7" className={cn(inputCls, 'flex-1')} style={inputStyle} />
              <button onClick={fetchTicket} disabled={fetchStatus === 'loading' || !ticketId.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: '#5B21B6', opacity: (!ticketId.trim() || fetchStatus === 'loading') ? 0.6 : 1 }}>
                {fetchStatus === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Fetch'}
              </button>
            </div>

            {fetchStatus === 'error' && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-4" style={{ background: 'rgba(225,29,72,0.07)', border: '1px solid rgba(225,29,72,0.2)', color: '#f87171' }}>
                <XCircle className="w-4 h-4" /> {fetchError}
              </div>
            )}

            {ticketFields && (
              <>
                <TicketPreview fields={ticketFields} />
                <div className="mt-4">
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>Additional Context (optional)</label>
                  <textarea value={additionalCtx} onChange={e => setAdditionalCtx(e.target.value)}
                    rows={2} placeholder="Extra context for the AI…" className={inputCls} style={inputStyle} />
                </div>
                <button onClick={() => setStep(3)}
                  className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                  style={{ background: '#5B21B6' }}>
                  Next → Choose Output <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        )}

        {/* ── Step 3 ── */}
        {step === 3 && (
          <div>
            <h2 className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Generate</h2>
            <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
              <span className="font-semibold" style={{ color: '#5B21B6' }}>{ticketFields?.ticketId}</span> is ready — choose what to generate
            </p>

            {genError && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-4" style={{ background: 'rgba(225,29,72,0.07)', border: '1px solid rgba(225,29,72,0.2)', color: '#f87171' }}>
                <XCircle className="w-4 h-4" /> {genError}
              </div>
            )}

            {/* Generate option cards */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {([
                { type: 'plan' as const,     icon: ClipboardList, label: 'Test Plan',     sub: '14-section structured test plan' },
                { type: 'cases' as const,    icon: Zap,           label: 'Test Cases',    sub: 'Detailed cases with steps & priority' },
                { type: 'strategy' as const, icon: Star,          label: 'Test Strategy', sub: 'High-level strategy & tools' },
              ]).map(opt => (
                <div key={opt.type} className="rounded-xl p-4 text-center" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                  <opt.icon className="w-6 h-6 mx-auto mb-2" style={{ color: '#7C3AED' }} />
                  <p className="text-sm font-700 font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{opt.label}</p>
                  <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>{opt.sub}</p>
                  <button onClick={() => generate(opt.type)} disabled={!!generating || !llmConn}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-white transition"
                    style={{ background: generating === opt.type ? '#7C3AED' : 'linear-gradient(135deg,#5B21B6,#E11D48)', opacity: (!llmConn || (!!generating && generating !== opt.type)) ? 0.5 : 1 }}>
                    {generating === opt.type ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</> : <><Sparkles className="w-3.5 h-3.5" /> Generate</>}
                  </button>
                </div>
              ))}
            </div>

            {/* Inline preview — Test Plan */}
            {planResult && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Test Plan Preview</p>
                  <ExportButtons testPlan={planResult.testPlan} ticketId={planResult.ticketId} generatedAt={planResult.generatedAt} />
                </div>
                <TestPlanViewer testPlan={planResult.testPlan} ticketId={planResult.ticketId} generatedAt={planResult.generatedAt} />
              </div>
            )}

            {/* Inline preview — Test Cases */}
            {casesResult && casesResult.length > 0 && (
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between px-4 py-3" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{casesResult.length} Test Cases Generated</p>
                  <button onClick={onNavToTestCases} className="text-xs font-semibold px-3 py-1 rounded-lg" style={{ background: 'rgba(91,33,182,0.1)', color: '#7C3AED' }}>
                    View in Test Case Generator →
                  </button>
                </div>
                <table className="w-full">
                  <thead><tr style={{ background: 'var(--bg-secondary)' }}>
                    {['ID','Title','Type','Priority','Status'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {casesResult.slice(0,8).map(tc => (
                      <tr key={tc.id} style={{ borderTop: '1px solid var(--border)' }}>
                        <td className="px-3 py-2 text-xs font-semibold" style={{ color: '#7C3AED' }}>{tc.id}</td>
                        <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-primary)', maxWidth: 220 }}><span className="line-clamp-1">{tc.title}</span></td>
                        <td className="px-3 py-2"><PriorityBadge label={tc.type} /></td>
                        <td className="px-3 py-2"><PriorityBadge label={tc.priority} /></td>
                        <td className="px-3 py-2"><PriorityBadge label={tc.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Inline preview — Strategy */}
            {strategyResult && (
              <StrategyInlinePreview result={strategyResult} onNav={onNavToStrategy} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function PriorityBadge({ label }: { label: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    Critical:     { bg: 'rgba(225,29,72,0.12)',   color: '#f87171' },
    High:         { bg: 'rgba(249,115,22,0.12)',  color: '#fb923c' },
    Medium:       { bg: 'rgba(234,179,8,0.12)',   color: '#ca8a04' },
    Low:          { bg: 'rgba(16,185,129,0.12)',  color: '#10B981' },
    Functional:   { bg: 'rgba(91,33,182,0.12)',   color: '#a78bfa' },
    Negative:     { bg: 'rgba(225,29,72,0.1)',    color: '#fca5a5' },
    'Edge Case':  { bg: 'rgba(234,179,8,0.1)',    color: '#fde047' },
    Draft:        { bg: 'rgba(139,139,160,0.12)', color: '#8b8ba0' },
    Passed:       { bg: 'rgba(16,185,129,0.12)',  color: '#10B981' },
    Failed:       { bg: 'rgba(225,29,72,0.12)',   color: '#f87171' },
  }
  const c = colors[label] ?? { bg: 'rgba(139,139,160,0.12)', color: '#8b8ba0' }
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={c}>{label}</span>
}

function StrategyInlinePreview({ result, onNav }: { result: { strategy: TestStrategyResult; projectName: string; generatedAt: string }, onNav?: () => void }) {
  const s = result.strategy
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Test Strategy — {result.projectName}</p>
        {onNav && <button onClick={onNav} className="text-xs font-semibold px-3 py-1 rounded-lg" style={{ background: 'rgba(91,33,182,0.1)', color: '#7C3AED' }}>View in Strategy Generator →</button>}
      </div>
      <div className="p-4 space-y-3">
        <StrategySection title="Testing Objectives" body={s.testingObjectives} />
        <StrategySection title="Tools & Frameworks" body={s.toolsAndFrameworks} />
        <StrategySection title="Risk Assessment" body={s.riskAssessment} />
      </div>
    </div>
  )
}

function StrategySection({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#7C3AED' }}>{title}</p>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{body}</p>
    </div>
  )
}
