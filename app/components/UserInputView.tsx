'use client'

import { useState, useRef } from 'react'
import { Upload, PenLine, CheckCircle, XCircle, Loader2, Sparkles, ChevronRight, Zap, Star, ClipboardList, FileText } from 'lucide-react'
import TestPlanViewer from './TestPlanViewer'
import ExportButtons from './ExportButtons'
import { saveToHistory } from '@/lib/history'
import { saveTestCaseSet } from '@/lib/testCaseStorage'
import { saveStrategy } from '@/lib/strategyStorage'
import type { LLMConnection, TestPlanSections, TestCase, TestStrategyResult, ManualInput } from '@/types'
import { cn } from '@/lib/utils'

type Step = 1 | 2 | 3
type InputType = 'upload' | 'manual'

interface Props {
  llmConn: LLMConnection | null
  onNavToTestCases?: () => void
  onNavToStrategy?: () => void
}

const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-[#5B21B6]'
const inputStyle = { background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }

export default function UserInputView({ llmConn, onNavToTestCases, onNavToStrategy }: Props) {
  const [step, setStep]           = useState<Step>(1)
  const [inputType, setInputType] = useState<InputType>('upload')

  // Upload state
  const [uploadedText, setUploadedText]   = useState('')
  const [uploadedFile, setUploadedFile]   = useState('')
  const [uploading, setUploading]         = useState(false)
  const [uploadError, setUploadError]     = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Manual state
  const [title, setTitle]               = useState('')
  const [description, setDescription]   = useState('')
  const [acceptance, setAcceptance]     = useState('')
  const [additionalCtx, setAdditionalCtx] = useState('')

  // Generate state
  const [caseCount, setCaseCount]       = useState(10)
  const [generating, setGenerating]     = useState<'plan'|'cases'|'strategy'|null>(null)
  const [genError, setGenError]         = useState('')
  const [planResult, setPlanResult]     = useState<{ testPlan: TestPlanSections; ticketId: string; generatedAt: string } | null>(null)
  const [casesResult, setCasesResult]   = useState<TestCase[] | null>(null)
  const [strategyResult, setStrategyResult] = useState<{ strategy: TestStrategyResult; projectName: string; generatedAt: string } | null>(null)

  async function handleFile(file: File) {
    setUploading(true); setUploadError(''); setUploadedText(''); setUploadedFile('')
    try {
      const isImage = file.type.startsWith('image/')
      if (isImage) {
        const { createWorker } = await import('tesseract.js')
        const worker = await createWorker('eng')
        const { data: { text } } = await worker.recognize(file)
        await worker.terminate()
        setUploadedText(text); setUploadedFile(file.name)
      } else {
        const formData = new FormData(); formData.append('file', file)
        const res = await fetch('/api/parse-document', { method: 'POST', body: formData })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to parse file')
        setUploadedText(data.text); setUploadedFile(file.name)
      }
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : 'Failed to parse file')
    } finally {
      setUploading(false)
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function canProceedStep2() {
    if (inputType === 'upload') return !!uploadedText
    return !!title.trim() && !!description.trim()
  }

  function buildManualInput(): ManualInput {
    return { title, description, acceptanceCriteria: acceptance, additionalContext: additionalCtx }
  }

  async function generate(type: 'plan' | 'cases' | 'strategy') {
    if (!llmConn) return
    setGenerating(type); setGenError(''); setPlanResult(null); setCasesResult(null); setStrategyResult(null)

    const isManual = inputType === 'manual'
    const manualInput = buildManualInput()
    const fakeTicketId = isManual ? (title.slice(0, 20) || 'Manual') : (uploadedFile || 'Uploaded')

    // Build a fake ticketFields from text/manual for the API
    const ticketFields = {
      ticketId: fakeTicketId,
      summary: isManual ? title : uploadedFile,
      userStory: isManual ? description : uploadedText.slice(0, 2000),
      prd: '',
      acceptanceCriteria: isManual ? acceptance : '',
      status: 'Open',
      priority: 'Medium',
    }

    try {
      if (type === 'plan') {
        const res = await fetch('/api/generate', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticketFields, additionalContext: additionalCtx, llmConnection: llmConn, templateSections: [] })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Generation failed')
        setPlanResult(data)
        saveToHistory({ id: crypto.randomUUID(), ...data, llmProvider: llmConn.provider, llmModel: llmConn.model, ticketSummary: ticketFields.summary })
      } else if (type === 'cases') {
        const res = await fetch('/api/generate-test-cases', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: 'manual', manualInput: isManual ? manualInput : { title: uploadedFile, description: uploadedText, acceptanceCriteria: '', additionalContext: additionalCtx }, additionalContext: additionalCtx, llmConnection: llmConn, count: caseCount })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Generation failed')
        setCasesResult(data.cases)
        saveTestCaseSet({ id: crypto.randomUUID(), ticketId: fakeTicketId, ticketSummary: ticketFields.summary, cases: data.cases, generatedAt: data.generatedAt, llmProvider: llmConn.provider, llmModel: llmConn.model })
      } else {
        const res = await fetch('/api/generate-strategy', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectName: ticketFields.summary, scope: ticketFields.userStory.slice(0, 500), techStack: '', releaseType: 'Major Release', riskLevel: 'Medium', additionalContext: additionalCtx, llmConnection: llmConn })
        })
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
    { num: 1, label: 'Choose Type',  sub: step > 1 ? (inputType === 'upload' ? 'Upload File' : 'Manual Input') : 'Upload or manual' },
    { num: 2, label: 'Enter Input',  sub: step > 2 ? 'Input ready' : 'Provide requirements' },
    { num: 3, label: 'Generate',     sub: 'Choose output type' },
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
              <button onClick={() => done || active ? setStep(s.num as Step) : undefined}
                className={cn('relative z-10 w-full flex items-start gap-3 px-4 py-4 text-left transition', active && 'bg-[#5B21B6]/10')}>
                <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 border-2 transition',
                  done   ? 'bg-[#10B981] border-[#10B981] text-white' :
                  active ? 'bg-[#5B21B6] border-[#5B21B6] text-white shadow-[0_0_0_3px_rgba(91,33,182,0.2)]' :
                           'bg-transparent border-[var(--border)]'
                )} style={{ color: done || active ? undefined : 'var(--text-secondary)' }}>
                  {done ? '✓' : s.num}
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Step {s.num}</p>
                  <p className={cn('text-xs font-semibold')} style={{ color: active ? 'var(--text-primary)' : done ? '#10B981' : 'var(--text-secondary)' }}>{s.label}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: done ? '#10B981' : 'var(--text-secondary)' }}>{s.sub}</p>
                </div>
              </button>
            </div>
          )
        })}
      </div>

      {/* Right content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {!llmConn && (
          <div className="mb-4 flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm"
            style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)', color: '#ca8a04' }}>
            ⚠ Configure your LLM in <strong className="mx-1">Configuration</strong> before generating.
          </div>
        )}

        {/* ── Step 1 ── */}
        {step === 1 && (
          <div>
            <h2 className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Choose Input Type</h2>
            <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>How will you provide your requirements?</p>
            <div className="grid grid-cols-2 gap-4 max-w-lg mb-6">
              {([
                { type: 'upload' as const, icon: Upload,  label: 'Upload File',    sub: 'PDF, DOCX, TXT or image' },
                { type: 'manual' as const, icon: PenLine, label: 'Manual Input',   sub: 'Type or paste requirements' },
              ]).map(opt => (
                <button key={opt.type} onClick={() => setInputType(opt.type)}
                  className="flex flex-col items-center gap-3 p-6 rounded-xl text-center transition cursor-pointer"
                  style={{
                    background: inputType === opt.type ? 'rgba(91,33,182,0.06)' : 'var(--bg-secondary)',
                    border: `2px solid ${inputType === opt.type ? '#5B21B6' : 'var(--border)'}`,
                  }}>
                  <opt.icon className="w-7 h-7" style={{ color: inputType === opt.type ? '#5B21B6' : 'var(--text-secondary)' }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{opt.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{opt.sub}</p>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setStep(2)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: '#5B21B6' }}>
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Step 2 ── */}
        {step === 2 && (
          <div>
            <h2 className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              {inputType === 'upload' ? 'Upload File' : 'Manual Input'}
            </h2>
            <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
              {inputType === 'upload' ? 'Upload a document to extract requirements' : 'Type your requirements below'}
            </p>

            {inputType === 'upload' ? (
              <>
                <div
                  onDrop={onDrop} onDragOver={e => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl flex flex-col items-center justify-center gap-3 p-10 cursor-pointer transition mb-4"
                  style={{ border: `2px dashed ${uploadedText ? '#10B981' : 'var(--border)'}`, background: 'var(--bg-secondary)' }}>
                  <input ref={fileInputRef} type="file" className="hidden"
                    accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp"
                    onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                  {uploading ? (
                    <><Loader2 className="w-8 h-8 animate-spin" style={{ color: '#5B21B6' }} /><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Parsing file…</p></>
                  ) : uploadedText ? (
                    <><CheckCircle className="w-8 h-8" style={{ color: '#10B981' }} /><p className="text-sm font-semibold" style={{ color: '#10B981' }}>{uploadedFile} — parsed successfully</p><p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{uploadedText.length.toLocaleString()} characters extracted · Click to replace</p></>
                  ) : (
                    <><FileText className="w-8 h-8" style={{ color: 'var(--text-secondary)' }} /><p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Drop file here or click to browse</p><p className="text-xs" style={{ color: 'var(--text-secondary)' }}>PDF · DOCX · TXT · PNG · JPG — max 20 MB</p></>
                  )}
                </div>
                {uploadError && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-3" style={{ background: 'rgba(225,29,72,0.07)', border: '1px solid rgba(225,29,72,0.2)', color: '#f87171' }}>
                    <XCircle className="w-4 h-4" /> {uploadError}
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-3 max-w-2xl">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>Feature Title *</label>
                  <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. User Login with MFA" className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>User Story / Description *</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="As a user, I want to…" className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>Acceptance Criteria</label>
                  <textarea value={acceptance} onChange={e => setAcceptance(e.target.value)} rows={3} placeholder="Given… When… Then…" className={inputCls} style={inputStyle} />
                </div>
              </div>
            )}

            <div className="mt-4 max-w-2xl">
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>Additional Context (optional)</label>
              <textarea value={additionalCtx} onChange={e => setAdditionalCtx(e.target.value)} rows={2} placeholder="Tech stack, constraints, known issues…" className={inputCls} style={inputStyle} />
            </div>

            <button onClick={() => setStep(3)} disabled={!canProceedStep2()}
              className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition"
              style={{ background: '#5B21B6', opacity: canProceedStep2() ? 1 : 0.4 }}>
              Next → Choose Output <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Step 3 ── */}
        {step === 3 && (
          <div>
            <h2 className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Generate</h2>
            <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
              {inputType === 'upload' ? `${uploadedFile} is ready` : `"${title}" is ready`} — choose what to generate
            </p>

            {genError && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-4" style={{ background: 'rgba(225,29,72,0.07)', border: '1px solid rgba(225,29,72,0.2)', color: '#f87171' }}>
                <XCircle className="w-4 h-4" /> {genError}
              </div>
            )}

            {/* Count selector for Test Cases */}
            <div className="flex items-center gap-2 mb-3">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Test Cases Count</label>
              <select value={caseCount} onChange={e => setCaseCount(Number(e.target.value))}
                className="rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#5B21B6]"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                {[5, 10, 15, 20, 25].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>(applies to Test Cases only)</span>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {([
                { type: 'plan' as const,     icon: ClipboardList, label: 'Test Plan',     sub: '14-section structured test plan' },
                { type: 'cases' as const,    icon: Zap,           label: 'Test Cases',    sub: `${caseCount} Gherkin BDD test cases` },
                { type: 'strategy' as const, icon: Star,          label: 'Test Strategy', sub: 'High-level strategy & tools' },
              ]).map(opt => (
                <div key={opt.type} className="rounded-xl p-4 text-center" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                  <opt.icon className="w-6 h-6 mx-auto mb-2" style={{ color: '#7C3AED' }} />
                  <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{opt.label}</p>
                  <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>{opt.sub}</p>
                  <button onClick={() => generate(opt.type)} disabled={!!generating || !llmConn}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-white"
                    style={{ background: generating === opt.type ? '#7C3AED' : 'linear-gradient(135deg,#5B21B6,#E11D48)', opacity: (!llmConn || (!!generating && generating !== opt.type)) ? 0.5 : 1 }}>
                    {generating === opt.type ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</> : <><Sparkles className="w-3.5 h-3.5" /> Generate</>}
                  </button>
                </div>
              ))}
            </div>

            {planResult && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Test Plan Preview</p>
                  <ExportButtons testPlan={planResult.testPlan} ticketId={planResult.ticketId} generatedAt={planResult.generatedAt} />
                </div>
                <TestPlanViewer testPlan={planResult.testPlan} ticketId={planResult.ticketId} generatedAt={planResult.generatedAt} />
              </div>
            )}

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
                        <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-primary)', maxWidth: 200 }}>{tc.title}</td>
                        <td className="px-3 py-2"><Badge label={tc.type} /></td>
                        <td className="px-3 py-2"><Badge label={tc.priority} /></td>
                        <td className="px-3 py-2"><Badge label={tc.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {strategyResult && (
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between px-4 py-3" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Test Strategy — {strategyResult.projectName}</p>
                  <button onClick={onNavToStrategy} className="text-xs font-semibold px-3 py-1 rounded-lg" style={{ background: 'rgba(91,33,182,0.1)', color: '#7C3AED' }}>
                    View in Strategy Generator →
                  </button>
                </div>
                <div className="p-4 space-y-3">
                  <StratSec title="Testing Objectives" body={strategyResult.strategy.testingObjectives} />
                  <StratSec title="Tools & Frameworks"  body={strategyResult.strategy.toolsAndFrameworks} />
                  <StratSec title="Risk Assessment"     body={strategyResult.strategy.riskAssessment} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Badge({ label }: { label: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    Critical: { bg: 'rgba(225,29,72,0.12)',  color: '#f87171' },
    High:     { bg: 'rgba(249,115,22,0.12)', color: '#fb923c' },
    Medium:   { bg: 'rgba(234,179,8,0.12)',  color: '#ca8a04' },
    Low:      { bg: 'rgba(16,185,129,0.12)', color: '#10B981' },
    Passed:   { bg: 'rgba(16,185,129,0.12)', color: '#10B981' },
    Failed:   { bg: 'rgba(225,29,72,0.12)',  color: '#f87171' },
    Draft:    { bg: 'rgba(139,139,160,0.15)',color: '#8b8ba0' },
  }
  const c = map[label] ?? { bg: 'rgba(139,139,160,0.12)', color: '#8b8ba0' }
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap" style={c}>{label}</span>
}

function StratSec({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#7C3AED' }}>{title}</p>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{body}</p>
    </div>
  )
}
