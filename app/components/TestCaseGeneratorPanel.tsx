'use client'

import { useState } from 'react'
import { Sparkles, Loader2, ChevronRight, ClipboardList, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { saveTestCaseSet } from '@/lib/testCaseStorage'
import AISuggestionsPanel from './AISuggestionsPanel'
import type {
  JiraTicketFields, ManualInput, LLMConnection,
  GenerateTestCasesResponse, TestCaseSet, TestCase, AISuggestion,
  TestCasePriority
} from '@/types'

interface Props {
  ticketFields?: JiraTicketFields | null
  manualInput?: ManualInput | null
  additionalContext?: string
  llmConnection: LLMConnection
  onGenerated?: (set: TestCaseSet) => void
  onViewDashboard?: () => void
}

const PRIORITY_COLOR: Record<TestCasePriority, string> = {
  Critical: '#DC2626', High: '#E11D48', Medium: '#D97706', Low: '#64748b',
}

const TYPE_COLOR: Record<string, string> = {
  Functional: '#5B21B6', Negative: '#E11D48', 'Edge Case': '#D97706',
  Boundary: '#2563EB', Integration: '#059669', UI: '#7C3AED',
  Performance: '#0891B2', Security: '#DC2626',
}

export default function TestCaseGeneratorPanel({
  ticketFields, manualInput, additionalContext, llmConnection, onGenerated, onViewDashboard
}: Props) {
  const [count, setCount] = useState(5)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<GenerateTestCasesResponse | null>(null)

  const source = ticketFields ? 'ticket' : 'manual'
  const hasInput = !!(ticketFields || manualInput?.description)

  async function generate() {
    if (!hasInput) return
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/generate-test-cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source,
          ticketFields: source === 'ticket' ? ticketFields : undefined,
          manualInput:  source === 'manual'  ? manualInput  : undefined,
          additionalContext: additionalContext || '',
          llmConnection,
          count,
        }),
      })
      const data: GenerateTestCasesResponse = await res.json()
      if (!res.ok) throw new Error((data as unknown as { error: string }).error)
      setResult(data)

      // Persist to localStorage
      const set: TestCaseSet = {
        id: `tcs-${Date.now()}`,
        ticketId: data.ticketId,
        ticketSummary: ticketFields?.summary || manualInput?.title || 'Manual Input',
        cases: data.cases,
        generatedAt: data.generatedAt,
        llmProvider: llmConnection.provider,
        llmModel: llmConnection.model,
      }
      saveTestCaseSet(set)
      onGenerated?.(set)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setLoading(false)
    }
  }

  function addSuggestionAsCase(s: AISuggestion) {
    if (!result) return
    const now = new Date().toISOString()
    const newCase: TestCase = {
      id: `TC-${String(result.cases.length + 1).padStart(3, '0')}`,
      title: s.title,
      type: s.type === 'edge_case' ? 'Edge Case'
          : s.type === 'negative_test' ? 'Negative'
          : s.type === 'security' ? 'Security'
          : s.type === 'performance' ? 'Performance'
          : 'Functional',
      priority: s.suggestedPriority,
      status: 'Draft',
      tags: [s.type.replace('_', ' ')],
      preconditions: '',
      testData: '',
      steps: [{ stepNumber: 1, action: s.description, expectedResult: '' }],
      overallExpectedResult: '',
      automationCandidate: false,
      createdAt: now,
      updatedAt: now,
    }
    const updated = { ...result, cases: [...result.cases, newCase] }
    setResult(updated)
  }

  return (
    <div className="rounded-2xl p-6 space-y-5"
         style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
             style={{ background: 'rgba(91,33,182,0.08)', border: '1px solid rgba(91,33,182,0.18)' }}>
          <ClipboardList className="w-5 h-5" style={{ color: '#5B21B6' }} />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: '#5B21B6' }}>AI Test Cases</p>
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Generate Test Cases</h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Produce detailed test cases with steps, test data, and AI coverage suggestions.
          </p>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }} className="space-y-4">
        {!hasInput && (
          <div className="px-4 py-3 rounded-xl text-sm"
               style={{ background: 'rgba(91,33,182,0.06)', border: '1px solid rgba(91,33,182,0.2)', color: 'var(--text-secondary)' }}>
            Fetch a ticket or provide manual input above to enable generation.
          </div>
        )}

        {/* Count selector */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Test cases to generate:</span>
          <div className="flex gap-1">
            {[5, 10, 15, 20].map(n => (
              <button key={n} onClick={() => setCount(n)}
                      className="w-10 h-8 rounded-lg text-xs font-semibold transition-all"
                      style={count === n
                        ? { background: '#5B21B6', color: '#fff' }
                        : { background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }
                      }>
                {n}
              </button>
            ))}
          </div>
          {count > 5 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(217,119,6,0.1)', color: '#D97706', border: '1px solid rgba(217,119,6,0.25)' }}>
              Higher counts may hit rate limits on low-TPM models
            </span>
          )}
        </div>

        {error && (
          <div className="px-3 py-2.5 rounded-xl text-sm"
               style={{ background: 'rgba(225,29,72,0.07)', border: '1px solid rgba(225,29,72,0.2)', color: '#E11D48' }}>
            {error}
          </div>
        )}

        <button
          onClick={generate}
          disabled={loading || !hasInput}
          className={cn('w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-40')}
          style={{ background: 'linear-gradient(135deg, #5B21B6, #7C3AED)', boxShadow: '0 4px 20px rgba(91,33,182,0.35)' }}
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating {count} test cases…</>
            : <><Sparkles className="w-4 h-4" /> Generate {count} Test Cases</>
          }
        </button>

        {/* Results preview */}
        {result && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" style={{ color: '#10B981' }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {result.cases.length} test cases generated
                </span>
              </div>
              {onViewDashboard && (
                <button
                  onClick={onViewDashboard}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
                  style={{ background: '#5B21B6', color: '#fff' }}
                >
                  View All in Dashboard <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Preview first 3 */}
            <div className="space-y-2">
              {result.cases.slice(0, 3).map(tc => (
                <div key={tc.id} className="flex items-start gap-3 px-3.5 py-3 rounded-xl"
                     style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0"
                        style={{ background: 'rgba(91,33,182,0.1)', color: '#5B21B6' }}>{tc.id}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{tc.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                            style={{ background: `${TYPE_COLOR[tc.type] || '#5B21B6'}15`, color: TYPE_COLOR[tc.type] || '#5B21B6' }}>
                        {tc.type}
                      </span>
                      <span className="text-[10px] font-semibold" style={{ color: PRIORITY_COLOR[tc.priority] }}>
                        {tc.priority}
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                        {tc.steps.length} steps
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {result.cases.length > 3 && (
                <p className="text-xs text-center py-1" style={{ color: 'var(--text-secondary)' }}>
                  + {result.cases.length - 3} more cases in the dashboard
                </p>
              )}
            </div>

            {/* AI Suggestions */}
            {result.suggestions.length > 0 && (
              <AISuggestionsPanel suggestions={result.suggestions} onAddSuggestion={addSuggestionAsCase} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
