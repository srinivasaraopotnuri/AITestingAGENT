'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Search, Filter, SortAsc, SortDesc, Trash2, Edit3, Code2, Copy, Check,
  ChevronDown, ChevronUp, X, Loader2, ClipboardList, Plus, Eye, History, Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { loadTestCaseSets, updateTestCase, deleteTestCase, deleteTestCaseSet } from '@/lib/testCaseStorage'
import AutomationCodeViewer from './AutomationCodeViewer'
import AISuggestionsPanel from './AISuggestionsPanel'
import type {
  TestCase, TestCaseSet, TestCasePriority, TestCaseStatus, TestCaseType,
  AutomationFramework, AutomationScript, LLMConnection
} from '@/types'

const PRIORITY_ORDER: Record<TestCasePriority, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 }
const PRIORITY_COLOR: Record<TestCasePriority, string> = {
  Critical: '#DC2626', High: '#E11D48', Medium: '#D97706', Low: '#64748b',
}
const STATUS_COLOR: Record<TestCaseStatus, { bg: string; text: string }> = {
  Draft:       { bg: 'rgba(100,116,139,0.1)', text: '#64748b'  },
  Ready:       { bg: 'rgba(37,99,235,0.1)',   text: '#2563EB'  },
  'In Progress':{ bg: 'rgba(217,119,6,0.1)', text: '#D97706'  },
  Passed:      { bg: 'rgba(16,185,129,0.1)',  text: '#10B981'  },
  Failed:      { bg: 'rgba(225,29,72,0.1)',   text: '#E11D48'  },
  Blocked:     { bg: 'rgba(220,38,38,0.1)',   text: '#DC2626'  },
}
const TYPE_COLOR: Record<TestCaseType, string> = {
  Functional: '#5B21B6', Negative: '#E11D48', 'Edge Case': '#D97706',
  Boundary: '#2563EB', Integration: '#059669', UI: '#7C3AED',
  Performance: '#0891B2', Security: '#DC2626',
}
const ALL_STATUSES: TestCaseStatus[] = ['Draft', 'Ready', 'In Progress', 'Passed', 'Failed', 'Blocked']
const ALL_PRIORITIES: TestCasePriority[] = ['Critical', 'High', 'Medium', 'Low']
const ALL_FRAMEWORKS: { value: AutomationFramework; label: string }[] = [
  { value: 'selenium-java', label: 'Selenium (Java)' },
  { value: 'playwright-ts', label: 'Playwright (TS)' },
  { value: 'playwright-js', label: 'Playwright (JS)' },
]

const inputCls = 'rounded-lg px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-[#5B21B6] [background:var(--bg-secondary)] [border:1px_solid_var(--border)] [color:var(--text-primary)]'
const selectCls = `${inputCls} cursor-pointer`

