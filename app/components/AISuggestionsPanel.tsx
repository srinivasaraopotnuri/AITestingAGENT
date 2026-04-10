'use client'

import { Lightbulb, ShieldAlert, Zap, Bug, FlaskConical, Plus } from 'lucide-react'
import type { AISuggestion, TestCasePriority } from '@/types'

interface Props {
  suggestions: AISuggestion[]
  onAddSuggestion?: (s: AISuggestion) => void
}

const TYPE_CONFIG: Record<AISuggestion['type'], { label: string; color: string; bg: string; icon: React.ElementType }> = {
  missing_scenario: { label: 'Missing Scenario', color: '#5B21B6', bg: 'rgba(91,33,182,0.08)',  icon: Lightbulb   },
  edge_case:        { label: 'Edge Case',         color: '#D97706', bg: 'rgba(217,119,6,0.08)',  icon: FlaskConical },
  negative_test:    { label: 'Negative Test',     color: '#E11D48', bg: 'rgba(225,29,72,0.08)',  icon: Bug         },
  security:         { label: 'Security',           color: '#DC2626', bg: 'rgba(220,38,38,0.08)', icon: ShieldAlert },
  performance:      { label: 'Performance',        color: '#2563EB', bg: 'rgba(37,99,235,0.08)', icon: Zap         },
}

const PRIORITY_COLOR: Record<TestCasePriority, string> = {
  Critical: '#DC2626',
  High:     '#E11D48',
  Medium:   '#D97706',
  Low:      '#64748b',
}

export default function AISuggestionsPanel({ suggestions, onAddSuggestion }: Props) {
  if (!suggestions.length) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Lightbulb className="w-4 h-4" style={{ color: '#D97706' }} />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          AI Suggestions ({suggestions.length})
        </h3>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: 'rgba(217,119,6,0.1)', color: '#D97706', border: '1px solid rgba(217,119,6,0.2)' }}>
          Review coverage gaps
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {suggestions.map((s, i) => {
          const cfg = TYPE_CONFIG[s.type]
          const Icon = cfg.icon
          return (
            <div key={i}
                 className="flex items-start gap-3 p-3.5 rounded-xl transition-all"
                 style={{ background: cfg.bg, border: `1px solid ${cfg.color}25` }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                   style={{ background: `${cfg.color}18`, border: `1px solid ${cfg.color}30` }}>
                <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                        style={{ background: `${cfg.color}20`, color: cfg.color }}>
                    {cfg.label}
                  </span>
                  <span className="text-[10px] font-semibold"
                        style={{ color: PRIORITY_COLOR[s.suggestedPriority] }}>
                    {s.suggestedPriority} priority
                  </span>
                </div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{s.title}</p>
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{s.description}</p>
              </div>

              {onAddSuggestion && (
                <button
                  onClick={() => onAddSuggestion(s)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all hover:opacity-80"
                  style={{ background: cfg.color, color: '#fff' }}
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
