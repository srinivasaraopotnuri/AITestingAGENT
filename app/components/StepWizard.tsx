'use client'

import { useState, useEffect, useRef } from 'react'
import { CheckCircle, XCircle, Loader2, FileInput, Sparkles, Upload, PenLine } from 'lucide-react'
import { cn } from '@/lib/utils'
import { saveToHistory } from '@/lib/history'
import type { SourceConnection, LLMConnection, JiraTicketFields, GenerateResponse, ConnectionStatus, InputSourceType, ManualInput } from '@/types'
import TicketPreview from './TicketPreview'
import TestPlanViewer from './TestPlanViewer'
import ExportButtons from './ExportButtons'
import TestCaseGeneratorPanel from './TestCaseGeneratorPanel'

const TICKET_STEPS = [
  { id: 1, label: 'Fetch Ticket',  icon: FileInput },
  { id: 2, label: 'Generate Plan', icon: Sparkles  },
]
const DIRECT_STEPS = [
  { id: 1, label: 'Input',         icon: FileInput },
  { id: 2, label: 'Generate Plan', icon: Sparkles  },
]

interface Props {
  onGenerated?: () => void
  onNavToTestCases?: () => void
  inputMode: InputSourceType
  llmConn: LLMConnection | null
  sourceConn: SourceConnection | null
}

