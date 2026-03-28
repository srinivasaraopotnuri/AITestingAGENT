'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Loader2, Plus, Zap, Database } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SourceConnection, LLMConnection, ConnectionStatus, SourceType, LLMProvider } from '@/types'

interface Props {
  onSourceSave: (conn: SourceConnection) => void
  onLLMSave: (conn: LLMConnection) => void
  savedSource: SourceConnection | null
  savedLLM: LLMConnection | null
}

const LLM_MODELS: Record<LLMProvider, string[]> = {
  groq: [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'mixtral-8x7b-32768',
    'gemma2-9b-it',
    'openai/gpt-4o-mini',
    'openai/gpt-oss-120b',
  ],
  openai: [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-3.5-turbo',
  ],
  ollama: ['llama3', 'llama3.1', 'mistral', 'codellama', 'phi3'],
  grok: ['grok-beta', 'grok-vision-beta'],
}

export default function ConnectionPanel({ onSourceSave, onLLMSave, savedSource, savedLLM }: Props) {
  const [activeTab, setActiveTab] = useState<'source' | 'llm'>('source')

  // Source form
  const [sourceType, setSourceType] = useState<SourceType>('jira')
  const [baseUrl, setBaseUrl] = useState('')
  const [email, setEmail] = useState('')
  const [apiToken, setApiToken] = useState('')
  const [projectKey, setProjectKey] = useState('')
  const [sourceStatus, setSourceStatus] = useState<ConnectionStatus>('idle')
  const [sourceMsg, setSourceMsg] = useState('')

  // LLM form
  const [llmProvider, setLLMProvider] = useState<LLMProvider>('groq')
  const [llmApiKey, setLLMApiKey] = useState('')
  const [llmBaseUrl, setLLMBaseUrl] = useState('')
  const [llmModel, setLLMModel] = useState(LLM_MODELS.groq[0])
  const [llmStatus, setLLMStatus] = useState<ConnectionStatus>('idle')
  const [llmMsg, setLLMMsg] = useState('')

  // Auto-populate from env on mount
  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(cfg => {
        if (cfg.jira.baseUrl) setBaseUrl(cfg.jira.baseUrl)
        if (cfg.jira.email) setEmail(cfg.jira.email)
        if (cfg.jira.apiToken) setApiToken(cfg.jira.apiToken)
        if (cfg.groq.apiKey) setLLMApiKey(cfg.groq.apiKey)
        setProjectKey('ATP')
      })
      .catch(() => {})
  }, [])

  // Auto-populate API key when provider changes
  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(cfg => {
        const keyMap: Record<LLMProvider, string> = {
          groq: cfg.groq?.apiKey || '',
          openai: cfg.openai?.apiKey || '',
          grok: cfg.grok?.apiKey || '',
          ollama: '',
        }
        setLLMApiKey(keyMap[llmProvider] || '')
        setLLMModel(LLM_MODELS[llmProvider][0])
        setLLMStatus('idle')
        setLLMMsg('')
      })
      .catch(() => {
        setLLMModel(LLM_MODELS[llmProvider][0])
      })
  }, [llmProvider])

  async function testSource() {
    setSourceStatus('testing')
    setSourceMsg('')
    try {
      const conn = { type: sourceType, baseUrl, email, apiToken, projectKey }
      const res = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'source', connection: conn }),
      })
      const data = await res.json()
      setSourceStatus(data.ok ? 'success' : 'error')
      setSourceMsg(data.ok ? `${data.message} — auto-saved` : data.message)
      // Auto-save on successful test
      if (data.ok) onSourceSave(conn)
    } catch {
      setSourceStatus('error')
      setSourceMsg('Network error')
    }
  }

  async function testLLM() {
    setLLMStatus('testing')
    setLLMMsg('')
    try {
      const conn = { provider: llmProvider, apiKey: llmApiKey, baseUrl: llmBaseUrl, model: llmModel }
      const res = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'llm', connection: conn }),
      })
      const data = await res.json()
      setLLMStatus(data.ok ? 'success' : 'error')
      setLLMMsg(data.ok ? `${data.message} — auto-saved` : data.message)
      // Auto-save on successful test
      if (data.ok) onLLMSave(conn)
    } catch {
      setLLMStatus('error')
      setLLMMsg('Network error')
    }
  }

  function saveSource() {
    onSourceSave({ type: sourceType, baseUrl, email, apiToken, projectKey })
  }

  function saveLLM() {
    onLLMSave({ provider: llmProvider, apiKey: llmApiKey, baseUrl: llmBaseUrl, model: llmModel })
  }

  const StatusIcon = ({ status }: { status: ConnectionStatus }) => {
    if (status === 'testing') return <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
    if (status === 'success') return <CheckCircle className="w-4 h-4 text-green-400" />
    if (status === 'error') return <XCircle className="w-4 h-4 text-red-400" />
    return null
  }

  const models = LLM_MODELS[llmProvider]

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Plus className="w-5 h-5 text-indigo-400" />
        <h2 className="text-lg font-semibold text-white">Connections</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-800 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('source')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all',
            activeTab === 'source' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
          )}
        >
          <Database className="w-4 h-4" />
          Source
          {savedSource && <span className="w-2 h-2 bg-green-400 rounded-full" />}
        </button>
        <button
          onClick={() => setActiveTab('llm')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all',
            activeTab === 'llm' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
          )}
        >
          <Zap className="w-4 h-4" />
          LLM
          {savedLLM && <span className="w-2 h-2 bg-green-400 rounded-full" />}
        </button>
      </div>

      {/* Source Tab */}
      {activeTab === 'source' && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Platform</label>
            <select
              value={sourceType}
              onChange={e => setSourceType(e.target.value as SourceType)}
              className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm"
            >
              <option value="jira">Jira</option>
              <option value="ado">Azure DevOps</option>
              <option value="xray">X-Ray</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Base URL</label>
            <input
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              placeholder="https://yourorg.atlassian.net"
              className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm placeholder-gray-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Email</label>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm placeholder-gray-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">API Token</label>
            <input
              type="password"
              value={apiToken}
              onChange={e => setApiToken(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm placeholder-gray-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Project Key <span className="text-gray-500">(optional)</span></label>
            <input
              value={projectKey}
              onChange={e => setProjectKey(e.target.value)}
              placeholder="ATP"
              className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm placeholder-gray-500"
            />
          </div>

          {sourceMsg && (
            <div className={cn('flex items-center gap-2 text-xs p-2 rounded-lg',
              sourceStatus === 'success' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
            )}>
              <StatusIcon status={sourceStatus} />
              {sourceMsg}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={testSource}
              disabled={sourceStatus === 'testing'}
              className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              <StatusIcon status={sourceStatus} />
              Test Connection
            </button>
            <button
              onClick={saveSource}
              className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* LLM Tab */}
      {activeTab === 'llm' && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Provider</label>
            <select
              value={llmProvider}
              onChange={e => setLLMProvider(e.target.value as LLMProvider)}
              className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm"
            >
              <option value="groq">Groq</option>
              <option value="openai">OpenAI</option>
              <option value="ollama">Ollama (Local)</option>
              <option value="grok">Grok (xAI)</option>
            </select>
          </div>

          {llmProvider !== 'ollama' && (
            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                API Key
                {llmApiKey && <span className="ml-2 text-green-400">● auto-filled from .env</span>}
              </label>
              <input
                type="password"
                value={llmApiKey}
                onChange={e => setLLMApiKey(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm placeholder-gray-500"
              />
            </div>
          )}

          {llmProvider === 'ollama' && (
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Ollama Base URL</label>
              <input
                value={llmBaseUrl}
                onChange={e => setLLMBaseUrl(e.target.value)}
                placeholder="http://localhost:11434"
                className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm placeholder-gray-500"
              />
            </div>
          )}

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Model</label>
            <select
              value={llmModel}
              onChange={e => setLLMModel(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm"
            >
              {models.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {llmMsg && (
            <div className={cn('flex items-center gap-2 text-xs p-2 rounded-lg',
              llmStatus === 'success' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
            )}>
              <StatusIcon status={llmStatus} />
              {llmMsg}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={testLLM}
              disabled={llmStatus === 'testing'}
              className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              <StatusIcon status={llmStatus} />
              Test Connection
            </button>
            <button
              onClick={saveLLM}
              className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
