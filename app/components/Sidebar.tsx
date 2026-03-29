'use client'

import { LayoutDashboard, Sparkles, History, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  activeNav: string
  onNav: (key: string) => void
  collapsed: boolean
  onToggle: () => void
}

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard',    icon: LayoutDashboard },
  { key: 'generate',  label: 'Generate Plan', icon: Sparkles },
  { key: 'history',   label: 'History',       icon: History },
]

export default function Sidebar({ activeNav, onNav, collapsed, onToggle }: Props) {
  return (
    <aside
      className={cn('flex flex-col h-full transition-all duration-300 relative shrink-0', collapsed ? 'w-[60px]' : 'w-[220px]')}
      style={{ background: 'var(--bg-sidebar)', borderRight: '1px solid rgba(255,255,255,0.05)' }}
    >
      {/* Logo */}
      <div
        className={cn('flex items-center gap-3 px-4 h-14 shrink-0', collapsed && 'justify-center px-0')}
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="w-8 h-8 rounded-xl animated-border p-[1.5px] shrink-0">
          <div className="w-full h-full rounded-[10px] flex items-center justify-center"
               style={{ background: 'var(--bg-sidebar)' }}>
            <Sparkles className="w-4 h-4" style={{ color: '#7C3AED' }} />
          </div>
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-white font-bold text-sm leading-none tracking-tight">Agentica</p>
            <p className="text-[11px] mt-0.5" style={{ color: '#7C3AED', opacity: 0.8 }}>Test Planner · AI</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
          const isActive = activeNav === key
          return (
            <button
              key={key}
              onClick={() => onNav(key)}
              title={collapsed ? label : undefined}
              className={cn(
                'w-full flex items-center gap-3 rounded-xl text-sm transition-all duration-150 relative',
                collapsed ? 'justify-center p-[11px]' : 'px-3 py-2.5'
              )}
              style={isActive
                ? { background: 'rgba(124,58,237,0.15)', color: '#7C3AED' }
                : { color: 'rgba(255,255,255,0.35)' }
              }
              onMouseEnter={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'
                  ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.75)'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = ''
                  ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.35)'
                }
              }}
            >
              {isActive && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                  style={{ background: '#7C3AED' }}
                />
              )}
              <Icon className="shrink-0 w-4 h-4" />
              {!collapsed && <span className="font-medium">{label}</span>}
            </button>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-[52px] w-6 h-6 rounded-full flex items-center justify-center text-white z-20 transition-colors"
        style={{ background: '#5B21B6', border: '2px solid var(--bg-sidebar)', boxShadow: '0 4px 14px rgba(91,33,182,0.5)' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#7C3AED' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#5B21B6' }}
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* Footer */}
      <div
        className={cn('px-3 py-4 shrink-0', collapsed && 'flex justify-center px-2')}
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        {!collapsed ? (
          <div className="rounded-xl px-3 py-2.5"
               style={{ background: 'rgba(91,33,182,0.1)', border: '1px solid rgba(91,33,182,0.18)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                     style={{ background: 'rgba(91,33,182,0.25)' }}>
                  <span className="text-[10px] font-bold text-white">J</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold truncate" style={{ color: 'rgba(255,255,255,0.7)' }}>srinivasarao-jira</p>
                  <p className="text-[10px]" style={{ color: '#7C3AED' }}>ATP Project</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#10B981' }} />
                <span className="text-[9px] font-medium" style={{ color: '#10B981' }}>Live</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-xl flex items-center justify-center relative"
               style={{ background: 'rgba(91,33,182,0.12)', border: '1px solid rgba(91,33,182,0.2)' }}>
            <span className="text-[10px] font-bold text-white">J</span>
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#0f0f14]"
                  style={{ background: '#10B981' }} />
          </div>
        )}
      </div>
    </aside>
  )
}
