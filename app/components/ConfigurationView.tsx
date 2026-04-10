'use client'

import { useState, useEffect } from 'react'
import { Zap, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import type { LLMConnection, LLMProvider, ConnectionStatus } from '@/types'

const LLM_MODELS: Record<LLMProvider, string[]> = {
  groq:        ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
  openai:      ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  ollama:      ['gemma4:e4b', 'llama3', 'llama3.1', 'mistral', 'codellama', 'phi3'],
  grok:        ['grok-beta', 'grok-vision-beta'],
  openrouter:  [
    // Free models (no credits required)
    'meta-llama/llama-3.3-70b-instruct:free',
    'meta-llama/llama-3.1-8b-instruct:free',
    'mistralai/mistral-7b-instruct:free',
    'google/gemma-3-27b-it:free',
    'deepseek/deepseek-r1:free',
    // Paid models
    'openai/gpt-4o',
    'openai/gpt-4o-mini',
    'anthropic/claude-3.5-sonnet',
    'anthropic/claude-3-haiku',
    'google/gemini-pro-1.5',
    'meta-llama/llama-3.3-70b-instruct',
    'mistralai/mistral-large',
    'deepseek/deepseek-r1',
  ],
}

interface Props {
  llmConn: LLMConnection | null
  onLLMConnChange: (c: LLMConnection | null) => void
}

const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-[#5B21B6]'
const inputStyle = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
}

export default function ConfigurationView({ llmConn, onLLMConnChange }: Props) {
  const [provider, setProvider]   = useState<LLMProvider>('groq')
  const [model, setModel]         = useState('llama-3.3-70b-versatile')
  const [apiKey, setApiKey]       = useState('')
  const [baseUrl, setBaseUrl]     = useState('http://localhost:11434')
  const [status, setStatus]       = useState<ConnectionStatus>('idle')
  const [message, setMessage]     = useState('')
  const [initDone, setInitDone]   = useState(false)
  const [providerReady, setProviderReady] = useState(false)

  // Initialize from existing connection
  useEffect(() => {
    if (initDone || !llmConn) return
    setInitDone(true)
    setProvider(llmConn.provider)
    setModel(llmConn.model)
    setApiKey(llmConn.apiKey || '')
    setBaseUrl(llmConn.baseUrl || 'http://localhost:11434')
    setStatus('success')
    setMessage('Restored from previous session')
  }, [llmConn, initDone])

  // Reset model when provider changes
  useEffect(() => {
    if (!providerReady) { setProviderReady(true); return }
    setModel(LLM_MODELS[provider][0])
    setStatus('idle')
    setMessage('')
    onLLMConnChange(null)
  }, [provider]) // eslint-disable-line react-hooks/exhaustive-deps

  async function testConnection() {
    setStatus('testing')
    setMessage('')
    const conn: LLMConnection = { provider, model, apiKey, baseUrl }
    try {
      const res  = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'llm', connection: conn }),
      })
      const data = await res.json()
      setStatus(data.ok ? 'success' : 'error')
      setMessage(data.message)
      if (data.ok) {
        onLLMConnChange(conn)
        localStorage.setItem('atp_llm_conn', JSON.stringify(conn))
      }
    } catch {
      setStatus('error')
      setMessage('Network error — check your connection')
    }
  }

  const isConnected = llmConn !== null && status === 'success'

  return (
    <div className="flex items-start justify-center pt-8">
      <div className="w-full" style={{ maxWidth: 700 }}>

        {/* Card */}
        <div className="rounded-2xl overflow-hidden shadow-sm"
             style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>

          {/* Header */}
          <div className="px-7 py-6 flex items-center gap-4"
               style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                 style={{ background: 'rgba(91,33,182,0.08)', border: '1px solid rgba(91,33,182,0.18)' }}>
              <Zap className="w-5 h-5" style={{ color: '#5B21B6' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  LLM Configuration
                </h2>
                {isConnected && (
                  <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.25)' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#10B981' }} />
                    Connected
                  </span>
                )}
              </div>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Configure your AI provider to power test generation
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="px-7 py-6 space-y-5">

            {/* Provider */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Provider
              </label>
              <select
                value={provider}
                onChange={e => setProvider(e.target.value as LLMProvider)}
                className={inputCls}
                style={inputStyle}
              >
                <option value="groq">Groq ★ Recommended</option>
                <option value="openai">OpenAI</option>
                <option value="openrouter">OpenRouter</option>
                <option value="ollama">Ollama (Local)</option>
                <option value="grok">Grok (xAI)</option>
              </select>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {provider === 'groq'       && '★ Recommended — free, fast, high quality. Best model: llama-3.3-70b-versatile'}
                {provider === 'openai'     && 'OpenAI GPT models via official API'}
                {provider === 'openrouter' && 'Access 200+ models via OpenRouter. Models ending in :free require no credits.'}
                {provider === 'ollama'     && 'Self-hosted models via local Ollama instance'}
                {provider === 'grok'       && 'xAI Grok models via x.ai API'}
              </p>
            </div>

            {/* Model */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Model
              </label>
              <select
                value={model}
                onChange={e => setModel(e.target.value)}
                className={inputCls}
                style={inputStyle}
              >
                {LLM_MODELS[provider].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              {provider === 'groq' && model === 'llama-3.3-70b-versatile' && (
                <p className="text-xs font-semibold" style={{ color: '#10B981' }}>
                  ★ Recommended — best balance of speed, quality, and cost (free)
                </p>
              )}
              {provider === 'openrouter' && model === 'anthropic/claude-3.5-sonnet' && (
                <p className="text-xs font-semibold" style={{ color: '#10B981' }}>
                  ★ Highest quality output for test plans and strategies
                </p>
              )}
              {provider === 'openrouter' && model.endsWith(':free') && (
                <p className="text-xs font-semibold" style={{ color: '#0284c7' }}>
                  ✓ Free model — no credits required
                </p>
              )}
            </div>

            {/* API Key or Base URL */}
            {provider !== 'ollama' ? (
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="Enter your API key"
                  className={inputCls}
                  style={{ ...inputStyle, fontFamily: 'monospace' }}
                />
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Your key is stored locally in the browser and never sent to our servers.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Base URL
                </label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={e => setBaseUrl(e.target.value)}
                  placeholder="http://localhost:11434"
                  className={inputCls}
                  style={inputStyle}
                />
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  URL of your local Ollama instance (default: http://localhost:11434)
                </p>
              </div>
            )}

            {/* Status Banner */}
            {message && (
              <div className="flex items-start gap-3 rounded-xl px-4 py-3"
                   style={status === 'success'
                     ? { background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }
                     : { background: 'rgba(225,29,72,0.08)', border: '1px solid rgba(225,29,72,0.2)' }
                   }>
                {status === 'success'
                  ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#10B981' }} />
                  : <XCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#E11D48' }} />
                }
                <span className="text-sm" style={{ color: status === 'success' ? '#10B981' : '#E11D48' }}>
                  {message}
                </span>
              </div>
            )}

            {/* Test Button */}
            <button
              onClick={testConnection}
              disabled={status === 'testing' || (!apiKey && provider !== 'ollama')}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: '#5B21B6', color: '#fff', boxShadow: '0 4px 14px rgba(91,33,182,0.35)' }}
              onMouseEnter={e => { if (!e.currentTarget.disabled) (e.currentTarget as HTMLElement).style.background = '#7C3AED' }}
              onMouseLeave={e => { if (!e.currentTarget.disabled) (e.currentTarget as HTMLElement).style.background = '#5B21B6' }}
            >
              {status === 'testing'
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Testing Connection...</>
                : <><Zap className="w-4 h-4" /> Test Connection</>
              }
            </button>
          </div>

          {/* Info Footer */}
          <div className="px-7 py-4 flex items-center gap-2"
               style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <div className="w-1.5 h-1.5 rounded-full shrink-0"
                 style={{ background: isConnected ? '#10B981' : 'var(--border)' }} />
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {isConnected
                ? `Connected to ${llmConn?.provider} · ${llmConn?.model}`
                : 'Not connected — enter credentials and click Test Connection'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
