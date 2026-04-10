'use client'

import { LayoutDashboard, Settings2, PenLine, FileInput, ClipboardList, Zap, Star, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LLMConnection, SourceConnection } from '@/types'

type NavKey = 'dashboard' | 'configuration' | 'user-input' | 'jira-input' | 'test-plan' | 'test-cases' | 'test-strategy'

interface Props {
  activeNav: string
  onNav: (key: NavKey) => void
  collapsed: boolean
  onToggle: () => void
  llmConn: LLMConnection | null
  sourceConn: SourceConnection | null
}

const NAV = [
  { section: 'MAIN',      items: [
    { key: 'dashboard'     as NavKey, label: 'Dashboard',               icon: LayoutDashboard },
  ]},
  { section: 'CONFIGURE', items: [
    { key: 'configuration' as NavKey, label: 'Configuration',           icon: Settings2 },
  ]},
  { section: 'GENERATE',  items: [
    { key: 'user-input'    as NavKey, label: 'User Input',              icon: PenLine },
    { key: 'jira-input'    as NavKey, label: 'JIRA / ADO Input',        icon: FileInput },
    { key: 'test-plan'     as NavKey, label: 'Test Plan Generator',     icon: ClipboardList },
    { key: 'test-cases'    as NavKey, label: 'Test Case Generator',     icon: Zap },
    { key: 'test-strategy' as NavKey, label: 'Test Strategy Generator', icon: Star },
  ]},
]

export default function Sidebar({ activeNav, onNav, collapsed, onToggle, llmConn, sourceConn }: Props) {
  return (
    <aside
      className="flex flex-col h-screen transition-all duration-200 shrink-0"
      style={{
        width: collapsed ? 60 : 220,
        background: '#0a0a0f',
        borderRight: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* Logo */}
      <div className="h-14 flex items-center px-4 gap-3 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#5B21B6,#7C3AED)' }}>
          <span className="text-white text-sm font-bold">✦</span>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-white text-sm font-bold leading-tight">Agentica</p>
            <p className="text-[10px] leading-tight" style={{ color: '#7C3AED' }}>Test Planner · AI</p>
          </div>
        )}
        <button onClick={onToggle} className="ml-auto p-1 rounded-md transition hover:bg-white/10" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {NAV.map(({ section, items }) => (
          <div key={section} className="mb-1">
            {!collapsed && (
              <p className="px-3 py-2 text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>{section}</p>
            )}
            {items.map(({ key, label, icon: Icon }) => {
              const active = activeNav === key
              return (
                <button
                  key={key}
                  onClick={() => onNav(key)}
                  title={collapsed ? label : undefined}
                  className={cn(
                    'w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 mb-0.5 text-left transition-all relative group',
                    active ? 'bg-[rgba(124,58,237,0.15)]' : 'hover:bg-white/5'
                  )}
                >
                  {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r bg-[#7C3AED]" />}
                  <Icon className="w-4 h-4 flex-shrink-0" style={{ color: active ? '#7C3AED' : 'rgba(255,255,255,0.35)' }} />
                  {!collapsed && (
                    <span className={cn('text-[13px] font-medium truncate', active ? 'text-[#a78bfa]' : 'text-white/35')}>
                      {label}
                    </span>
                  )}
                  {/* Tooltip when collapsed */}
                  {collapsed && (
                    <span className="absolute left-full ml-2 px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50"
                      style={{ background: '#1c1c28', color: '#f0f0f5', border: '1px solid rgba(255,255,255,0.1)' }}>
                      {label}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Status bar */}
      {!collapsed && (
        <div className="px-3 py-2 mx-2 mb-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: llmConn ? '#10B981' : '#6b7280' }} />
            <span className="text-[11px] truncate" style={{ color: llmConn ? '#10B981' : 'rgba(255,255,255,0.3)' }}>
              {llmConn ? `${llmConn.provider} · ${llmConn.model.split('/').pop()}` : 'LLM not configured'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: sourceConn ? '#10B981' : '#6b7280' }} />
            <span className="text-[11px] truncate" style={{ color: sourceConn ? '#10B981' : 'rgba(255,255,255,0.3)' }}>
              {sourceConn ? `${sourceConn.type.toUpperCase()} · Connected` : 'Source not configured'}
            </span>
          </div>
        </div>
      )}

      {/* User footer */}
      <div className="shrink-0 px-2 pb-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 10 }}>
        <div className={cn('flex items-center rounded-xl px-3 py-2.5 gap-2.5', collapsed && 'justify-center px-0')}
          style={{ background: 'rgba(91,33,182,0.1)', border: '1px solid rgba(91,33,182,0.18)' }}>
          <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
            style={{ background: 'rgba(91,33,182,0.3)' }}>S</div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold truncate" style={{ color: 'rgba(255,255,255,0.7)' }}>srinivasarao</p>
              <p className="text-[10px]" style={{ color: '#7C3AED' }}>ATP Project</p>
            </div>
          )}
          {!collapsed && (
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#10B981', animation: 'pulse 2s infinite' }} />
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