export default function StepWizard({ onGenerated, onNavToTestCases, inputMode, llmConn, sourceConn }: Props) {
  const [currentStep, setCurrentStep] = useState(1)
  const isTicketMode = inputMode === 'ticket'
  const STEPS = isTicketMode ? TICKET_STEPS : DIRECT_STEPS
  const lastStep = STEPS[STEPS.length - 1].id

  // Reset state when input mode changes
  useEffect(() => {
    setCurrentStep(1)
    setTicketFields(null)
    setManualInput(null)
    setUploadText('')
    setUploadName('')
    setResult(null)
    setGenError('')
    setFetchError('')
  }, [inputMode])

  // Ticket fetch (ticket mode)
  const [ticketId, setTicketId]             = useState('')
  const [ticketFields, setTicketFields]     = useState<JiraTicketFields | null>(null)
  const [fetchingTicket, setFetchingTicket] = useState(false)
  const [fetchError, setFetchError]         = useState('')

  // Upload / Manual (direct modes)
  const [manualInput, setManualInput] = useState<ManualInput | null>(null)
  const [uploadText, setUploadText]   = useState('')
  const [uploadName, setUploadName]   = useState('')

  // Additional context
  const [additionalContext, setAdditionalContext] = useState('')

  // Generate
  const [generating, setGenerating] = useState(false)
  const [result, setResult]         = useState<GenerateResponse | null>(null)
  const [genError, setGenError]     = useState('')

  async function fetchTicket() {
    if (!ticketId.trim() || !sourceConn) return
    setFetchingTicket(true); setFetchError(''); setTicketFields(null)
    try {
      const res  = await fetch('/api/jira', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticketId: ticketId.trim(), connection: sourceConn }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTicketFields(data.fields)
    } catch (err) { setFetchError(err instanceof Error ? err.message : 'Failed') }
    finally { setFetchingTicket(false) }
  }

  async function generatePlan() {
    if (!llmConn) return
    const fields: JiraTicketFields = ticketFields ?? {
      ticketId: 'MANUAL',
      summary:  uploadName || manualInput?.title || 'Manual Input',
      userStory: uploadText || manualInput?.description || '',
      prd: '',
      acceptanceCriteria: manualInput?.acceptanceCriteria || '',
      status: '', priority: '',
    }
    setGenerating(true); setGenError('')
    try {
      const res  = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticketFields: fields, additionalContext, llmConnection: llmConn }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
      setCurrentStep(lastStep)
      saveToHistory({ id: `${data.ticketId}-${Date.now()}`, ...data, llmProvider: llmConn.provider, llmModel: llmConn.model, ticketSummary: fields.summary })
      onGenerated?.()
    } catch (err) { setGenError(err instanceof Error ? err.message : 'Failed') }
    finally { setGenerating(false) }
  }

  const hasInput = !!(ticketFields || manualInput?.description || uploadText)

  return (
    <div className="space-y-6">

      {/* Step Progress Bar */}
      <div className="rounded-2xl p-5 shadow-sm" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between">
          {STEPS.map((step, idx) => {
            const Icon = step.icon
            const done   = currentStep > step.id
            const active = currentStep === step.id
            return (
              <div key={step.id} className="flex items-center flex-1">
                <button onClick={() => done && setCurrentStep(step.id)}
                        className={cn('flex flex-col items-center gap-1.5', done && 'cursor-pointer')}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all"
                       style={done
                         ? { background: '#4ade80', borderColor: '#4ade80', color: '#fff' }
                         : active
                           ? { background: '#5B21B6', borderColor: '#5B21B6', color: '#fff', boxShadow: '0 0 0 4px rgba(91,33,182,0.18)' }
                           : { background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }
                       }>
                    {done ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className="text-[10px] font-semibold"
                        style={{ color: active ? '#5B21B6' : done ? '#4ade80' : 'var(--text-secondary)' }}>
                    Step {step.id}
                  </span>
                  <span className="text-xs hidden sm:block whitespace-nowrap"
                        style={{ color: active ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: active ? 600 : 400 }}>
                    {step.label}
                  </span>
                </button>
                {idx < STEPS.length - 1 && (
                  <div className="flex-1 mx-3 rounded-full transition-all"
                       style={{ height: '2px', background: currentStep > step.id ? '#5B21B6' : 'var(--border)' }} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Warnings for missing config */}
      {!llmConn && (
        <div className="flex items-center gap-2 text-sm px-3.5 py-3 rounded-xl"
             style={{ background: 'rgba(225,29,72,0.06)', border: '1px solid rgba(225,29,72,0.2)' }}>
          <XCircle className="w-4 h-4 shrink-0" style={{ color: '#E11D48' }} />
          <span style={{ color: 'var(--text-secondary)' }}>
            Configure your <strong style={{ color: '#5B21B6' }}>LLM</strong> in the sidebar to continue.
          </span>
        </div>
      )}
      {isTicketMode && !sourceConn && llmConn && (
        <div className="flex items-center gap-2 text-sm px-3.5 py-3 rounded-xl"
             style={{ background: 'rgba(225,29,72,0.06)', border: '1px solid rgba(225,29,72,0.2)' }}>
          <XCircle className="w-4 h-4 shrink-0" style={{ color: '#E11D48' }} />
          <span style={{ color: 'var(--text-secondary)' }}>
            Configure your <strong style={{ color: '#5B21B6' }}>Jira / ADO source</strong> in the sidebar to continue.
          </span>
        </div>
      )}

      {/* ── Step 1 (Ticket mode): Fetch Ticket ─────────────────────────────────── */}
      {currentStep === 1 && isTicketMode && (
        <StepCard step={1} title="Fetch Ticket & Preview" description="Enter your ticket ID and review the data before generating."
                  icon={<FileInput className="w-5 h-5" style={{ color: '#E11D48' }} />}>
          <div className="flex gap-3">
            <input value={ticketId} onChange={e => setTicketId(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && fetchTicket()}
                   placeholder={sourceConn?.type === 'ado' ? 'e.g. 1234' : 'e.g. ATP-2'}
                   className={cn(inputCls, 'flex-1')} />
            <button onClick={fetchTicket} disabled={fetchingTicket || !ticketId.trim() || !sourceConn}
                    className={primaryBtn}
                    style={{ background: '#5B21B6', boxShadow: '0 4px 14px rgba(91,33,182,0.3)' }}>
              {fetchingTicket ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Fetch'}
            </button>
          </div>
          <Field label="Additional Context (optional)" className="mt-3">
            <textarea value={additionalContext} onChange={e => setAdditionalContext(e.target.value)}
                      placeholder="Extra context for the AI…" rows={2} className={cn(inputCls, 'resize-none')} />
          </Field>
          {fetchError && <StatusBanner status="error" message={fetchError} />}
          {ticketFields && <div className="mt-3"><TicketPreview fields={ticketFields} /></div>}
          {genError && <StatusBanner status="error" message={genError} />}
          <div className="flex gap-3 mt-2">
            <button onClick={generatePlan} disabled={generating || !ticketFields || !llmConn}
                    className={cn(primaryBtn, 'flex-1', (!ticketFields || generating || !llmConn) && 'opacity-40 cursor-not-allowed')}
                    style={{ background: 'linear-gradient(135deg, #5B21B6, #E11D48)', boxShadow: '0 4px 20px rgba(91,33,182,0.4)' }}>
              {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : <><Sparkles className="w-4 h-4" /> Generate Test Plan</>}
            </button>
          </div>
        </StepCard>
      )}

      {/* ── Step 1 (Direct modes): Upload / Manual ─────────────────────────────── */}
      {currentStep === 1 && !isTicketMode && (
        <StepCard step={1}
                  title={inputMode === 'upload' ? 'Upload File' : 'Enter Requirements'}
                  description={inputMode === 'upload' ? 'Upload a PDF, DOCX, TXT, or image file.' : 'Paste or type your user story and acceptance criteria.'}
                  icon={inputMode === 'upload'
                    ? <Upload className="w-5 h-5" style={{ color: '#5B21B6' }} />
                    : <PenLine className="w-5 h-5" style={{ color: '#5B21B6' }} />}>

          {inputMode === 'upload' && (
            <UploadZone onParsed={(text, name) => { setUploadText(text); setUploadName(name) }} />
          )}
          {inputMode === 'manual' && (
            <ManualForm onInput={input => setManualInput(input)} />
          )}

          <Field label="Additional Context (optional)" className="mt-3">
            <textarea value={additionalContext} onChange={e => setAdditionalContext(e.target.value)}
                      placeholder="Tech stack, constraints, known issues…" rows={2} className={cn(inputCls, 'resize-none')} />
          </Field>
          {genError && <StatusBanner status="error" message={genError} />}
          <div className="flex gap-3 mt-2">
            <button onClick={generatePlan} disabled={generating || !hasInput || !llmConn}
                    className={cn(primaryBtn, 'flex-1', (!hasInput || generating || !llmConn) && 'opacity-40 cursor-not-allowed')}
                    style={{ background: 'linear-gradient(135deg, #5B21B6, #E11D48)', boxShadow: '0 4px 20px rgba(91,33,182,0.4)' }}>
              {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : <><Sparkles className="w-4 h-4" /> Generate Test Plan</>}
            </button>
          </div>
        </StepCard>
      )}

      {/* ── Final Step: Result ─────────────────────────────────────────────────── */}
      {currentStep === lastStep && result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button onClick={() => setCurrentStep(1)} className={ghostBtn}
                    style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
              ← Back
            </button>
            <ExportButtons testPlan={result.testPlan} ticketId={result.ticketId} generatedAt={result.generatedAt} />
          </div>
          <TestPlanViewer testPlan={result.testPlan} ticketId={result.ticketId} generatedAt={result.generatedAt} />
          {llmConn && (
            <TestCaseGeneratorPanel
              ticketFields={ticketFields}
              manualInput={manualInput}
              additionalContext={additionalContext}
              llmConnection={llmConn}
              onViewDashboard={onNavToTestCases}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ── Upload Zone ────────────────────────────────────────────────────────────────
function UploadZone({ onParsed }: { onParsed: (text: string, name: string) => void }) {
  const [loading, setLoading]   = useState(false)
  const [status, setStatus]     = useState('')
  const [error, setError]       = useState('')
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    const ext  = file.name.split('.').pop()?.toLowerCase()
    const isImage = ['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')
    const allowed = ['pdf', 'docx', 'txt', 'png', 'jpg', 'jpeg', 'webp']
    if (!allowed.includes(ext || '')) { setError('Use PDF, DOCX, TXT, PNG, or JPG.'); return }

    setLoading(true); setError('')

    try {
      let text = ''
      if (isImage) {
        setStatus('Running OCR in browser…')
        const { createWorker } = await import('tesseract.js')
        const worker = await createWorker('eng', 1, { logger: () => {} })
        const { data } = await worker.recognize(file)
        await worker.terminate()
        text = data.text.trim()
      } else {
        setStatus(`Parsing ${file.name}…`)
        const form = new FormData()
        form.append('file', file)
        const res  = await fetch('/api/parse-document', { method: 'POST', body: form })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        text = data.text
      }
      if (!text) throw new Error('No text found in file')
      setStatus(`✓ ${file.name} — ${text.length.toLocaleString()} characters extracted`)
      onParsed(text, file.name.replace(/\.[^.]+$/, ''))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Parse failed'); setStatus('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div
        className={cn('flex flex-col items-center gap-3 rounded-xl p-8 text-center cursor-pointer transition-all', dragOver && 'scale-[1.01]')}
        style={{ border: `2px dashed ${dragOver ? '#5B21B6' : 'var(--border)'}`, background: dragOver ? 'rgba(91,33,182,0.05)' : 'var(--bg-secondary)' }}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
      >
        <input ref={inputRef} type="file" accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp" className="hidden"
               onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        {loading
          ? <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#5B21B6' }} />
          : <Upload className="w-8 h-8" style={{ color: '#5B21B6' }} />
        }
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {loading ? status : 'Drop file here or click to browse'}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>PDF · DOCX · TXT · PNG · JPG (max 20 MB)</p>
        </div>
      </div>
      {status && !loading && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', color: '#10B981' }}>{status}</p>}
      {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(225,29,72,0.07)', border: '1px solid rgba(225,29,72,0.2)', color: '#E11D48' }}>{error}</p>}
    </div>
  )
}

// ── Manual Form ────────────────────────────────────────────────────────────────
function ManualForm({ onInput }: { onInput: (i: ManualInput) => void }) {
  const [form, setForm] = useState<ManualInput>({ title: '', description: '', acceptanceCriteria: '', additionalContext: '' })
  function update(k: keyof ManualInput, v: string) {
    const next = { ...form, [k]: v }; setForm(next)
    if (next.title || next.description) onInput(next)
  }
  return (
    <div className="space-y-3">
      <Field label="Feature Title"><input value={form.title} onChange={e => update('title', e.target.value)} placeholder="e.g. User Login with MFA" className={inputCls} /></Field>
      <Field label="User Story / Description"><textarea value={form.description} onChange={e => update('description', e.target.value)} placeholder="As a user, I want to…" rows={4} className={cn(inputCls, 'resize-none')} /></Field>
      <Field label="Acceptance Criteria"><textarea value={form.acceptanceCriteria} onChange={e => update('acceptanceCriteria', e.target.value)} placeholder="Given… When… Then…" rows={3} className={cn(inputCls, 'resize-none')} /></Field>
    </div>
  )
}

// ── Small helpers ──────────────────────────────────────────────────────────────
function StepCard({ step, title, description, icon, children }: { step: number; title: string; description: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-6 space-y-5 shadow-sm" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
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
      <div className="pt-5 space-y-4" style={{ borderTop: '1px solid var(--border)' }}>{children}</div>
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
           : { background: 'rgba(225,29,72,0.06)', border: '1px solid rgba(225,29,72,0.2)' }
         }>
      {ok ? <CheckCircle className="w-4 h-4 shrink-0" style={{ color: '#4ade80' }} /> : <XCircle className="w-4 h-4 shrink-0" style={{ color: '#E11D48' }} />}
      <span style={{ color: 'var(--text-secondary)' }}>{message}</span>
    </div>
  )
}

const inputCls    = 'w-full rounded-lg px-3 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-[#5B21B6] focus:border-transparent [background:var(--bg-secondary)] [border:1px_solid_var(--border)] [color:var(--text-primary)] placeholder:text-[color:var(--text-secondary)]'
const primaryBtn  = 'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 text-white active:scale-[0.98]'
const ghostBtn    = 'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors border'
