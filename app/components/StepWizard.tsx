'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Loader2, Zap, Database, Search, Sparkles, ChevronRight, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { saveToHistory } from '@/lib/history'
import type { SourceConnection, LLMConnection, JiraTicketFields, GenerateResponse, ConnectionStatus, LLMProvider, SourceType } from '@/types'
import TicketPreview from './TicketPreview'
import TestPlanViewer from './TestPlanViewer'
import ExportButtons from './ExportButtons'

const STEPS = [
  { id: 1, label: 'LLM Connection',    icon: Zap },
  { id: 2, label: 'Source Connection', icon: Database },
  { id: 3, label: 'Fetch & Preview',   icon: Search },
  { id: 4, label: 'Generate Plan',     icon: Sparkles },
]

const LLM_MODELS: Record<LLMProvider, string[]> = {
  groq:   ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'openai/gpt-4o-mini', 'openai/gpt-oss-120b'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  ollama: ['llama3', 'llama3.1', 'mistral', 'codellama', 'phi3'],
  grok:   ['grok-beta', 'grok-vision-beta'],
}

interface Props {
  onGenerated?: () => void
}

export default function StepWizard({ onGenerated }: Props) {
  const [currentStep, setCurrentStep] = useState(1)

  // Step 1: LLM
  const [llmProvider, setLLMProvider] = useState<LLMProvider>('groq')
  const [llmApiKey, setLLMApiKey] = useState('')
  const [llmBaseUrl, setLLMBaseUrl] = useState('')
  const [llmModel, setLLMModel] = useState(LLM_MODELS.groq[0])
  const [llmStatus, setLLMStatus] = useState<ConnectionStatus>('idle')
  const [llmMsg, setLLMMsg] = useState('')
  const [llmConn, setLLMConn] = useState<LLMConnection | null>(null)

  // Step 2: Source
  const [sourceType, setSourceType] = useState<SourceType>('jira')
  const [baseUrl, setBaseUrl] = useState('')
  const [email, setEmail] = useState('')
  const [apiToken, setApiToken] = useState('')
  const [sourceStatus, setSourceStatus] = useState<ConnectionStatus>('idle')
  const [sourceMsg, setSourceMsg] = useState('')
  const [sourceConn, setSourceConn] = useState<SourceConnection | null>(null)

  // Step 3: Ticket
  const [ticketId, setTicketId] = useState('')
  const [additionalContext, setAdditionalContext] = useState('')
  const [fetchingTicket, setFetchingTicket] = useState(false)
  const [ticketFields, setTicketFields] = useState<JiraTicketFields | null>(null)
  const [fetchError, setFetchError] = useState('')

  // Step 4: Generate
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<GenerateResponse | null>(null)
  const [genError, setGenError] = useState('')

  // Load persisted connections from localStorage on mount
  useEffect(() => {
    try {
      const savedLLM = localStorage.getItem('atp_llm_conn')
      const savedSource = localStorage.getItem('atp_source_conn')
      if (savedLLM) {
        const conn: LLMConnection = JSON.parse(savedLLM)
        setLLMConn(conn)
        setLLMProvider(conn.provider)
        setLLMApiKey(conn.apiKey || '')
        setLLMBaseUrl(conn.baseUrl || '')
        setLLMModel(conn.model)
        setLLMStatus('success')
        setLLMMsg('Restored from previous session')
      }
      if (savedSource) {
        const conn: SourceConnection = JSON.parse(savedSource)
        setSourceConn(conn)
        setSourceType(conn.type)
        setBaseUrl(conn.baseUrl || '')
        setEmail(conn.email || '')
        setApiToken(conn.apiToken || '')
        setSourceStatus('success')
        setSourceMsg('Restored from previous session')
      }
      if (savedLLM && savedSource) {
        setCurrentStep(3)
        return // skip env auto-populate
      }
    } catch { /* ignore */ }

    // Auto-populate from env if no saved connections
    fetch('/api/config').then(r => r.json()).then(cfg => {
      if (cfg.jira.baseUrl) setBaseUrl(cfg.jira.baseUrl)
      if (cfg.jira.email) setEmail(cfg.jira.email)
      if (cfg.jira.apiToken) setApiToken(cfg.jira.apiToken)
      if (cfg.groq.apiKey) setLLMApiKey(cfg.groq.apiKey)
    }).catch(() => {})
  }, [])

  const [providerChangedByUser, setProviderChangedByUser] = useState(false)
  useEffect(() => {
    if (!providerChangedByUser) return
    fetch('/api/config').then(r => r.json()).then(cfg => {
      const keyMap: Record<LLMProvider, string> = { groq: cfg.groq?.apiKey || '', openai: cfg.openai?.apiKey || '', grok: cfg.grok?.apiKey || '', ollama: '' }
      setLLMApiKey(keyMap[llmProvider] || '')
      setLLMModel(LLM_MODELS[llmProvider][0])
      setLLMStatus('idle')
      setLLMMsg('')
    }).catch(() => { setLLMModel(LLM_MODELS[llmProvider][0]) })
  }, [llmProvider]) // eslint-disable-line react-hooks/exhaustive-deps

  async function testLLM() {
    setLLMStatus('testing')
    const conn = { provider: llmProvider, apiKey: llmApiKey, baseUrl: llmBaseUrl, model: llmModel }
    try {
      const res = await fetch('/api/test-connection', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'llm', connection: conn }) })
      const data = await res.json()
      setLLMStatus(data.ok ? 'success' : 'error')
      setLLMMsg(data.message)
      if (data.ok) { setLLMConn(conn); localStorage.setItem('atp_llm_conn', JSON.stringify(conn)) }
    } catch { setLLMStatus('error'); setLLMMsg('Network error') }
  }

  async function testSource() {
    setSourceStatus('testing')
    const conn = { type: sourceType, baseUrl, email, apiToken, projectKey: 'ATP' }
    try {
      const res = await fetch('/api/test-connection', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'source', connection: conn }) })
      const data = await res.json()
      setSourceStatus(data.ok ? 'success' : 'error')
      setSourceMsg(data.message)
      if (data.ok) { setSourceConn(conn); localStorage.setItem('atp_source_conn', JSON.stringify(conn)) }
    } catch { setSourceStatus('error'); setSourceMsg('Network error') }
  }

  function editConnections() {
    localStorage.removeItem('atp_llm_conn')
    localStorage.removeItem('atp_source_conn')
    setLLMConn(null); setSourceConn(null)
    setLLMStatus('idle'); setLLMMsg('')
    setSourceStatus('idle'); setSourceMsg('')
    setCurrentStep(1)
  }

  async function fetchTicket() {
    if (!ticketId.trim() || !sourceConn) return
    setFetchingTicket(true); setFetchError(''); setTicketFields(null)
    try {
      const res = await fetch('/api/jira', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticketId: ticketId.trim(), connection: sourceConn }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTicketFields(data.fields)
    } catch (err) { setFetchError(err instanceof Error ? err.message : 'Failed') }
    finally { setFetchingTicket(false) }
  }

  async function generatePlan() {
    if (!ticketFields || !llmConn) return
    setGenerating(true); setGenError('')
    try {
      const res = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticketFields, additionalContext, llmConnection: llmConn }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
      setCurrentStep(4)
      saveToHistory({
        id: `${data.ticketId}-${Date.now()}`,
        ...data,
        llmProvider: llmConn.provider,
        llmModel: llmConn.model,
        ticketSummary: ticketFields.summary,
      })
      onGenerated?.()
    } catch (err) { setGenError(err instanceof Error ? err.message : 'Failed') }
    finally { setGenerating(false) }
  }

  const StatusIcon = ({ status }: { status: ConnectionStatus }) => {
    if (status === 'testing') return <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#5B21B6' }} />
    if (status === 'success') return <CheckCircle className="w-4 h-4" style={{ color: '#4ade80' }} />
    if (status === 'error') return <XCircle className="w-4 h-4" style={{ color: '#5B21B6' }} />
    return null
  }

  return (
    <div className="space-y-6">
      {/* Step Progress Bar */}
      <div className="rounded-2xl p-5 shadow-sm" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between">
          {STEPS.map((step, idx) => {
            const Icon = step.icon
            const done = currentStep > step.id
            const active = currentStep === step.id
            return (
              <div key={step.id} className="flex items-center flex-1">
                <button
                  onClick={() => done && setCurrentStep(step.id)}
                  className={cn('flex flex-col items-center gap-1.5 group', done && 'cursor-pointer')}
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all"
                  style={done
                    ? { background: '#4ade80', borderColor: '#4ade80', color: '#fff' }
                    : active
                      ? { background: '#5B21B6', borderColor: '#5B21B6', color: '#fff', boxShadow: '0 0 0 4px rgba(91,33,182,0.18)' }
                      : { background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }
                  }>
                    {done ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className="text-xs font-semibold whitespace-nowrap"
                        style={{ color: active ? '#5B21B6' : done ? '#4ade80' : 'var(--text-secondary)' }}>
                    Step {step.id}
                  </span>
                  <span className="text-xs hidden sm:block whitespace-nowrap"
                        style={{ color: active ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: active ? 600 : 400 }}>
                    {step.label}
                  </span>
                </button>
                {idx < STEPS.length - 1 && (
                  <div className="flex-1 mx-3 transition-all rounded-full" style={{ height: '2px', background: currentStep > step.id ? '#5B21B6' : 'var(--border)' }} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Step 1: LLM Connection */}
      {currentStep === 1 && (
        <StepCard
          step={1}
          title="Connect your LLM"
          description="Choose an AI provider to power your test plan generation."
          icon={<Zap className="w-5 h-5" style={{ color: '#5B21B6' }} />}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Provider">
              <select value={llmProvider} onChange={e => { setProviderChangedByUser(true); setLLMProvider(e.target.value as LLMProvider) }} className={selectCls}>
                <option value="groq">Groq</option>
                <option value="openai">OpenAI</option>
                <option value="ollama">Ollama (Local)</option>
                <option value="grok">Grok (xAI)</option>
              </select>
            </Field>
            <Field label="Model">
              <select value={llmModel} onChange={e => setLLMModel(e.target.value)} className={selectCls}>
                {LLM_MODELS[llmProvider].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
            {llmProvider !== 'ollama' && (
              <Field label={<>API Key {llmApiKey && <span className="ml-1 text-green-500 text-xs">● from .env</span>}</>} className="md:col-span-2">
                <input type="password" value={llmApiKey} onChange={e => setLLMApiKey(e.target.value)} placeholder="••••••••••••" className={inputCls} />
              </Field>
            )}
            {llmProvider === 'ollama' && (
              <Field label="Base URL" className="md:col-span-2">
                <input value={llmBaseUrl} onChange={e => setLLMBaseUrl(e.target.value)} placeholder="http://localhost:11434" className={inputCls} />
              </Field>
            )}
          </div>
          {llmMsg && <StatusBanner status={llmStatus} message={llmMsg} />}
          <div className="flex gap-3 mt-2">
            <button onClick={testLLM} disabled={llmStatus === 'testing'} className={secondaryBtn}
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
              <StatusIcon status={llmStatus} />
              Test Connection
            </button>
            <button
              onClick={() => { if (llmConn) setCurrentStep(2) }}
              disabled={!llmConn}
              className={cn(primaryBtn, !llmConn && 'opacity-40 cursor-not-allowed')}
              style={{ background: '#5B21B6', boxShadow: '0 4px 14px rgba(91,33,182,0.35)' }}
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </StepCard>
      )}

      {/* Step 2: Source (Jira) Connection */}
      {currentStep === 2 && (
        <StepCard
          step={2}
          title="Connect your Source"
          description="Connect Jira, ADO, or X-Ray to fetch your ticket data."
          icon={<Database className="w-5 h-5" style={{ color: '#64748b' }} />}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Platform">
              <select value={sourceType} onChange={e => setSourceType(e.target.value as SourceType)} className={selectCls}>
                <option value="jira">Jira</option>
                <option value="ado">Azure DevOps</option>
                <option value="xray">X-Ray</option>
              </select>
            </Field>
            <Field label="Base URL">
              <input value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="https://yourorg.atlassian.net" className={inputCls} />
            </Field>
            <Field label="Email">
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" className={inputCls} />
            </Field>
            <Field label="API Token">
              <input type="password" value={apiToken} onChange={e => setApiToken(e.target.value)} placeholder="••••••••••••" className={inputCls} />
            </Field>
          </div>
          {sourceMsg && <StatusBanner status={sourceStatus} message={sourceMsg} />}
          <div className="flex gap-3 mt-2">
            <button onClick={() => setCurrentStep(1)} className={ghostBtn}
                    style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)', background: 'var(--bg-card)' }}>← Back</button>
            <button onClick={testSource} disabled={sourceStatus === 'testing'} className={secondaryBtn}
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
              <StatusIcon status={sourceStatus} />
              Test Connection
            </button>
            <button
              onClick={() => { if (sourceConn) setCurrentStep(3) }}
              disabled={!sourceConn}
              className={cn(primaryBtn, !sourceConn && 'opacity-40 cursor-not-allowed')}
              style={{ background: '#5B21B6', boxShadow: '0 4px 14px rgba(91,33,182,0.35)' }}
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </StepCard>
      )}

      {/* Edit Connections banner (steps 3 & 4) */}
      {(currentStep === 3 || currentStep === 4) && llmConn && sourceConn && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl text-sm"
             style={{ background: 'rgba(91,33,182,0.05)', border: '1px solid rgba(91,33,182,0.2)' }}>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" style={{ color: '#4ade80' }} />
            <span style={{ color: 'var(--text-secondary)' }}>
              Using <strong style={{ color: '#5B21B6' }}>{llmConn.provider}</strong> · <strong style={{ color: '#5B21B6' }}>{llmConn.model}</strong>
              &nbsp;|&nbsp; <strong style={{ color: '#64748b' }}>{sourceConn.type}</strong> connected
            </span>
          </div>
          <button onClick={editConnections}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{ background: 'var(--bg-card)', border: '1px solid rgba(91,33,182,0.25)', color: '#5B21B6' }}>
            <Pencil className="w-3.5 h-3.5" /> Edit Connections
          </button>
        </div>
      )}

      {/* Step 3: Fetch & Preview */}
      {currentStep === 3 && (
        <StepCard
          step={3}
          title="Fetch Ticket & Preview"
          description="Enter your ticket ID and review the fetched data before generating."
          icon={<Search className="w-5 h-5" style={{ color: '#E11D48' }} />}
        >
          <div className="flex gap-3">
            <input
              value={ticketId}
              onChange={e => setTicketId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchTicket()}
              placeholder="e.g. ATP-2"
              className={cn(inputCls, 'flex-1')}
            />
            <button onClick={fetchTicket} disabled={fetchingTicket || !ticketId.trim()} className={primaryBtn}
                    style={{ background: '#5B21B6', boxShadow: '0 4px 14px rgba(91,33,182,0.3)' }}>
              {fetchingTicket ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Fetch
            </button>
          </div>
          <Field label="Additional Context (optional)" className="mt-3">
            <textarea value={additionalContext} onChange={e => setAdditionalContext(e.target.value)} placeholder="Extra context for the AI..." rows={3} className={cn(inputCls, 'resize-none')} />
          </Field>
          {fetchError && <StatusBanner status="error" message={fetchError} />}
          {ticketFields && (
            <div className="mt-4 space-y-4">
              <TicketPreview fields={ticketFields} />
              {genError && <StatusBanner status="error" message={genError} />}
              <div className="flex gap-3">
                <button onClick={() => setCurrentStep(2)} className={ghostBtn}
                        style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)', background: 'var(--bg-card)' }}>← Back</button>
                <button onClick={generatePlan} disabled={generating} className={cn(primaryBtn, 'flex-1')}
                        style={{ background: 'linear-gradient(135deg, #5B21B6, #E11D48)', boxShadow: '0 4px 20px rgba(91,33,182,0.4)' }}>
                  {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4" /> Generate Test Plan</>}
                </button>
              </div>
            </div>
          )}
          {!ticketFields && (
            <div className="flex gap-3 mt-2">
              <button onClick={() => setCurrentStep(2)} className={ghostBtn} style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)', background: 'var(--bg-card)' }}>← Back</button>
            </div>
          )}
        </StepCard>
      )}

      {/* Step 4: Result */}
      {currentStep === 4 && result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button onClick={() => setCurrentStep(3)} className={ghostBtn} style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)', background: 'var(--bg-card)' }}>← Back</button>
            <ExportButtons testPlan={result.testPlan} ticketId={result.ticketId} generatedAt={result.generatedAt} />
          </div>
          <TestPlanViewer testPlan={result.testPlan} ticketId={result.ticketId} generatedAt={result.generatedAt} />
        </div>
      )}
    </div>
  )
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function StepCard({ step, title, description, icon, children }: { step: number; title: string; description: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-6 space-y-5 shadow-sm"
         style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
             style={{ background: 'rgba(91,33,182,0.08)', border: '1px solid rgba(91,33,182,0.18)' }}>
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: '#5B21B6' }}>Step {step}</p>
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{description}</p>
        </div>
      </div>
      <div className="pt-5 space-y-4" style={{ borderTop: '1px solid var(--border)' }}>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children, className }: { label: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      {children}
    </div>
  )
}

function StatusBanner({ status, message }: { status: ConnectionStatus | 'error'; message: string }) {
  const ok = status === 'success'
  return (
    <div className="flex items-center gap-2 text-sm px-3.5 py-2.5 rounded-xl"
         style={ok
           ? { background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.2)' }
           : { background: 'rgba(91,33,182,0.06)', border: '1px solid rgba(91,33,182,0.2)' }
         }>
      {ok
        ? <CheckCircle className="w-4 h-4 shrink-0" style={{ color: '#4ade80' }} />
        : <XCircle className="w-4 h-4 shrink-0" style={{ color: '#5B21B6' }} />}
      <span style={{ color: 'var(--text-secondary)' }}>{message}</span>
    </div>
  )
}

const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-[#CD0D32] focus:border-transparent [background:var(--bg-secondary)] [border:1px_solid_var(--border)] [color:var(--text-primary)] placeholder:text-[color:var(--text-secondary)]'
const selectCls = 'w-full rounded-lg px-3 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-[#CD0D32] focus:border-transparent [background:var(--bg-secondary)] [border:1px_solid_var(--border)] [color:var(--text-primary)]'
const primaryBtn = 'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 text-white active:scale-[0.98]'
const secondaryBtn = 'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40'
const ghostBtn = 'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors border'
