'use client'

import { useState } from 'react'
import { Copy, Check, Lock, FileText } from 'lucide-react'
import { TEMPLATE_SECTIONS } from '@/lib/template'
import type { TestPlanSections } from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  testPlan: TestPlanSections
  ticketId: string
  generatedAt: string
}

export default function TestPlanViewer({ testPlan, ticketId, generatedAt }: Props) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<string>(TEMPLATE_SECTIONS[0].key)

  async function copySection(key: string, content: string) {
    await navigator.clipboard.writeText(content)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const active = TEMPLATE_SECTIONS.find(s => s.key === activeSection)
  const filledCount = TEMPLATE_SECTIONS.filter(s => !s.humanOnly && testPlan[s.key]).length

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
               style={{ background: 'rgba(91,33,182,0.08)', border: '1px solid rgba(91,33,182,0.18)' }}>
            <FileText className="w-4 h-4" style={{ color: '#5B21B6' }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Test Plan</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              <span className="font-mono px-1.5 py-0.5 rounded text-[11px]"
                    style={{ background: 'rgba(91,33,182,0.08)', color: '#5B21B6' }}>{ticketId}</span>
              <span className="ml-2">{new Date(generatedAt).toLocaleString()}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs hidden sm:block" style={{ color: 'var(--text-secondary)' }}>{filledCount}/{TEMPLATE_SECTIONS.filter(s => !s.humanOnly).length} sections</span>
          <button
            onClick={() => copySection('all', formatFullPlan(testPlan))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            {copiedKey === 'all' ? <Check className="w-3.5 h-3.5" style={{ color: '#4ade80' }} /> : <Copy className="w-3.5 h-3.5" />}
            Copy All
          </button>
        </div>
      </div>

      <div className="flex" style={{ height: '600px' }}>
        {/* Section Nav */}
        <nav className="w-48 overflow-y-auto py-2 px-2 space-y-0.5 shrink-0"
             style={{ borderRight: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
          {TEMPLATE_SECTIONS.map((section, idx) => {
            const isActive = activeSection === section.key
            const hasContent = !section.humanOnly && !!testPlan[section.key]
            return (
              <button
                key={section.key}
                onClick={() => setActiveSection(section.key)}
                className="w-full text-left px-3 py-2 rounded-lg text-xs flex items-center gap-2 transition-all"
                style={isActive
                  ? { background: '#5B21B6', color: '#fff', boxShadow: '0 2px 10px rgba(91,33,182,0.3)' }
                  : { color: 'var(--text-secondary)' }
                }
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(91,33,182,0.08)' }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '' }}
              >
                {section.humanOnly
                  ? <Lock className="w-3 h-3 shrink-0" style={{ color: isActive ? 'rgba(255,255,255,0.7)' : '#E11D48' }} />
                  : <span className="shrink-0 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                          style={isActive
                            ? { background: 'rgba(255,255,255,0.25)', color: '#fff' }
                            : hasContent
                              ? { background: 'rgba(74,222,128,0.12)', color: '#4ade80' }
                              : { background: 'var(--border)', color: 'var(--text-secondary)' }
                          }>{idx + 1}</span>
                }
                <span className="leading-tight">{section.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{ background: 'var(--bg-card)' }}>
          {active && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {active.humanOnly && <Lock className="w-4 h-4" style={{ color: '#E11D48' }} />}
                  <h4 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{active.label}</h4>
                </div>
                {!active.humanOnly && testPlan[active.key] && (
                  <button
                    onClick={() => copySection(active.key, testPlan[active.key])}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                  >
                    {copiedKey === active.key
                      ? <><Check className="w-3 h-3" style={{ color: '#4ade80' }} /> Copied</>
                      : <><Copy className="w-3 h-3" /> Copy</>
                    }
                  </button>
                )}
              </div>

              <div className="mb-5" style={{ borderBottom: '1px solid var(--border)' }} />

              {active.humanOnly ? (
                <div className="flex items-start gap-3 rounded-xl p-4"
                     style={{ background: 'rgba(225,29,72,0.07)', border: '1px solid rgba(225,29,72,0.2)' }}>
                  <Lock className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#E11D48' }} />
                  <p className="text-sm italic leading-relaxed" style={{ color: '#E11D48', opacity: 0.85 }}>
                    This section requires human sign-off and has been intentionally left blank.
                  </p>
                </div>
              ) : testPlan[active.key] ? (
                <FormattedContent content={testPlan[active.key]} />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
                       style={{ background: 'var(--bg-secondary)' }}>
                    <FileText className="w-5 h-5" style={{ color: 'var(--border)' }} />
                  </div>
                  <p className="text-sm italic" style={{ color: 'var(--text-secondary)' }}>No content generated for this section.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function normalizeContent(raw: string): string {
  return raw
    .replace(/\s+(\d+)\.\s+/g, (_, n) => `\n${n}. `)
    .replace(/\s+[-•]\s+/g, '\n• ')
    .trim()
}

function FormattedContent({ content }: { content: string }) {
  const normalized = normalizeContent(content)
  const lines = normalized.split('\n').filter(l => l.trim() !== '')

  return (
    <div className="space-y-2.5 text-sm leading-relaxed">
      {lines.map((line, i) => {
        const trimmed = line.trim()

        const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)/)
        if (numberedMatch) {
          return (
            <div key={i} className="flex gap-3 items-start">
              <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5"
                    style={{ background: 'rgba(91,33,182,0.12)', color: '#5B21B6' }}>
                {numberedMatch[1]}
              </span>
              <span style={{ color: 'var(--text-primary)' }}>{numberedMatch[2]}</span>
            </div>
          )
        }

        if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
          return (
            <div key={i} className="flex gap-3 items-start">
              <span className="shrink-0 mt-[7px] w-1.5 h-1.5 rounded-full" style={{ background: '#5B21B6' }} />
              <span style={{ color: 'var(--text-primary)' }}>{trimmed.replace(/^[-•]\s+/, '')}</span>
            </div>
          )
        }

        if (trimmed === trimmed.toUpperCase() && trimmed.length > 3 && !/\d/.test(trimmed)) {
          return (
            <p key={i} className="font-semibold mt-5 mb-1 text-xs uppercase tracking-widest"
               style={{ color: '#5B21B6' }}>
              {trimmed}
            </p>
          )
        }

        if (trimmed.endsWith(':') && trimmed.length < 60) {
          return (
            <p key={i} className="font-semibold mt-4 mb-1" style={{ color: 'var(--text-primary)' }}>
              {trimmed}
            </p>
          )
        }

        return <p key={i} style={{ color: 'var(--text-primary)' }}>{trimmed}</p>
      })}
    </div>
  )
}

function formatFullPlan(plan: TestPlanSections): string {
  return TEMPLATE_SECTIONS.map(s => `## ${s.label}\n\n${s.humanOnly ? '[Human sign-off required]' : plan[s.key] || ''}`).join('\n\n---\n\n')
}
