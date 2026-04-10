'use client'

import { useState, useEffect, useCallback } from 'react'
import { ClipboardList, Zap, Star, ArrowRight } from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts'

import Sidebar from '@/components/Sidebar'
import ThemeToggle from '@/components/ThemeToggle'
import ConfigurationView from '@/components/ConfigurationView'
import JiraInputView from '@/components/JiraInputView'
import UserInputView from '@/components/UserInputView'
import TestPlanView from '@/components/TestPlanView'
import TestCaseDashboard from '@/components/TestCaseDashboard'
import TestStrategyView from '@/components/TestStrategyView'

import { loadHistory } from '@/lib/history'
import { loadTestCaseSets } from '@/lib/testCaseStorage'
import { loadStrategies } from '@/lib/strategyStorage'
import type { LLMConnection, SourceConnection, GenerateResponse } from '@/types'

type NavKey = 'dashboard' | 'configuration' | 'user-input' | 'jira-input' | 'test-plan' | 'test-cases' | 'test-strategy'

const PAGE_TITLES: Record<NavKey, string> = {
  dashboard:      'Dashboard',
  configuration:  'Configuration',
  'user-input':   'User Input',
  'jira-input':   'JIRA / ADO Input',
  'test-plan':    'Test Plan Generator',
  'test-cases':   'Test Case Generator',
  'test-strategy':'Test Strategy Generator',
}

export default function Home() {
  const [activeNav, setActiveNav]           = useState<NavKey>('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [llmConn, setLLMConn]               = useState<LLMConnection | null>(null)
  const [sourceConn, setSourceConn]         = useState<SourceConnection | null>(null)
  const [pendingPlan, setPendingPlan]       = useState<GenerateResponse | null>(null)
  const [pendingStrategy, setPendingStrategy] = useState<{ strategy: import('@/types').TestStrategyResult; projectName: string; generatedAt: string } | null>(null)
  const [strategyPrefill, setStrategyPrefill] = useState<{ projectName: string; scope: string } | null>(null)

  useEffect(() => {
    try {
      const savedLLM    = localStorage.getItem('atp_llm_conn')
      const savedSource = localStorage.getItem('atp_source_conn')
      if (savedLLM)    setLLMConn(JSON.parse(savedLLM))
      if (savedSource) setSourceConn(JSON.parse(savedSource))
    } catch { /* ignore */ }
  }, [])

  const navTo = useCallback((key: NavKey) => {
    setActiveNav(key)
  }, [])

  function handleGenerateTestCases(plan: GenerateResponse) {
    setPendingPlan(plan)
    navTo('test-cases')
  }

  function handleGenerateStrategy(plan: GenerateResponse) {
    const projectName = (plan as GenerateResponse & { ticketSummary?: string }).ticketSummary || plan.ticketId
    const scope = [
      plan.testPlan.objective,
      plan.testPlan.scope,
      plan.testPlan.inclusions,
    ].filter(Boolean).join('\n\n').slice(0, 800)
    setStrategyPrefill({ projectName, scope })
    navTo('test-strategy')
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <Sidebar
        activeNav={activeNav}
        onNav={k => setActiveNav(k as NavKey)}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(p => !p)}
        llmConn={llmConn}
        sourceConn={sourceConn}
      />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="h-14 shrink-0 flex items-center justify-between px-5"
          style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {PAGE_TITLES[activeNav]}
          </span>
          <div className="flex items-center gap-3">
            <span className="hidden sm:flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#10B981' }} />
              srinipotnuri@gmail.com
            </span>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5 lg:p-6">
          {activeNav === 'dashboard'      && <DashboardView onNav={navTo} />}
          {activeNav === 'configuration'  && <ConfigurationView llmConn={llmConn} onLLMConnChange={setLLMConn} />}
          {activeNav === 'user-input'     && <UserInputView llmConn={llmConn} onNavToTestCases={() => navTo('test-cases')} onNavToStrategy={() => navTo('test-strategy')} />}
          {activeNav === 'jira-input'     && <JiraInputView llmConn={llmConn} sourceConn={sourceConn} onSourceConnChange={setSourceConn} onNavToTestPlan={() => navTo('test-plan')} onNavToTestCases={() => navTo('test-cases')} onNavToStrategy={() => navTo('test-strategy')} />}
          {activeNav === 'test-plan'      && <TestPlanView onGenerateTestCases={handleGenerateTestCases} onGenerateStrategy={handleGenerateStrategy} />}
          {activeNav === 'test-cases'     && <TestCaseDashboard />}
          {activeNav === 'test-strategy'  && <TestStrategyView llmConn={llmConn} initialStrategy={pendingStrategy} prefillFromPlan={strategyPrefill} />}
        </main>
      </div>
    </div>
  )
}

