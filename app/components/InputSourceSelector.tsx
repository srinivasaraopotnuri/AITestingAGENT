'use client'

import { useState, useRef } from 'react'
import { Ticket, Upload, PenLine, Loader2, FileText, Image, AlertCircle, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { InputSourceType, ManualInput, JiraTicketFields, SourceConnection } from '@/types'

interface Props {
  sourceConn: SourceConnection | null
  onTicketFetched: (fields: JiraTicketFields) => void
  onManualInput: (input: ManualInput) => void
  inputMode: InputSourceType
  onModeChange: (mode: InputSourceType) => void
}

const TABS: { key: InputSourceType; label: string; icon: React.ElementType }[] = [
  { key: 'ticket', label: 'Ticket (Jira / ADO)', icon: Ticket },
  { key: 'upload', label: 'Upload File',          icon: Upload },
  { key: 'manual', label: 'Manual Input',         icon: PenLine },
]

const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-[#5B21B6] focus:border-transparent [background:var(--bg-secondary)] [border:1px_solid_var(--border)] [color:var(--text-primary)] placeholder:text-[color:var(--text-secondary)]'

export default function InputSourceSelector({ sourceConn, onTicketFetched, onManualInput, inputMode, onModeChange }: Props) {
  return (
    <div className="space-y-4">
      {/* Tab Bar */}
      <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onModeChange(key)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-all',
              inputMode === key
                ? 'text-white'
                : 'hover:opacity-80'
            )}
            style={inputMode === key
              ? { background: '#5B21B6', color: '#fff' }
              : { color: 'var(--text-secondary)' }
            }
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {inputMode === 'ticket'  && <TicketTab sourceConn={sourceConn} onFetched={onTicketFetched} />}
      {inputMode === 'upload'  && <UploadTab onParsed={onManualInput} />}
      {inputMode === 'manual'  && <ManualTab onInput={onManualInput} />}
    </div>
  )
}

