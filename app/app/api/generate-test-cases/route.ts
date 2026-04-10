import { NextRequest, NextResponse } from 'next/server'
import { callLLM, parseJSON } from '@/lib/llm'
import { buildTestCasePrompt } from '@/lib/testCasePrompt'
import type { GenerateTestCasesRequest, GenerateTestCasesResponse, TestCase, AISuggestion } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body: GenerateTestCasesRequest = await req.json()
    const { source, ticketFields, manualInput, additionalContext, llmConnection, count = 10 } = body

    const prompt = buildTestCasePrompt(source, ticketFields, manualInput, additionalContext, count)

    // Each Gherkin test case needs ~500–700 tokens; give enough headroom for all cases
    const tokenBudget = Math.min(8192, Math.max(4096, count * 700))
    let raw = await callLLM(prompt, llmConnection, { temperature: 0.4, maxTokens: tokenBudget })
    let parsed: { cases: TestCase[]; suggestions: AISuggestion[] }

    try {
      parsed = parseJSON(raw)
    } catch {
      // Retry once with a stricter prompt suffix
      raw = await callLLM(
        prompt + '\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no explanation.',
        llmConnection,
        { temperature: 0.2 }
      )
      parsed = parseJSON(raw)
    }

    if (!Array.isArray(parsed.cases) || parsed.cases.length < 1) {
      throw new Error('LLM returned no test cases')
    }

    const now = new Date().toISOString()
    const cases: TestCase[] = parsed.cases.map((c, i) => ({
      ...c,
      id: c.id || `TC-${String(i + 1).padStart(3, '0')}`,
      status: 'Draft' as const,
      createdAt: now,
      updatedAt: now,
    }))

    const ticketId = source === 'ticket'
      ? (ticketFields?.ticketId || 'MANUAL')
      : 'MANUAL'

    const response: GenerateTestCasesResponse = {
      cases,
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      ticketId,
      generatedAt: now,
    }

    return NextResponse.json(response)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Test case generation failed' },
      { status: 500 }
    )
  }
}
