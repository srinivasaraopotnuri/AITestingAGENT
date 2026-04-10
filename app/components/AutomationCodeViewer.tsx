'use client'

import { useState } from 'react'
import { Copy, Check, AlertTriangle, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AutomationScript, AutomationFramework } from '@/types'

interface Props {
  script: AutomationScript
}

const FRAMEWORK_LABELS: Record<AutomationFramework, string> = {
  'selenium-java': 'Selenium (Java / TestNG)',
  'playwright-ts':  'Playwright (TypeScript)',
  'playwright-js':  'Playwright (JavaScript)',
}

export default function AutomationCodeViewer({ script }: Props) {
  const [activeTab, setActiveTab] = useState<'page' | 'test'>('page')
  const [copied, setCopied] = useState<'page' | 'test' | null>(null)

  function copy(which: 'page' | 'test') {
    const code = which === 'page' ? script.pageObjectCode : script.testCode
    navigator.clipboard.writeText(code).then(() => {
      setCopied(which)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  function download(which: 'page' | 'test') {
    const code = which === 'page' ? script.pageObjectCode : script.testCode
    const name = which === 'page' ? `${script.className}.${fileExt}` : script.testFileName
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = name; a.click()
    URL.revokeObjectURL(url)
  }

  const fileExt = script.framework === 'selenium-java' ? 'java'
    : script.framework === 'playwright-ts' ? 'ts' : 'js'

  const tabs = [
    { key: 'page' as const, label: `Page Object (${script.className}.${fileExt})` },
    { key: 'test' as const, label: `Test File (${script.testFileName})` },
  ]

  return (
    <div className="space-y-3">
      {/* Disclaimer */}
      <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs"
           style={{ background: 'rgba(217,119,6,0.07)', border: '1px solid rgba(217,119,6,0.2)', color: '#D97706' }}>
        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>Generated code requires review. Locators and selectors may need adjustments for your specific application.</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Framework</p>
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{FRAMEWORK_LABELS[script.framework]}</p>
        </div>
        <span className="text-xs px-2 py-1 rounded-full"
              style={{ background: 'rgba(91,33,182,0.08)', border: '1px solid rgba(91,33,182,0.2)', color: '#5B21B6' }}>
          {new Date(script.generatedAt).toLocaleString()}
        </span>
      </div>

      {/* Tab Bar */}
      <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={cn('flex-1 py-2.5 text-xs font-medium transition-all truncate px-3')}
            style={activeTab === t.key
              ? { background: '#5B21B6', color: '#fff' }
              : { color: 'var(--text-secondary)' }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Code Block */}
      <div className="relative rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-4 py-2"
             style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
          <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
            {activeTab === 'page' ? `${script.className}.${fileExt}` : script.testFileName}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => download(activeTab)}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all hover:opacity-80"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            >
              <Download className="w-3 h-3" /> Download
            </button>
            <button
              onClick={() => copy(activeTab)}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all hover:opacity-80"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: copied === activeTab ? '#10B981' : 'var(--text-secondary)' }}
            >
              {copied === activeTab ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied === activeTab ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
        <pre className="p-4 overflow-auto max-h-[500px] text-xs leading-relaxed font-mono"
             style={{ background: '#0f0f14', color: '#e2e8f0' }}>
          {activeTab === 'page' ? script.pageObjectCode : script.testCode}
        </pre>
      </div>
    </div>
  )
}