export default function TestCaseDashboard() {
  const [activeTab, setActiveTab]     = useState<'generated' | 'history'>('generated')
  const [sets, setSets]               = useState<TestCaseSet[]>([])
  const [activeSetId, setActiveSetId] = useState<string | null>(null)
  const [search, setSearch]           = useState('')
  const [filterPriority, setFilterPriority] = useState<TestCasePriority | 'All'>('All')
  const [filterStatus, setFilterStatus]     = useState<TestCaseStatus | 'All'>('All')
  const [filterType, setFilterType]         = useState<TestCaseType | 'All'>('All')
  const [sortBy, setSortBy]                 = useState<'id' | 'priority' | 'status' | 'type'>('id')
  const [sortDir, setSortDir]               = useState<'asc' | 'desc'>('asc')
  const [selectedIds, setSelectedIds]       = useState<Set<string>>(new Set())
  const [expandedId, setExpandedId]         = useState<string | null>(null)
  const [editingCase, setEditingCase]       = useState<TestCase | null>(null)
  const [autoScript, setAutoScript]         = useState<AutomationScript | null>(null)
  const [autoLoading, setAutoLoading]       = useState(false)
  const [autoError, setAutoError]           = useState('')
  const [autoFramework, setAutoFramework]   = useState<AutomationFramework>('playwright-ts')
  const [appName, setAppName]               = useState('')
  const [pageName, setPageName]             = useState('')
  const [showAutoPanel, setShowAutoPanel]   = useState(false)
  const [copiedId, setCopiedId]             = useState<string | null>(null)

  const reload = useCallback(() => {
    const loaded = loadTestCaseSets()
    setSets(loaded)
    if (!activeSetId && loaded.length) setActiveSetId(loaded[0].id)
  }, [activeSetId])

  useEffect(() => { reload() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const activeSet = sets.find(s => s.id === activeSetId) || null

  const filteredCases = (activeSet?.cases || [])
    .filter(c => {
      if (filterPriority !== 'All' && c.priority !== filterPriority) return false
      if (filterStatus   !== 'All' && c.status   !== filterStatus)   return false
      if (filterType     !== 'All' && c.type      !== filterType)     return false
      if (search) {
        const q = search.toLowerCase()
        return c.id.toLowerCase().includes(q) || c.title.toLowerCase().includes(q) || c.tags.some(t => t.toLowerCase().includes(q))
      }
      return true
    })
    .sort((a, b) => {
      let cmp = 0
      if (sortBy === 'id')       cmp = a.id.localeCompare(b.id)
      if (sortBy === 'priority') cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      if (sortBy === 'status')   cmp = a.status.localeCompare(b.status)
      if (sortBy === 'type')     cmp = a.type.localeCompare(b.type)
      return sortDir === 'asc' ? cmp : -cmp
    })

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleStatusChange(tc: TestCase, status: TestCaseStatus) {
    if (!activeSetId) return
    const updated = { ...tc, status }
    updateTestCase(activeSetId, updated)
    setSets(loadTestCaseSets())
  }

  function handleDeleteCase(tc: TestCase) {
    if (!activeSetId) return
    deleteTestCase(activeSetId, tc.id)
    setSets(loadTestCaseSets())
    setSelectedIds(prev => { const n = new Set(prev); n.delete(tc.id); return n })
  }

  function handleDeleteSet(id: string) {
    deleteTestCaseSet(id)
    const remaining = loadTestCaseSets()
    setSets(remaining)
    setActiveSetId(remaining[0]?.id || null)
  }

  function handleSaveEdit(tc: TestCase) {
    if (!activeSetId) return
    updateTestCase(activeSetId, tc)
    setSets(loadTestCaseSets())
    setEditingCase(null)
  }

  function copyId(id: string) {
    navigator.clipboard.writeText(id)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  function exportCSV() {
    if (!activeSet) return
    const rows = [
      ['ID', 'Title', 'Type', 'Priority', 'Status', 'Tags', 'Preconditions', 'Steps', 'Expected Result', 'Test Data', 'Automation Candidate'],
      ...activeSet.cases.map(c => [
        c.id, c.title, c.type, c.priority, c.status,
        c.tags.join('; '),
        c.preconditions,
        c.steps.map(s => `${s.stepNumber}. ${s.action}`).join(' | '),
        c.overallExpectedResult,
        c.testData,
        c.automationCandidate ? 'Yes' : 'No',
      ])
    ]
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${activeSet.ticketId}-test-cases.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  async function generateAutomation() {
    if (!selectedIds.size || !activeSet) return
    const llmConn = getLLMConn()
    if (!llmConn) { setAutoError('No LLM connection found. Configure one in Generate Plan first.'); return }
    const selectedCases = activeSet.cases.filter(c => selectedIds.has(c.id))
    setAutoLoading(true); setAutoError(''); setAutoScript(null)
    try {
      const res = await fetch('/api/generate-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testCases: selectedCases,
          framework: autoFramework,
          llmConnection: llmConn,
          applicationName: appName || 'Application',
          pageUnderTest: pageName || 'Page',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAutoScript(data.script)
    } catch (err) {
      setAutoError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setAutoLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 border-b" style={{ borderColor: 'var(--border)' }}>
        {([['generated', '⚡ Generated'], ['history', '🕓 History']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn('px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors',
              activeTab === key ? 'border-[#5B21B6]' : 'border-transparent')}
            style={{ color: activeTab === key ? '#5B21B6' : 'var(--text-secondary)' }}
          >{label}</button>
        ))}
      </div>

      {/* History tab */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          {sets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <History className="w-10 h-10" style={{ color: 'var(--border)' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>No history yet</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Generated test case sets will appear here</p>
            </div>
          ) : (
            sets.map(s => (
              <div key={s.id} className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl transition"
                   style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                       style={{ background: 'rgba(2,132,199,0.1)', border: '1px solid rgba(2,132,199,0.2)' }}>
                    <Zap className="w-4 h-4" style={{ color: '#0284c7' }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {s.ticketSummary || s.ticketId}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {s.ticketId} · {s.cases.length} cases · {s.llmProvider} · {new Date(s.generatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => { setActiveSetId(s.id); setActiveTab('generated') }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                    <Eye className="w-3 h-3" /> View
                  </button>
                  <button
                    onClick={() => handleDeleteSet(s.id)}
                    className="p-1.5 rounded-lg transition"
                    style={{ color: 'var(--text-secondary)' }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Generated tab */}
      {activeTab === 'generated' && sets.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-center space-y-3">
          <ClipboardList className="w-12 h-12" style={{ color: 'var(--border)' }} />
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>No Test Cases Yet</h2>
          <p className="text-sm max-w-xs" style={{ color: 'var(--text-secondary)' }}>
            Use <strong>JIRA/ADO Input</strong> or <strong>User Input</strong> to generate test cases.
          </p>
        </div>
      )}
      {activeTab === 'generated' && sets.length > 0 && <div className="space-y-4">
      {/* Set Selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={activeSetId || ''} onChange={e => setActiveSetId(e.target.value)} className={`${selectCls} flex-1 max-w-xs`}>
          {sets.map(s => (
            <option key={s.id} value={s.id}>
              {s.ticketId} — {s.ticketSummary} ({s.cases.length} cases)
            </option>
          ))}
        </select>
        {activeSetId && (
          <button onClick={() => handleDeleteSet(activeSetId)}
                  className="p-2 rounded-lg transition-all hover:opacity-80"
                  style={{ background: 'rgba(225,29,72,0.08)', border: '1px solid rgba(225,29,72,0.2)', color: '#E11D48' }}
                  title="Delete this test case set">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        <button onClick={exportCSV}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
                style={{ background: 'rgba(91,33,182,0.08)', border: '1px solid rgba(91,33,182,0.2)', color: '#5B21B6' }}>
          Export CSV
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
                 placeholder="Search ID, title, tags…"
                 className={`${inputCls} pl-8 w-full`} />
        </div>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value as TestCasePriority | 'All')} className={selectCls}>
          <option value="All">All Priorities</option>
          {ALL_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as TestCaseStatus | 'All')} className={selectCls}>
          <option value="All">All Statuses</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value as TestCaseType | 'All')} className={selectCls}>
          <option value="All">All Types</option>
          {Object.keys(TYPE_COLOR).map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        {selectedIds.size > 0 && (
          <button
            onClick={() => setShowAutoPanel(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-80 ml-auto"
            style={{ background: '#5B21B6', color: '#fff' }}
          >
            <Code2 className="w-3.5 h-3.5" /> Generate Automation ({selectedIds.size})
          </button>
        )}
      </div>

      {/* Stats bar */}
      {activeSet && (
        <div className="flex gap-4 flex-wrap text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span><strong style={{ color: 'var(--text-primary)' }}>{activeSet.cases.length}</strong> total</span>
          <span><strong style={{ color: '#10B981' }}>{activeSet.cases.filter(c => c.status === 'Passed').length}</strong> passed</span>
          <span><strong style={{ color: '#E11D48' }}>{activeSet.cases.filter(c => c.status === 'Failed').length}</strong> failed</span>
          <span><strong style={{ color: '#5B21B6' }}>{activeSet.cases.filter(c => c.automationCandidate).length}</strong> automation candidates</span>
          <span style={{ color: 'var(--text-secondary)' }}>·</span>
          <span>{activeSet.llmProvider} / {activeSet.llmModel}</span>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        {/* Table Header */}
        <div className="grid gap-2 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider"
             style={{ gridTemplateColumns: '24px 70px 1fr 90px 80px 90px 100px 80px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
          <input type="checkbox"
                 checked={selectedIds.size === filteredCases.length && filteredCases.length > 0}
                 onChange={e => setSelectedIds(e.target.checked ? new Set(filteredCases.map(c => c.id)) : new Set())}
                 className="cursor-pointer" />
          <SortButton label="ID"       col="id"       current={sortBy} dir={sortDir} onToggle={toggleSort} />
          <span>Title</span>
          <SortButton label="Type"     col="type"     current={sortBy} dir={sortDir} onToggle={toggleSort} />
          <SortButton label="Priority" col="priority" current={sortBy} dir={sortDir} onToggle={toggleSort} />
          <SortButton label="Status"   col="status"   current={sortBy} dir={sortDir} onToggle={toggleSort} />
          <span>Tags</span>
          <span>Actions</span>
        </div>

        {/* Rows */}
        <div>
          {filteredCases.length === 0 && (
            <div className="text-center py-8 text-sm" style={{ color: 'var(--text-secondary)' }}>
              No test cases match your filters.
            </div>
          )}
          {filteredCases.map(tc => (
            <div key={tc.id}>
              <div
                className={cn('grid gap-2 px-4 py-3 items-center cursor-pointer transition-all hover:opacity-90')}
                style={{
                  gridTemplateColumns: '24px 70px 1fr 90px 80px 90px 100px 80px',
                  background: selectedIds.has(tc.id) ? 'rgba(91,33,182,0.05)' : 'var(--bg-card)',
                  borderBottom: '1px solid var(--border)',
                }}
                onClick={() => setExpandedId(expandedId === tc.id ? null : tc.id)}
              >
                {/* Checkbox */}
                <input type="checkbox" checked={selectedIds.has(tc.id)}
                       onClick={e => e.stopPropagation()}
                       onChange={() => toggleSelect(tc.id)}
                       className="cursor-pointer" />
                {/* ID */}
                <div className="flex items-center gap-1">
                  <span className="text-xs font-mono font-bold" style={{ color: '#5B21B6' }}>{tc.id}</span>
                  <button onClick={e => { e.stopPropagation(); copyId(tc.id) }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity">
                    {copiedId === tc.id
                      ? <Check className="w-3 h-3" style={{ color: '#10B981' }} />
                      : <Copy className="w-3 h-3" style={{ color: 'var(--text-secondary)' }} />}
                  </button>
                </div>
                {/* Title */}
                <span className="text-xs truncate font-medium" style={{ color: 'var(--text-primary)' }}>{tc.title}</span>
                {/* Type */}
                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium truncate text-center"
                      style={{ background: `${TYPE_COLOR[tc.type]}15`, color: TYPE_COLOR[tc.type] }}>
                  {tc.type}
                </span>
                {/* Priority */}
                <span className="text-[10px] font-bold text-center" style={{ color: PRIORITY_COLOR[tc.priority] }}>
                  {tc.priority}
                </span>
                {/* Status */}
                <select
                  value={tc.status}
                  onClick={e => e.stopPropagation()}
                  onChange={e => handleStatusChange(tc, e.target.value as TestCaseStatus)}
                  className="text-[10px] px-1.5 py-1 rounded-lg font-medium cursor-pointer border-0 focus:outline-none focus:ring-1 focus:ring-[#5B21B6]"
                  style={{ background: STATUS_COLOR[tc.status].bg, color: STATUS_COLOR[tc.status].text }}
                >
                  {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {/* Tags */}
                <div className="flex gap-1 overflow-hidden">
                  {tc.tags.slice(0, 2).map(tag => (
                    <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full truncate"
                          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                      {tag}
                    </span>
                  ))}
                </div>
                {/* Actions */}
                <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => setExpandedId(expandedId === tc.id ? null : tc.id)}
                    title={expandedId === tc.id ? 'Collapse' : 'View steps'}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition hover:opacity-80"
                    style={{ background: expandedId === tc.id ? 'rgba(91,33,182,0.12)' : 'var(--bg-secondary)', border: '1px solid var(--border)', color: expandedId === tc.id ? '#7C3AED' : 'var(--text-secondary)' }}>
                    <Eye className="w-3 h-3" /> View
                  </button>
                  <button onClick={() => setEditingCase({ ...tc })} title="Edit"
                          className="p-1.5 rounded-lg transition hover:opacity-70"
                          style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDeleteCase(tc)} title="Delete"
                          className="p-1.5 rounded-lg transition hover:opacity-70"
                          style={{ background: 'rgba(225,29,72,0.08)', color: '#E11D48' }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Expanded detail */}
              {expandedId === tc.id && (
                <div className="px-6 py-4 space-y-4"
                     style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    {tc.preconditions && (
                      <div>
                        <p className="font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Preconditions</p>
                        <p style={{ color: 'var(--text-primary)' }}>{tc.preconditions}</p>
                      </div>
                    )}
                    {tc.testData && (
                      <div>
                        <p className="font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Test Data</p>
                        <p style={{ color: 'var(--text-primary)' }}>{tc.testData}</p>
                      </div>
                    )}
                    {tc.overallExpectedResult && (
                      <div>
                        <p className="font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Expected Result</p>
                        <p style={{ color: 'var(--text-primary)' }}>{tc.overallExpectedResult}</p>
                      </div>
                    )}
                  </div>
                  {tc.steps.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Steps</p>
                      <div className="space-y-1.5">
                        {tc.steps.map(s => (
                          <div key={s.stepNumber} className="flex gap-3 text-xs">
                            <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold text-[10px]"
                                  style={{ background: 'rgba(91,33,182,0.1)', color: '#5B21B6' }}>
                              {s.stepNumber}
                            </span>
                            <div>
                              <p style={{ color: 'var(--text-primary)' }}>{s.action}</p>
                              <p className="mt-0.5" style={{ color: '#10B981' }}>→ {s.expectedResult}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    {tc.automationCandidate && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                            style={{ background: 'rgba(91,33,182,0.1)', color: '#5B21B6', border: '1px solid rgba(91,33,182,0.2)' }}>
                        Automation Candidate
                      </span>
                    )}
                    <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                      Created {new Date(tc.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Automation Panel */}
      {showAutoPanel && (
        <div className="rounded-2xl p-6 space-y-4" style={{ background: 'var(--bg-card)', border: '1px solid rgba(91,33,182,0.3)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 className="w-5 h-5" style={{ color: '#5B21B6' }} />
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                Generate Automation Code
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(91,33,182,0.1)', color: '#5B21B6' }}>
                {selectedIds.size} cases selected
              </span>
            </div>
            <button onClick={() => { setShowAutoPanel(false); setAutoScript(null); setAutoError('') }}
                    className="p-1.5 rounded-lg hover:opacity-70 transition"
                    style={{ color: 'var(--text-secondary)' }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Framework</label>
              <select value={autoFramework} onChange={e => setAutoFramework(e.target.value as AutomationFramework)} className={`${selectCls} w-full`}>
                {ALL_FRAMEWORKS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Application Name</label>
              <input value={appName} onChange={e => setAppName(e.target.value)}
                     placeholder="e.g. VWO Dashboard" className={`${inputCls} w-full`} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Page / Feature Under Test</label>
              <input value={pageName} onChange={e => setPageName(e.target.value)}
                     placeholder="e.g. Login Page" className={`${inputCls} w-full`} />
            </div>
          </div>

          {autoError && (
            <p className="text-xs px-3 py-2 rounded-lg"
               style={{ background: 'rgba(225,29,72,0.07)', border: '1px solid rgba(225,29,72,0.2)', color: '#E11D48' }}>
              {autoError}
            </p>
          )}

          <button
            onClick={generateAutomation}
            disabled={autoLoading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-40"
            style={{ background: '#5B21B6', boxShadow: '0 4px 14px rgba(91,33,182,0.35)' }}
          >
            {autoLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : <><Code2 className="w-4 h-4" /> Generate Code</>}
          </button>

          {autoScript && <AutomationCodeViewer script={autoScript} />}
        </div>
      )}

      {/* Edit Modal */}
      {editingCase && (
        <EditModal
          tc={editingCase}
          onSave={handleSaveEdit}
          onClose={() => setEditingCase(null)}
        />
      )}
      </div>}
    </div>
  )
}

// ── Helper: Sort Button ────────────────────────────────────────────────────────
function SortButton({ label, col, current, dir, onToggle }: {
  label: string; col: string; current: string; dir: 'asc' | 'desc'; onToggle: (c: any) => void
}) {
  const active = current === col
  return (
    <button onClick={() => onToggle(col)} className="flex items-center gap-0.5 hover:opacity-80 transition">
      {label}
      {active ? (dir === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />) : null}
    </button>
  )
}

// ── Edit Modal ─────────────────────────────────────────────────────────────────
function EditModal({ tc, onSave, onClose }: { tc: TestCase; onSave: (t: TestCase) => void; onClose: () => void }) {
  const [form, setForm] = useState<TestCase>({ ...tc })

  const inputCls2 = 'w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B21B6] [background:var(--bg-secondary)] [border:1px_solid_var(--border)] [color:var(--text-primary)]'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl p-6 space-y-4 shadow-2xl"
           style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Edit {form.id}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:opacity-70 transition" style={{ color: 'var(--text-secondary)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputCls2} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as TestCasePriority }))}
                      className={inputCls2}>
                {ALL_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as TestCaseStatus }))}
                      className={inputCls2}>
                {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as TestCaseType }))}
                      className={inputCls2}>
                {Object.keys(TYPE_COLOR).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Preconditions</label>
            <textarea value={form.preconditions} onChange={e => setForm(f => ({ ...f, preconditions: e.target.value }))}
                      rows={2} className={`${inputCls2} resize-none`} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Test Data</label>
            <textarea value={form.testData} onChange={e => setForm(f => ({ ...f, testData: e.target.value }))}
                      rows={2} className={`${inputCls2} resize-none`} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Overall Expected Result</label>
            <textarea value={form.overallExpectedResult} onChange={e => setForm(f => ({ ...f, overallExpectedResult: e.target.value }))}
                      rows={2} className={`${inputCls2} resize-none`} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Tags (comma-separated)</label>
            <input value={form.tags.join(', ')}
                   onChange={e => setForm(f => ({ ...f, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))}
                   className={inputCls2} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="autoCandidate" checked={form.automationCandidate}
                   onChange={e => setForm(f => ({ ...f, automationCandidate: e.target.checked }))} />
            <label htmlFor="autoCandidate" className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Automation Candidate
            </label>
          </div>
        </div>

        <div className="flex gap-3 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            Cancel
          </button>
          <button onClick={() => onSave(form)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                  style={{ background: '#5B21B6' }}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Utility: read LLM connection from localStorage ─────────────────────────────
function getLLMConn(): LLMConnection | null {
  try {
    const raw = localStorage.getItem('atp_llm_conn')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
