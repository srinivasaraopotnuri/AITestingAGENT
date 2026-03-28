'use client'

import { useState, useCallback } from 'react'
import { LayoutDashboard, Sparkles, Zap, Database, FileText, ArrowRight } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import StepWizard from '@/components/StepWizard'
import HistoryView from '@/components/HistoryView'
import ThemeToggle from '@/components/ThemeToggle'

type NavKey = 'dashboard' | 'generate' | 'history' | 'settings'

export default function Home() {
  const [activeNav, setActiveNav] = useState<NavKey>('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [historyKey, setHistoryKey] = useState(0)

  const handleGenerated = useCallback(() => setHistoryKey(k => k + 1), [])

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <Sidebar activeNav={activeNav} onNav={k => setActiveNav(k as NavKey)} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(p => !p)} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Header */}
        <header className="h-14 shrink-0 flex items-center justify-between px-5"
                style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {activeNav === 'dashboard' && 'Dashboard'}
              {activeNav === 'generate'  && 'Generate Test Plan'}
              {activeNav === 'history'   && 'History'}
              {activeNav === 'settings'  && 'Settings'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#10B981' }} />
              srinipotnuri@gmail.com
            </span>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5 lg:p-6">
          {activeNav === 'dashboard' && <DashboardView onStart={() => setActiveNav('generate')} />}
          {activeNav === 'generate'  && <StepWizard onGenerated={handleGenerated} />}
          {activeNav === 'history'   && <HistoryView key={historyKey} />}
          {activeNav === 'settings'  && <PlaceholderView title="Settings" description="Global settings and preferences." />}
        </main>
      </div>
    </div>
  )
}

function DashboardView({ onStart }: { onStart: () => void }) {
  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl p-8 text-white"
           style={{ background: 'linear-gradient(135deg, #0f0f14 0%, #5B21B6 50%, #7C3AED 100%)' }}>
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-20 blur-3xl pointer-events-none"
             style={{ background: '#E11D48', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-1/4 w-48 h-48 rounded-full opacity-15 blur-3xl pointer-events-none"
             style={{ background: '#7C3AED' }} />

        <div className="relative">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center border border-white/20"
                 style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">AI Test Plan Generator</h1>
              <p className="text-white/55 text-xs font-medium mt-0.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#10B981' }} />
                Groq · Jira · Template Engine
              </p>
            </div>
          </div>
          <p className="text-white/70 text-sm max-w-lg mb-6 leading-relaxed">
            Connect your Jira project, fetch a ticket by ID, and let AI generate a fully structured test plan — in seconds.
          </p>
          <button
            onClick={onStart}
            className="inline-flex items-center gap-2 px-5 py-2.5 font-semibold rounded-xl text-sm transition-all active:scale-[0.98]"
            style={{ background: '#ffffff', color: '#5B21B6', boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}
          >
            Get Started <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { step: 1, icon: Zap,      title: 'Connect LLM',   desc: 'Groq, OpenAI, Ollama or Grok',         accent: '#5B21B6' },
          { step: 2, icon: Database, title: 'Connect Jira',  desc: 'Authenticate with your Jira instance', accent: '#7C3AED' },
          { step: 3, icon: FileText, title: 'Fetch Ticket',  desc: 'Enter ticket ID and preview content',  accent: '#E11D48' },
          { step: 4, icon: Sparkles, title: 'Generate Plan', desc: 'AI builds a full structured test plan', accent: '#5B21B6' },
        ].map(({ step, icon: Icon, title, desc, accent }) => (
          <div key={step}
               className="rounded-xl p-4 space-y-3 transition-all hover:shadow-md cursor-default"
               style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                 style={{ background: `${accent}12`, border: `1px solid ${accent}25` }}>
              <Icon className="w-4 h-4" style={{ color: accent }} />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Step {step}</p>
              <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>{title}</p>
              <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Bold Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          label="Jira Project"
          value="ATP"
          sub="AI Test Plan Generator"
          badge="+Connected"
          badgeColor="#10B981"
          accent="#7C3AED"
          gradient="linear-gradient(135deg, #5B21B6 0%, #7C3AED 100%)"
          sparkline={[40,55,45,60,50,70,65,80,72,88]}
        />
        <StatCard
          label="Tickets Ready"
          value="2"
          sub="ATP-1 · ATP-2"
          badge="+2 open"
          badgeColor="#E11D48"
          accent="#E11D48"
          gradient="linear-gradient(135deg, #9f1239 0%, #E11D48 100%)"
          sparkline={[10,20,15,30,25,20,30,25,35,40]}
        />
        <StatCard
          label="LLM Provider"
          value="Groq"
          sub="llama-3.3-70b-versatile"
          badge="Active"
          badgeColor="#10B981"
          accent="#5B21B6"
          gradient="linear-gradient(135deg, #0f0f14 0%, #5B21B6 100%)"
          sparkline={[60,65,70,62,75,80,72,85,78,92]}
        />
      </div>
    </div>
  )
}

// ── Sparkline SVG ─────────────────────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const w = 100, h = 36
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 4) - 2
    return `${x},${y}`
  }).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 36 }} preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      <polyline points={`0,${h} ${points} ${w},${h}`}
                fill={color} stroke="none" opacity="0.15" />
    </svg>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, badge, badgeColor, accent, gradient, sparkline }: {
  label: string; value: string; sub: string; badge: string
  badgeColor: string; accent: string; gradient: string; sparkline: number[]
}) {
  return (
    <div className="rounded-2xl overflow-hidden relative" style={{ background: gradient, boxShadow: `0 8px 24px ${accent}30` }}>
      {/* Decorative blur */}
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-20 blur-2xl pointer-events-none"
           style={{ background: '#ffffff' }} />
      <div className="p-5">
        {/* Top row */}
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-semibold text-white/60 uppercase tracking-widest">{label}</p>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: `${badgeColor}25`, color: badgeColor, border: `1px solid ${badgeColor}40` }}>
            {badge}
          </span>
        </div>
        {/* Value */}
        <p className="text-3xl font-black text-white tracking-tight leading-none mb-1">{value}</p>
        <p className="text-xs text-white/50 truncate mb-3">{sub}</p>
        {/* Sparkline */}
        <Sparkline data={sparkline} color="rgba(255,255,255,0.8)" />
      </div>
    </div>
  )
}

function PlaceholderView({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center space-y-2">
      <LayoutDashboard className="w-10 h-10" style={{ color: 'var(--border)' }} />
      <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{description}</p>
    </div>
  )
}
