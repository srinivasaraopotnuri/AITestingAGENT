'use client'

import { useEffect, useState } from 'react'
import { Clock, Trash2, Eye, FileText, Zap, RefreshCw } from 'lucide-react'
import { loadHistory, deleteFromHistory, clearHistory, type HistoryEntry } from '@/lib/history'
import TestPlanViewer from './TestPlanViewer'
import ExportButtons from './ExportButtons'

export default function HistoryView() {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [selected, setSelected] = useState<HistoryEntry | null>(null)

  function refresh() {
    setEntries(loadHistory())
  }

  useEffect(() => {
    refresh()
  }, [])

  function handleDelete(id: string) {
    deleteFromHistory(id)
    refresh()
    if (selected?.id === id) setSelected(null)
  }

  function handleClearAll() {
    if (confirm('Clear all history?')) {
      clearHistory()
      refresh()
      setSelected(null)
    }
  }

  if (selected) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelected(null)}
            className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-100 transition-colors font-medium"
          >
            ← Back to History
          </button>
          <ExportButtons testPlan={selected.testPlan} ticketId={selected.ticketId} generatedAt={selected.generatedAt} />
        </div>
        <TestPlanViewer testPlan={selected.testPlan} ticketId={selected.ticketId} generatedAt={selected.generatedAt} />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Clock className="w-5 h-5 text-[#5B21B6]" />
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Generated Test Plans</h2>
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: 'rgba(91,33,182,0.1)', color: '#5B21B6', border: '1px solid rgba(91,33,182,0.2)' }}>
            {entries.length}
          </span>
        </div>
        <div className="flex gap-2">
          <button onClick={refresh} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors font-medium"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          {entries.length > 0 && (
            <button onClick={handleClearAll} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors font-medium"
                    style={{ background: 'rgba(91,33,182,0.06)', border: '1px solid rgba(91,33,182,0.2)', color: '#5B21B6' }}>
              <Trash2 className="w-3.5 h-3.5" /> Clear All
            </button>
          )}
        </div>
      </div>

      {/* Empty state */}
      {entries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
            <FileText className="w-7 h-7 text-gray-300 dark:text-zinc-600" />
          </div>
          <p className="text-gray-600 dark:text-zinc-400 font-semibold">No test plans generated yet</p>
          <p className="text-gray-400 dark:text-zinc-500 text-sm">Generated plans will appear here automatically.</p>
        </div>
      )}

      {/* List */}
      <div className="space-y-2.5">
        {entries.map(entry => (
          <div
            key={entry.id}
            className="rounded-xl p-4 hover:shadow-md transition-all" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-mono px-2 py-0.5 rounded-lg" style={{ background: 'rgba(91,33,182,0.08)', color: '#5B21B6', border: '1px solid rgba(91,33,182,0.18)' }}>
                    {entry.ticketId}
                  </span>
                  <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                    <Zap className="w-3 h-3" />
                    {entry.llmProvider} · {entry.llmModel}
                  </span>
                </div>
                <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                  {entry.ticketSummary || entry.testPlan.objective?.slice(0, 80) || 'Test Plan'}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                  {new Date(entry.generatedAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setSelected(entry)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                  style={{ background: 'rgba(91,33,182,0.08)', border: '1px solid rgba(91,33,182,0.2)', color: '#5B21B6' }}
                >
                  <Eye className="w-3.5 h-3.5" /> View
                </button>
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#5B21B6'; (e.currentTarget as HTMLElement).style.background = 'rgba(91,33,182,0.08)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; (e.currentTarget as HTMLElement).style.background = '' }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
