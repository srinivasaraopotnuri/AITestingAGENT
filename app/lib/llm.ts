import Groq from 'groq-sdk'
import type { LLMConnection } from '@/types'

// Groq supports up to 8192 output tokens on llama-3.3-70b-versatile (free tier)
const MAX_TOKENS_GROQ = 8192
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
  // Strip code fences: ```json ... ``` or ``` ... ```
  cleaned = cleaned.replace(/^```[a-zA-Z]*\s*\n?/, '').replace(/\n?```\s*$/, '').trim()

  // Extract only the outermost JSON object (strips any preamble/epilogue text)
  const objStart = cleaned.indexOf('{')
  const objEnd   = cleaned.lastIndexOf('}')
  if (objStart !== -1 && objEnd > objStart) {
    cleaned = cleaned.slice(objStart, objEnd + 1)
  }

  // Attempt 1: direct parse
  try { return JSON.parse(cleaned) as T } catch { /* fall through */ }

  // Attempt 2: fix unescaped literal newlines/tabs inside string values
  try { return JSON.parse(sanitizeStringValues(cleaned)) as T } catch { /* fall through */ }

  // Attempt 3: repair truncated JSON (missing closing brackets/braces)
  try { return JSON.parse(repairTruncatedJSON(cleaned)) as T } catch { /* fall through */ }

  // Attempt 4: sanitize + repair combined
  try { return JSON.parse(repairTruncatedJSON(sanitizeStringValues(cleaned))) as T } catch { /* fall through */ }

  // Attempt 5: extract key-value pairs manually and build a best-effort object
  return extractKeyValues<T>(cleaned)
}

/**
 * Escapes literal newlines, tabs, and bare control characters that appear
 * inside JSON string values — a common LLM output mistake.
 */
function sanitizeStringValues(raw: string): string {
  // Replace literal newline/CR/tab inside strings with their escape sequences
  let result = ''
  let inString = false
  let escape = false
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i]
    if (escape) { escape = false; result += c; continue }
    if (c === '\\' && inString) { escape = true; result += c; continue }
    if (c === '"') { inString = !inString; result += c; continue }
    if (inString) {
      if (c === '\n') { result += '\\n'; continue }
      if (c === '\r') { result += '\\r'; continue }
      if (c === '\t') { result += '\\t'; continue }
    }
    result += c
  }
  return result
}

/**
 * Closes open strings / objects / arrays in a truncated JSON string.
 */
function repairTruncatedJSON(raw: string): string {
  const stack: string[] = []
  let inString = false
  let escape = false

  for (let i = 0; i < raw.length; i++) {
    const c = raw[i]
    if (escape) { escape = false; continue }
    if (c === '\\' && inString) { escape = true; continue }
    if (c === '"') { inString = !inString; continue }
    if (!inString) {
      if (c === '{') stack.push('}')
      else if (c === '[') stack.push(']')
      else if (c === '}' || c === ']') stack.pop()
    }
  }

  let repaired = raw
  if (inString) repaired += '"'
  repaired = repaired.replace(/,\s*$/, '')
  while (stack.length) repaired += stack.pop()!
  return repaired
}

/**
 * Last-resort: extract "key": "value" pairs via regex to salvage partial output.
 */
function extractKeyValues<T>(raw: string): T {
  const result: Record<string, unknown> = {}
  const pattern = /"([^"]+)"\s*:\s*("(?:[^"\\]|\\.)*"|true|false|null|-?\d+(?:\.\d+)?|\[(?:[^\[\]]|\[.*?\])*\])/g
  let m: RegExpExecArray | null
  while ((m = pattern.exec(raw)) !== null) {
    try { result[m[1]] = JSON.parse(m[2]) } catch { result[m[1]] = m[2] }
  }
  if (Object.keys(result).length === 0) throw new Error('Could not parse LLM response as JSON')
  return result as T
}
