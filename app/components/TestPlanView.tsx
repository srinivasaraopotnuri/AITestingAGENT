'use client'

import { useState, useEffect } from 'react'
import { History, Trash2, Eye, Zap, Star, Search, ClipboardList, RefreshCw } from 'lucide-react'
import TestPlanViewer from './TestPlanViewer'
import ExportButtons from './ExportButtons'
import { loadHistory, deleteFromHistory } from '@/lib/history'
import type { HistoryEntry } from '@/lib/history'
import type { GenerateResponse, TestStrategyResult } from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  onGenerateTestCases?: (plan: GenerateResponse) => void
  onGenerateStrategy?: (plan: GenerateResponse) => void
  pendingPlan?: GenerateResponse | null
}

export default function TestPlanView({ onGenerateTestCases, onGenerateStrategy, pendingPlan }: Props) {
  const [activeTab, setActiveTab] = useState<'generated' | 'history'>(pendingPlan ? 'generated' : 'history')
  const [currentPlan, setCurrentPlan] = useState<GenerateResponse | null>(pendingPlan ?? null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    setHistory(loadHistory())
  }, [activeTab])

  useEffect(() => {
    if (pendingPlan) {
      setCurrentPlan(pendingPlan)
      setActiveTab('generated')
    }
  }, [pendingPlan])

  function handleDelete(id: string) {
    deleteFromHistory(id)
    setHistory(h => h.filter(e => e.id !== id))
  }

  function handleView(entry: HistoryEntry) {
    setCurrentPlan({ testPlan: entry.testPlan, ticketId: entry.ticketId, generatedAt: entry.generatedAt })
    setActiveTab('generated')
  }

  const filtered = history.filter(e =>
    !search || e.ticketSummary?.toLowerCase().includes(search.toLowerCase()) || e.ticketId?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 border-b" style={{ borderColor: 'var(--border)' }}>
        {([['generated', '📋 Generated'], ['history', '🕓 History']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn('px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors', activeTab === key ? 'border-[#5B21B6] text-[#5B21B6]' : 'border-transparent')}
            style={{ color: activeTab === key ? '#5B21B6' : 'var(--text-secondary)' }}
          >{label}</button>
        ))}
      </div>

      {/* Generated tab */}
      {activeTab === 'generated' && (
        <>
          {!currentPlan ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <ClipboardList className="w-12 h-12" style={{ color: 'var(--border)' }} />
              <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>No test plan generated yet</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Go to User Input or JIRA / ADO Input to generate one</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-1 rounded-md" style={{ background: 'rgba(91,33,182,0.12)', color: '#5B21B6' }}>
                    {currentPlan.ticketId}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {new Date(currentPlan.generatedAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex gap-2">
                  {onGenerateTestCases && (
                    <button onClick={() => onGenerateTestCases(currentPlan)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                      style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10B981' }}>
                      <Zap className="w-3 h-3" /> Generate Test Cases
                    </button>
                  )}
                  {onGenerateStrategy && (
                    <button onClick={() => onGenerateStrategy(currentPlan)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                      style={{ background: 'rgba(0,120,212,0.1)', border: '1px solid rgba(0,120,212,0.3)', color: '#60a5fa' }}>
                      <Star className="w-3 h-3" /> Generate Strategy
                    </button>
                  )}
                  <ExportButtons testPlan={currentPlan.testPlan} ticketId={currentPlan.ticketId} generatedAt={currentPlan.generatedAt} />
                </div>
              </div>
              <TestPlanViewer testPlan={currentPlan.testPlan} ticketId={currentPlan.ticketId} generatedAt={currentPlan.generatedAt} />
            </div>
          )}
        </>
      )}

      {/* History tab */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{history.length} plan{history.length !== 1 ? 's' : ''} saved</p>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search plans…"
                className="pl-8 pr-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#5B21B6]"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', width: 200 }}
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <History className="w-10 h-10" style={{ color: 'var(--border)' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>No history yet</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Generated test plans will appear here</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map(entry => (
                <div key={entry.id} className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl transition"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(91,33,182,0.1)', border: '1px solid rgba(91,33,182,0.2)' }}>
                      <ClipboardList className="w-4 h-4" style={{ color: '#7C3AED' }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {entry.ticketSummary || entry.ticketId}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {entry.ticketId} · {entry.llmProvider} · {new Date(entry.generatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => handleView(entry)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                      <Eye className="w-3 h-3" /> View
                    </button>
                    {onGenerateTestCases && (
                      <button onClick={() => onGenerateTestCases(entry)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10B981' }}>
                        <Zap className="w-3 h-3" /> Cases
                      </button>
                    )}
                    {onGenerateStrategy && (
                      <button onClick={() => onGenerateStrategy(entry)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ background: 'rgba(0,120,212,0.1)', border: '1px solid rgba(0,120,212,0.25)', color: '#60a5fa' }}>
                        <Star className="w-3 h-3" /> Strategy
                      </button>
                    )}
                    <button onClick={() => handleDelete(entry.id)}
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
