import Groq from 'groq-sdk'
import type { LLMConnection, TestPlanSections } from '@/types'

export async function generateWithGroq(
  prompt: string,
  connection: LLMConnection
): Promise<Partial<TestPlanSections>> {
  const client = new Groq({ apiKey: connection.apiKey })

  const completion = await client.chat.completions.create({
    model: connection.model || 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 4096,
  })

  const content = completion.choices[0]?.message?.content || ''
  return JSON.parse(content) as Partial<TestPlanSections>
}

export async function generateWithOllama(
  prompt: string,
  connection: LLMConnection
): Promise<Partial<TestPlanSections>> {
  const baseUrl = connection.baseUrl || 'http://localhost:11434'

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: connection.model || 'llama3',
      messages: [{ role: 'user', content: prompt }],
      stream: false,
    }),
  })

  if (!response.ok) throw new Error(`Ollama error: ${response.statusText}`)
  const data = await response.json()
  const content = data.message?.content || ''
  return JSON.parse(content) as Partial<TestPlanSections>
}

export async function generateWithOpenAI(
  prompt: string,
  connection: LLMConnection
): Promise<Partial<TestPlanSections>> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${connection.apiKey}`,
    },
    body: JSON.stringify({
      model: connection.model || 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    }),
  })

  if (!response.ok) throw new Error(`OpenAI error: ${response.statusText}`)
  const data = await response.json()
  const content = data.choices[0]?.message?.content || ''
  return JSON.parse(content) as Partial<TestPlanSections>
}

export async function generateWithGrok(
  prompt: string,
  connection: LLMConnection
): Promise<Partial<TestPlanSections>> {
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${connection.apiKey}`,
    },
    body: JSON.stringify({
      model: connection.model || 'grok-beta',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    }),
  })

  if (!response.ok) throw new Error(`Grok error: ${response.statusText}`)
  const data = await response.json()
  const content = data.choices[0]?.message?.content || ''
  return JSON.parse(content) as Partial<TestPlanSections>
}
