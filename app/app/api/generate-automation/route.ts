import { NextRequest, NextResponse } from 'next/server'
import { callLLM, parseJSON } from '@/lib/llm'
import { buildAutomationPrompt } from '@/lib/testCasePrompt'
import type { GenerateAutomationRequest, AutomationScript } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body: GenerateAutomationRequest = await req.json()
    const { testCases, framework, llmConnection, applicationName, pageUnderTest } = body

    if (!testCases?.length) {
      return NextResponse.json({ error: 'No test cases provided' }, { status: 400 })
    }

    const prompt = buildAutomationPrompt(testCases, framework, applicationName, pageUnderTest)
    const raw = await callLLM(prompt, llmConnection, { maxTokens: 8192, temperature: 0.2 })

    const parsed = parseJSON<{
      className: string
      testFileName: string
      pageObjectCode: string
      testCode: string
    }>(raw)

    const script: AutomationScript = {
      framework,
      className: parsed.className,
      testFileName: parsed.testFileName,
      pageObjectCode: parsed.pageObjectCode,
      testCode: parsed.testCode,
      generatedAt: new Date().toISOString(),
    }

    return NextResponse.json({ script })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Automation generation failed' },
      { status: 500 }
    )
  }
}
