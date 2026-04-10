import type { TestPlanSections } from '@/types'

// Single source of truth for template section order and labels
export const TEMPLATE_SECTIONS: { key: keyof TestPlanSections; label: string; humanOnly: boolean }[] = [
  { key: 'objective',                label: 'Objective',                  humanOnly: false },
  { key: 'scope',                    label: 'Scope',                      humanOnly: false },
  { key: 'inclusions',               label: 'Inclusions',                 humanOnly: false },
  { key: 'testEnvironments',         label: 'Test Environments',          humanOnly: false },
  { key: 'defectReportingProcedure', label: 'Defect Reporting Procedure', humanOnly: false },
  { key: 'testStrategy',             label: 'Test Strategy',              humanOnly: false },
  { key: 'testSchedule',             label: 'Test Schedule',              humanOnly: false },
  { key: 'testDeliverables',         label: 'Test Deliverables',          humanOnly: false },
  { key: 'entryCriteria',            label: 'Entry Criteria',             humanOnly: false },
  { key: 'exitCriteria',             label: 'Exit Criteria',              humanOnly: false },
  { key: 'testExecution',            label: 'Test Execution',             humanOnly: false },
  { key: 'testClosure',              label: 'Test Closure',               humanOnly: false },
  { key: 'tools',                    label: 'Tools',                      humanOnly: false },
  { key: 'risksAndMitigations',      label: 'Risks and Mitigations',      humanOnly: false },
  { key: 'approvals',                label: 'Approvals',                  humanOnly: true  },
]

export const TEST_PLAN_SYSTEM_PROMPT = `You are a Senior QA Architect with 15+ years of experience in Manual Testing, Automation Testing (UI + API), Performance & Security Testing, CI/CD and DevOps integration. You have worked in domains like Banking, Insurance, E-commerce, and Healthcare. You write enterprise-grade, practical, non-generic test plans. You respond with pure JSON only — no markdown, no code fences, no commentary outside the JSON object.`

export function buildLLMPrompt(
  userStory: string,
  prd: string,
  acceptanceCriteria: string,
  additionalContext: string,
  ticketId: string
): string {
  return `=== RICE ===

ROLE:
You are a Senior QA Architect with 15+ years of experience in Manual Testing, Automation Testing (UI + API), Performance & Security Testing, and CI/CD integration. You have worked in Banking, Insurance, E-commerce, and Healthcare domains.

INTENT:
I need to create a high-quality, enterprise-grade test plan to prevent production defects, ensure full functional and edge case coverage, support automation readiness, and improve release confidence.

CONTEXT:
- Ticket / Feature ID: ${ticketId}
- Requirement Source: JIRA / PRD / User Story

User Story:
${userStory || 'Not provided'}

PRD / Product Requirements:
${prd || 'Not provided'}

Acceptance Criteria:
${acceptanceCriteria || 'Not provided'}

${additionalContext ? `Additional Context:\n${additionalContext}` : ''}

EXPECTED OUTPUT:
- Fully structured enterprise test plan
- Real-world scenarios — not generic or textbook
- Includes positive, negative, and edge case coverage
- Automation-ready strategy (Playwright / Selenium / RestAssured)
- Clear, actionable content across all 14 sections

=== POT ===

PARAMETERS (STRICT RULES):
- Do NOT assume undocumented features
- Mark missing details as [NEEDS CLARIFICATION]
- Avoid generic or textbook responses
- Focus on practical QA execution aligned to the feature above
- Include domain-specific scenarios where inferable
- Ensure testability of all described features

OUTPUT FORMAT:
Return ONLY a valid JSON object with exactly these 14 keys (no markdown, no code fences):
{
  "objective": "string — testing objective, product overview, business impact",
  "scope": "string — in-scope features/modules AND explicit out-of-scope exclusions",
  "inclusions": "string — bullet list of included test types: Functional, UI, API, Integration, Regression, Performance (if applicable), Security (if applicable)",
  "testEnvironments": "string — hardware/software setup, browser/device matrix, test data strategy",
  "defectReportingProcedure": "string — defect lifecycle, severity vs priority matrix, tools (JIRA/ADO)",
  "testStrategy": "string — testing types with automation tools (Playwright/Selenium/RestAssured), framework (POM/BDD/Hybrid), CI/CD integration (Jenkins/GitHub Actions)",
  "testSchedule": "string — milestone timeline with test cycles: Smoke, Regression, UAT",
  "testDeliverables": "string — table of deliverables: Test Plan, Test Cases, Test Scripts, Reports",
  "entryCriteria": "string — entry criteria for test execution",
  "exitCriteria": "string — exit criteria and Go/No-Go decision factors",
  "testExecution": "string — execution plan, resource roles (QA Lead, QA Engineer, Automation Engineer)",
  "testClosure": "string — closure criteria, release strategy, rollback strategy",
  "tools": "string — Test Management (JIRA/ADO), Automation Tools, Reporting Tools, Monitoring Tools",
  "risksAndMitigations": "string — risk table with Impact, Probability, and Mitigation for each risk"
}

TASK:
Generate a complete enterprise test plan for the feature described in CONTEXT above. Cover:
1. End-to-end testing approach across all testing types
2. Risk-based prioritization
3. Automation vs manual split with tooling recommendations
4. CI/CD integration points
5. Test data and environment strategy
6. Metrics and reporting (Test Coverage %, Defect Density, Pass/Fail %, Automation Coverage)

Return ONLY the JSON object. Each section must be specific to this feature — never generic filler text.`
}
