import { NextRequest, NextResponse } from 'next/server'
import { buildLLMPrompt } from '@/lib/template'
import { generateWithGroq, generateWithOllama, generateWithGrok, generateWithOpenAI } from '@/lib/groq'
import type { GenerateRequest, TestPlanSections } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const { ticketFields, additionalContext, llmConnection }: GenerateRequest = await req.json()

    const prompt = buildLLMPrompt(
      ticketFields.userStory,
      ticketFields.prd,
      ticketFields.acceptanceCriteria,
      additionalContext,
      ticketFields.ticketId
    )

    let sections: Partial<TestPlanSections>

    switch (llmConnection.provider) {
      case 'groq':
        sections = await generateWithGroq(prompt, llmConnection)
        break
      case 'ollama':
        sections = await generateWithOllama(prompt, llmConnection)
        break
      case 'grok':
        sections = await generateWithGrok(prompt, llmConnection)
        break
      case 'openai':
        sections = await generateWithOpenAI(prompt, llmConnection)
        break
      default:
        return NextResponse.json({ error: 'Unknown LLM provider' }, { status: 400 })
    }

    const testPlan: TestPlanSections = {
      ...sections,
      approvals: '', // always blank — human only
    } as TestPlanSections

    return NextResponse.json({
      testPlan,
      ticketId: ticketFields.ticketId,
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Generation failed' },
      { status: 500 }
    )
  }
}
