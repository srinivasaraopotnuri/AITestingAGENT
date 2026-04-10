import { NextRequest, NextResponse } from 'next/server'
import { callLLM, parseJSON } from '@/lib/llm'
import type { GenerateStrategyRequest, TestStrategyResult } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body: GenerateStrategyRequest = await req.json()
    const { projectName, scope, techStack, releaseType, riskLevel, additionalContext, llmConnection } = body

    if (!projectName || !llmConnection) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const prompt = `You are a senior QA architect. Generate a comprehensive test strategy for the following project.

Project Name: ${projectName}
Scope: ${scope || 'Full application'}
Tech Stack: ${techStack || 'Not specified'}
Release Type: ${releaseType || 'Major Release'}
Risk Level: ${riskLevel || 'Medium'}
Additional Context: ${additionalContext || 'None'}

Return ONLY a valid JSON object with this exact structure (no markdown, no code fences):
{
  "testingObjectives": "string describing the main testing objectives",
  "testingTypes": ["array", "of", "testing", "type", "strings"],
  "toolsAndFrameworks": "string describing recommended tools and frameworks",
  "automationApproach": "string describing automation strategy and coverage percentages",
  "riskAssessment": "string describing identified risks and mitigation strategies",
  "entryExitCriteria": "string describing entry and exit criteria for testing phases",
  "metricsAndReporting": "string describing quality metrics, KPIs, and reporting approach"
}`

    const raw = await callLLM(prompt, llmConnection, { temperature: 0.3 })
    const strategy = parseJSON<TestStrategyResult>(raw)

    return NextResponse.json({
      strategy,
      projectName,
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