// ── Ticket Tab ─────────────────────────────────────────────────────────────────
function TicketTab({ sourceConn, onFetched }: { sourceConn: SourceConnection | null; onFetched: (f: JiraTicketFields) => void }) {
  const [ticketId, setTicketId] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function fetchTicket() {
    if (!ticketId.trim() || !sourceConn) return
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/jira', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: ticketId.trim(), connection: sourceConn }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onFetched(data.fields)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fetch failed')
    } finally {
      setLoading(false)
    }
  }

  if (!sourceConn) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
           style={{ background: 'rgba(91,33,182,0.06)', border: '1px solid rgba(91,33,182,0.2)', color: 'var(--text-secondary)' }}>
        <AlertCircle className="w-4 h-4 shrink-0" style={{ color: '#5B21B6' }} />
        Complete Steps 1 &amp; 2 first to configure your source connection.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={ticketId}
          onChange={e => setTicketId(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetchTicket()}
          placeholder={sourceConn.type === 'ado' ? 'e.g. 1234' : 'e.g. ATP-2'}
          className={cn(inputCls, 'flex-1')}
        />
        <button
          onClick={fetchTicket}
          disabled={loading || !ticketId.trim()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-40"
          style={{ background: '#5B21B6', boxShadow: '0 4px 14px rgba(91,33,182,0.3)' }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Fetch
        </button>
      </div>
      {error && (
        <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(225,29,72,0.07)', border: '1px solid rgba(225,29,72,0.2)', color: '#E11D48' }}>
          {error}
        </p>
      )}
    </div>
  )
}

// ── Upload Tab ─────────────────────────────────────────────────────────────────
function UploadTab({ onParsed }: { onParsed: (input: ManualInput) => void }) {
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [status, setStatus]     = useState('')
  const [error, setError]       = useState('')
  const [parsedText, setParsedText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase()
    const isImage = ['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')
    const allowed = ['docx', 'pdf', 'txt', 'png', 'jpg', 'jpeg', 'webp']
    if (!allowed.includes(ext || '')) {
      setError('Unsupported format. Use PDF, DOCX, TXT, PNG, or JPG.')
      return
    }

    setLoading(true); setError('')

    try {
      let extractedText = ''

      if (isImage) {
        // Run OCR in the browser — no server memory needed
        setStatus('Running OCR in browser… (first run downloads ~10 MB)')
        const { createWorker } = await import('tesseract.js')
        const worker = await createWorker('eng', 1, { logger: () => {} })
        const { data } = await worker.recognize(file)
        await worker.terminate()
        extractedText = data.text.trim()
        setStatus(`OCR complete · ${extractedText.length} characters extracted`)
      } else {
        // PDF / DOCX / TXT — server-side parsing
        setStatus(`Parsing ${file.name}…`)
        const form = new FormData()
        form.append('file', file)
        const res = await fetch('/api/parse-document', { method: 'POST', body: form })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        extractedText = data.text
        setStatus(`Extracted from ${ext!.toUpperCase()} · ${extractedText.length} characters`)
      }

      if (!extractedText) throw new Error('No text found in file')

      setParsedText(extractedText)
      onParsed({
        title: file.name.replace(/\.[^.]+$/, ''),
        description: extractedText,
        acceptanceCriteria: '',
        additionalContext: '',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Parse failed')
      setStatus('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div
        className={cn('flex flex-col items-center justify-center gap-3 rounded-xl p-8 text-center cursor-pointer transition-all', dragOver && 'scale-[1.01]')}
        style={{
          border: `2px dashed ${dragOver ? '#5B21B6' : 'var(--border)'}`,
          background: dragOver ? 'rgba(91,33,182,0.05)' : 'var(--bg-secondary)',
        }}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
      >
        <input ref={inputRef} type="file" accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp" className="hidden"
               onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        {loading
          ? <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#5B21B6' }} />
          : (
            <div className="flex gap-3">
              <FileText className="w-7 h-7" style={{ color: '#5B21B6' }} />
              <Image className="w-7 h-7" style={{ color: '#7C3AED' }} />
            </div>
          )
        }
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {loading ? status : 'Drop file here or click to browse'}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>PDF · DOCX · TXT · PNG · JPG (max 20 MB) · Images use browser OCR</p>
        </div>
      </div>

      {status && !loading && (
        <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', color: '#10B981' }}>
          {status}
        </p>
      )}
      {error && (
        <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(225,29,72,0.07)', border: '1px solid rgba(225,29,72,0.2)', color: '#E11D48' }}>
          {error}
        </p>
      )}
      {parsedText && (
        <details className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          <summary className="cursor-pointer font-medium">Preview extracted text</summary>
          <pre className="mt-2 p-3 rounded-lg overflow-auto max-h-48 text-[11px] whitespace-pre-wrap"
               style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            {parsedText.slice(0, 1000)}{parsedText.length > 1000 ? '…' : ''}
          </pre>
        </details>
      )}
    </div>
  )
}

// ── Manual Tab ─────────────────────────────────────────────────────────────────
function ManualTab({ onInput }: { onInput: (input: ManualInput) => void }) {
  const [form, setForm] = useState<ManualInput>({ title: '', description: '', acceptanceCriteria: '', additionalContext: '' })

  function update(key: keyof ManualInput, value: string) {
    const next = { ...form, [key]: value }
    setForm(next)
    if (next.title || next.description) onInput(next)
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Feature Title</label>
        <input value={form.title} onChange={e => update('title', e.target.value)}
               placeholder="e.g. User Login with MFA" className={inputCls} />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>User Story / Description</label>
        <textarea value={form.description} onChange={e => update('description', e.target.value)}
                  placeholder="As a user, I want to…" rows={4} className={cn(inputCls, 'resize-none')} />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Acceptance Criteria</label>
        <textarea value={form.acceptanceCriteria} onChange={e => update('acceptanceCriteria', e.target.value)}
                  placeholder="Given… When… Then…" rows={4} className={cn(inputCls, 'resize-none')} />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Additional Context (optional)</label>
        <textarea value={form.additionalContext} onChange={e => update('additionalContext', e.target.value)}
                  placeholder="Tech stack, constraints, known issues…" rows={2} className={cn(inputCls, 'resize-none')} />
      </div>
    </div>
  )
}
