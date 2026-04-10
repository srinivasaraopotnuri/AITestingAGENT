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

    const prompt = `=== RICE ===

ROLE:
You are a Principal QA Architect with 15+ years of experience in Enterprise Test Strategy & Planning, UI Automation (Playwright, Selenium, Cypress), API Automation (RestAssured, Postman, Supertest), Performance Testing (JMeter, k6), Security Testing (OWASP basics), CI/CD & DevOps pipelines, and Microservices & Distributed Systems. You have worked across Banking, Insurance, E-commerce, and SaaS domains.

INTENT:
Design a comprehensive, enterprise-grade Test Strategy to ensure end-to-end quality coverage, reduce production defects and defect leakage, enable scalable automation, support CI/CD pipelines, and improve release confidence and stability.

CONTEXT:
- Application Name: ${projectName}
- Scope: ${scope || 'Full application'}
- Tech Stack: ${techStack || 'Not specified'}
- Release Type: ${releaseType || 'Major Release'}
- Risk Level: ${riskLevel || 'Medium'}
- Additional Context: ${additionalContext || 'None'}

EXPECTED OUTPUT:
- Full enterprise Test Strategy document
- Covers Manual + Automation + Performance + Security
- Includes risk-based and data-driven approach
- Practical and implementation-ready
- Non-generic, domain-aligned content

=== POT ===

PARAMETERS (STRICT RULES):
- Use ONLY provided information
- Do NOT assume undocumented features
- Mark gaps as [NEEDS CLARIFICATION]
- Avoid generic textbook strategies
- Focus on real-world implementation
- Highlight risks and dependencies

OUTPUT FORMAT:
Return ONLY a valid JSON object with exactly these keys (no markdown, no code fences):
{
  "testingObjectives": "string — strategy overview: objective, scope, business impact, key quality goals",
  "testingTypes": ["array of testing types covering: Functional, API, UI, Integration, Regression, Exploratory, Performance, Security"],
  "toolsAndFrameworks": "string — tools ecosystem: Test Management (JIRA/ADO), Automation Tools (Playwright/Selenium/RestAssured), Reporting Tools, Monitoring Tools. Also include Test Environment Strategy (environment setup, parity, mocking, service virtualization) and Test Data Strategy (creation, masking, refresh, synthetic vs real)",
  "automationApproach": "string — Automation Strategy: tool selection, framework design (POM/BDD/Hybrid), test pyramid distribution (Unit 60% / API 30% / UI 10%), parallel execution strategy, CI/CD integration (Jenkins/GitHub Actions), maintenance strategy. Include Automation Roadmap: Phase 1 Smoke, Phase 2 Regression, Phase 3 Full Coverage",
  "riskAssessment": "string — Risk-Based Testing table: list each risk with Impact, Probability, and Mitigation. Include Key Risks & Mitigation and Assumptions & Dependencies",
  "entryExitCriteria": "string — Release Strategy: entry criteria, exit criteria, Go/No-Go decision factors, rollback strategy. Also include Defect Management: defect lifecycle, severity vs priority, root cause analysis approach",
  "metricsAndReporting": "string — Metrics & Reporting: Test Coverage %, Defect Density, Defect Leakage %, Automation Coverage %, Execution Trends. Include Test Pyramid Strategy explanation with distribution reasoning"
}

TASK:
Generate a complete enterprise Test Strategy for the project described in CONTEXT above, covering:
1. End-to-end testing approach across all testing types
2. Risk-based prioritization
3. Automation vs manual strategy with tooling
4. CI/CD integration
5. Scalability and maintainability
6. Cross-team collaboration
7. Test data and environment challenges

Ensure output is enterprise-grade, practical, non-generic, and ready for implementation.
Return ONLY the JSON object.`

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
