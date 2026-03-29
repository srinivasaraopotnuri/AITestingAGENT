import { NextRequest, NextResponse } from 'next/server'
import { testJiraConnection } from '@/lib/jira'
import { testADOConnection } from '@/lib/ado'
import type { SourceConnection, LLMConnection } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const { type, connection }: { type: 'source' | 'llm'; connection: SourceConnection | LLMConnection } =
      await req.json()

    if (type === 'source') {
      const src = connection as SourceConnection
      if (src.type === 'jira' || src.type === 'xray') {
        const result = await testJiraConnection(src)
        return NextResponse.json(result)
      }
      if (src.type === 'ado') {
        const result = await testADOConnection(src)
        return NextResponse.json(result)
      }
      return NextResponse.json({ ok: false, message: 'Unknown source type' })
    }

    if (type === 'llm') {
      const llm = connection as LLMConnection
      if (llm.provider === 'groq') {
        const { default: Groq } = await import('groq-sdk')
        const client = new Groq({ apiKey: llm.apiKey })
        const models = await client.models.list()
        return NextResponse.json({ ok: true, message: `Groq connected — ${models.data.length} models available` })
      }
      if (llm.provider === 'ollama') {
        const baseUrl = llm.baseUrl || 'http://localhost:11434'
        const res = await fetch(`${baseUrl}/api/tags`)
        if (!res.ok) return NextResponse.json({ ok: false, message: 'Ollama not reachable' })
        const data = await res.json()
        return NextResponse.json({ ok: true, message: `Ollama connected — ${data.models?.length || 0} models` })
      }
      if (llm.provider === 'grok') {
        const res = await fetch('https://api.x.ai/v1/models', {
          headers: { Authorization: `Bearer ${llm.apiKey}` },
        })
        if (!res.ok) return NextResponse.json({ ok: false, message: `Grok error: ${res.status}` })
        return NextResponse.json({ ok: true, message: 'Grok (xAI) connected' })
      }
      if (llm.provider === 'openai') {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${llm.apiKey}` },
        })
        if (!res.ok) return NextResponse.json({ ok: false, message: `OpenAI error: ${res.status}` })
        return NextResponse.json({ ok: true, message: 'OpenAI connected' })
      }
    }

    return NextResponse.json({ ok: false, message: 'Unknown connection type' })
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : 'Test failed' },
      { status: 500 }
    )
  }
}
