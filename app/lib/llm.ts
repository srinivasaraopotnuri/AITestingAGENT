import Groq from 'groq-sdk'
import type { LLMConnection } from '@/types'

// Groq free tier has tight TPM limits; other providers can handle much more
const MAX_TOKENS_GROQ = 4000
const MAX_TOKENS_DEFAULT = 8192

export async function callLLM(
  prompt: string,
  connection: LLMConnection,
  options: { maxTokens?: number; temperature?: number; systemPrompt?: string } = {}
): Promise<string> {
  const defaultMax = connection.provider === 'groq' ? MAX_TOKENS_GROQ : MAX_TOKENS_DEFAULT
  const { maxTokens = defaultMax, temperature = 0.3, systemPrompt } = options

  const messages: { role: 'system' | 'user'; content: string }[] = [
    ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
    { role: 'user', content: prompt },
  ]

  switch (connection.provider) {
    case 'groq': {
      const client = new Groq({ apiKey: connection.apiKey })
      const completion = await client.chat.completions.create({
        model: connection.model || 'llama-3.3-70b-versatile',
        messages,
        temperature,
        max_tokens: maxTokens,
      })
      return completion.choices[0]?.message?.content || ''
    }

    case 'ollama': {
      const baseUrl = connection.baseUrl || 'http://localhost:11434'
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: connection.model || 'llama3',
          messages,
          stream: false,
        }),
      })
      if (!response.ok) throw new Error(`Ollama error: ${response.statusText}`)
      const data = await response.json()
      return data.message?.content || ''
    }

    case 'openai': {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${connection.apiKey}`,
        },
        body: JSON.stringify({
          model: connection.model || 'gpt-4o',
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
      })
      if (!response.ok) throw new Error(`OpenAI error: ${response.statusText}`)
      const data = await response.json()
      return data.choices[0]?.message?.content || ''
    }

    case 'grok': {
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${connection.apiKey}`,
        },
        body: JSON.stringify({
          model: connection.model || 'grok-beta',
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
      })
      if (!response.ok) throw new Error(`Grok error: ${response.statusText}`)
      const data = await response.json()
      return data.choices[0]?.message?.content || ''
    }

    case 'openrouter': {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${connection.apiKey}`,
          'HTTP-Referer': 'https://agentica-atp.app',
          'X-Title': 'Agentica Test Planner',
        },
        body: JSON.stringify({
          model: connection.model || 'openai/gpt-4o-mini',
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
      })
      if (!response.ok) {
        if (response.status === 402) {
          throw new Error('OpenRouter: No credits — add credits at openrouter.ai/credits, or switch to a free model (e.g. meta-llama/llama-3.3-70b-instruct:free)')
        }
        const errBody = await response.json().catch(() => ({}))
        throw new Error(`OpenRouter error: ${errBody?.error?.message || response.statusText}`)
      }
      const data = await response.json()
      return data.choices[0]?.message?.content || ''
    }

    default:
      throw new Error(`Unknown LLM provider: ${connection.provider}`)
  }
}

export function parseJSON<T>(raw: string): T {
  let cleaned = raw.trim()
  // Strip opening fence: ```json or ```JSON or just ```
  cleaned = cleaned.replace(/^```[a-zA-Z]*\s*\n?/, '')
  // Strip closing fence
  cleaned = cleaned.replace(/\n?```\s*$/, '')
  cleaned = cleaned.trim()

  // First attempt: direct parse
  try {
    return JSON.parse(cleaned) as T
  } catch {
    // Second attempt: repair truncated JSON
    return JSON.parse(repairTruncatedJSON(cleaned)) as T
  }
}

/**
 * Attempts to repair a truncated JSON string by closing open strings,
 * objects, and arrays. Handles the common case where a large LLM response
 * is cut off mid-string due to token limits.
 */
function repairTruncatedJSON(raw: string): string {
  const stack: string[] = []
  let inString = false
  let escape = false

  for (let i = 0; i < raw.length; i++) {
    const c = raw[i]
    if (escape) { escape = false; continue }
    if (c === '\\' && inString) { escape = true; continue }
    if (c === '"') {
      inString = !inString
      continue
    }
    if (!inString) {
      if (c === '{') stack.push('}')
      else if (c === '[') stack.push(']')
      else if (c === '}' || c === ']') stack.pop()
    }
  }

  let repaired = raw
  // Close any open string
  if (inString) repaired += '"'
  // Close any trailing comma before closing (invalid JSON)
  repaired = repaired.replace(/,\s*$/, '')
  // Close all open structures in reverse order
  while (stack.length) repaired += stack.pop()!

  return repaired
}
