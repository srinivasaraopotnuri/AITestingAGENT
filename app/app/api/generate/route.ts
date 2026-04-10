import { NextRequest, NextResponse } from 'next/server'
import { buildLLMPrompt, TEST_PLAN_SYSTEM_PROMPT } from '@/lib/template'
import { callLLM, parseJSON } from '@/lib/llm'
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

    const raw = await callLLM(prompt, llmConnection, { systemPrompt: TEST_PLAN_SYSTEM_PROMPT })
    const sections = parseJSON<Partial<TestPlanSections>>(raw)

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