// ── Dashboard ──────────────────────────────────────────────────────────────────
function DashboardView({ onNav }: { onNav: (k: NavKey) => void }) {
  const [history,      setHistory]      = useState<ReturnType<typeof loadHistory>>([])
  const [testCaseSets, setTestCaseSets] = useState<ReturnType<typeof loadTestCaseSets>>([])
  const [strategies,   setStrategies]   = useState<ReturnType<typeof loadStrategies>>([])

  useEffect(() => {
    setHistory(loadHistory())
    setTestCaseSets(loadTestCaseSets())
    setStrategies(loadStrategies())
  }, [])

  const totalCases   = testCaseSets.reduce((acc, s) => acc + s.cases.length, 0)
  const recentPlans  = history.slice(0, 5)

  // Daily data — last 14 days (stable: seeded from date string, no Math.random on server)
  const dailyData = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - 13 + i)
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const plans = history.filter(e => new Date(e.generatedAt).toDateString() === d.toDateString()).length
    return { date: label, plans: plans || 0, cases: plans * 4 || 0 }
  })

  // Monthly data — last 6 months
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - 5 + i)
    return {
      month: d.toLocaleDateString('en-US', { month: 'short' }),
      plans: 0, cases: 0, strategies: 0,
    }
  })

  const pieData = [
    { name: 'Test Plans',      value: history.length,    color: '#5B21B6' },
    { name: 'Test Cases',      value: totalCases,        color: '#0284c7' },
    { name: 'Test Strategies', value: strategies.length, color: '#059669' },
  ]

  const chartTooltipStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: 11,
    color: 'var(--text-primary)',
  }

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Welcome back, Srinivasarao 👋</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Here's your AI testing activity at a glance.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Test Plans',      value: history.length,     sub: 'Total generated',      badge: '↑ 12 this month', badgeColor: '#a78bfa', grad: 'linear-gradient(135deg,#3b0764,#5B21B6)' },
          { label: 'Test Cases',      value: totalCases,         sub: 'Across all plans',     badge: '↑ 84 this month', badgeColor: '#38bdf8', grad: 'linear-gradient(135deg,#0c4a6e,#0284c7)' },
          { label: 'Test Strategies', value: strategies.length,  sub: 'Generated strategies', badge: '↑ 6 this month',  badgeColor: '#34d399', grad: 'linear-gradient(135deg,#064e3b,#059669)' },
          { label: 'Active Sessions', value: 1,                        sub: 'Current session',     badge: 'Live',            badgeColor: '#fb7185', grad: 'linear-gradient(135deg,#4c0519,#be123c)' },
        ].map(({ label, value, sub, badge, badgeColor, grad }) => (
          <div key={label} className="rounded-2xl p-5 relative overflow-hidden" style={{ background: grad }}>
            <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-20 blur-2xl pointer-events-none" style={{ background: '#fff' }} />
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>{label}</p>
            <p className="text-3xl font-black text-white tracking-tight leading-none">{value}</p>
            <p className="text-xs mt-1 mb-3" style={{ color: 'rgba(255,255,255,0.45)' }}>{sub}</p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: `${badgeColor}25`, color: badgeColor, border: `1px solid ${badgeColor}40` }}>{badge}</span>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Line chart */}
        <div className="col-span-2 rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-sm font-bold mb-0.5" style={{ color: 'var(--text-primary)' }}>Daily Utilization</p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>Last 14 days — plans + cases generated</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} interval={2} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Line type="monotone" dataKey="plans" stroke="#7C3AED" strokeWidth={2} dot={false} name="Test Plans" />
              <Line type="monotone" dataKey="cases" stroke="#0284c7" strokeWidth={2} dot={false} name="Test Cases" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-sm font-bold mb-0.5" style={{ color: 'var(--text-primary)' }}>By Feature</p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>Distribution</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="45%" innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value">
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 10 }} />
              <Tooltip contentStyle={chartTooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Bar chart */}
        <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-sm font-bold mb-0.5" style={{ color: 'var(--text-primary)' }}>Monthly Breakdown</p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>Artifacts generated per month</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="plans"      fill="#5B21B6" radius={[3,3,0,0]} name="Plans" />
              <Bar dataKey="cases"      fill="#0284c7" radius={[3,3,0,0]} name="Cases" />
              <Bar dataKey="strategies" fill="#059669" radius={[3,3,0,0]} name="Strategies" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent plans with action buttons (Option C) */}
        <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Recent Test Plans</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Generate cases or strategy from past plans</p>
            </div>
            <button onClick={() => onNav('test-plan')}
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition"
              style={{ background: 'rgba(91,33,182,0.08)', color: '#7C3AED', border: '1px solid rgba(91,33,182,0.2)' }}>
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {recentPlans.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <ClipboardList className="w-8 h-8" style={{ color: 'var(--border)' }} />
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>No plans generated yet</p>
              <button onClick={() => onNav('jira-input')}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
                style={{ background: '#5B21B6' }}>
                Get started <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentPlans.map(entry => (
                <div key={entry.id} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {entry.ticketSummary || entry.ticketId}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {entry.ticketId} · {new Date(entry.generatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => onNav('test-cases')}
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold"
                      style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10B981' }}>
                      <Zap className="w-3 h-3" /> Cases
                    </button>
                    <button onClick={() => onNav('test-strategy')}
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold"
                      style={{ background: 'rgba(0,120,212,0.1)', border: '1px solid rgba(0,120,212,0.25)', color: '#60a5fa' }}>
                      <Star className="w-3 h-3" /> Strategy
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
