import type { JiraTicketFields, ManualInput, TestCase, AISuggestion, AutomationFramework } from '@/types'

// ── Test Case Generation ───────────────────────────────────────────────────────

export function buildTestCasePrompt(
  source: 'ticket' | 'manual',
  ticketFields?: JiraTicketFields,
  manualInput?: ManualInput,
  additionalContext?: string,
  count: number = 10
): string {
  const title     = source === 'ticket' ? ticketFields?.summary        : manualInput?.title
  const story     = source === 'ticket' ? ticketFields?.userStory       : manualInput?.description
  const ac        = source === 'ticket' ? ticketFields?.acceptanceCriteria : manualInput?.acceptanceCriteria
  const ctx       = source === 'ticket' ? additionalContext             : manualInput?.additionalContext
  const ticketId  = source === 'ticket' ? (ticketFields?.ticketId || 'MANUAL') : 'MANUAL'

  return `=== RICE ===

ROLE:
You are a Principal QA Architect with 15+ years of experience in Functional Testing, API Testing (REST/GraphQL), UI Automation (Playwright, Selenium, Cypress), Test Design Techniques (BVA, ECP, Decision Tables, State Transition), and Performance & Security Testing basics. You design test strategies for enterprise systems in Banking, Insurance, E-commerce, and SaaS platforms.

INTENT:
Generate enterprise-grade, production-ready test cases to achieve maximum functional coverage, detect edge cases and hidden defects, ensure automation readiness, reduce production issues, and support regression and CI/CD pipelines.

CONTEXT:
- Ticket / Feature ID: ${ticketId}
- Feature/Module: ${title || 'Not provided'}
- Requirement Source: JIRA / PRD / User Story

User Story / Description:
${story || 'Not provided'}

Acceptance Criteria:
${ac || 'Not provided'}

${ctx ? `Additional Context:\n${ctx}` : ''}

EXPECTED OUTPUT:
- Exactly ${count} test cases
- Coverage must include:
  - Happy path (core workflows, business logic validation)
  - Negative scenarios (invalid inputs, system failures, error handling)
  - Edge cases (extreme values, rare conditions)
  - Boundary Value Analysis (min/max limits, threshold conditions)
  - Security basics (input sanitization, unauthorized access)
  - API validations (request/response, status codes, error responses) where applicable
  - UI testing scenarios (layout, responsiveness, cross-browser) where applicable
- Each test case must be: independent, clear, executable, real-world, automation-friendly
- 3–5 AI suggestions identifying risky areas, missing requirements, and automation candidates

=== POT ===

PARAMETERS (STRICT RULES):
- Do NOT assume undocumented features
- Use ONLY the provided input
- Mark missing details as [NEEDS CLARIFICATION]
- Avoid duplicate or redundant test cases
- Include realistic validations with actual sample data values
- Focus on business-critical flows
- Highlight risks where applicable
- All status values must be "Draft"
- IDs must be sequential: TC-001, TC-002, …

OUTPUT FORMAT:
Return ONLY a valid JSON object with exactly this shape. No markdown fences, no extra text:
{
  "cases": [
    {
      "id": "TC-001",
      "title": "string",
      "type": "Functional|Negative|Edge Case|Boundary|Integration|UI|Performance|Security",
      "priority": "Critical|High|Medium|Low",
      "status": "Draft",
      "tags": ["string"],
      "preconditions": "string",
      "testData": "string (realistic sample values — no placeholders like 'test123')",
      "steps": [
        { "stepNumber": 1, "action": "string", "expectedResult": "string" }
      ],
      "gherkin": "Feature: <feature name>\\n\\n  Scenario: <scenario title>\\n    Given <precondition>\\n    When <action>\\n    Then <expected result>\\n    And <additional assertion>",
      "overallExpectedResult": "string",
      "automationCandidate": true,
      "sourceTicketId": "${ticketId}"
    }
  ],
  "suggestions": [
    {
      "type": "missing_scenario|edge_case|negative_test|security|performance",
      "title": "string",
      "description": "string",
      "suggestedPriority": "Critical|High|Medium|Low"
    }
  ]
}

TASK:
Generate ${count} enterprise-grade test cases for the feature described in CONTEXT above, covering:
1. Functional Testing — core workflows and business logic
2. Validation Testing — mandatory fields, input formats, data constraints
3. Negative Testing — invalid inputs, system failures, error handling
4. Edge Cases — extreme values, rare conditions
5. Boundary Value Analysis — min/max limits, threshold conditions
6. API Testing (if applicable) — request/response validation, status codes
7. UI Testing — layout validation, responsiveness, cross-browser scenarios
8. Security (basic) — input sanitization, unauthorized access attempts

Gherkin rules:
- The "gherkin" field must use Feature/Scenario/Given/When/Then/And/But keywords
- Use \\n for line breaks, indent each step with 4 spaces
- Use "Scenario Outline" with "Examples:" table for data-driven cases

Return ONLY the JSON object.`
}

// ── AI Suggestions (standalone, for expanding an existing set) ─────────────────

export function buildSuggestionsPrompt(existingCases: TestCase[]): string {
  const summary = existingCases.slice(0, 5).map(c => `- ${c.id}: ${c.title} (${c.type})`).join('\n')
  return `You are a senior QA engineer reviewing an existing test suite. Based on these test cases:

${summary}
${existingCases.length > 5 ? `... and ${existingCases.length - 5} more` : ''}

Identify 3–5 gaps, missing scenarios, edge cases, or risks not covered. Return ONLY this JSON:
{
  "suggestions": [
    {
      "type": "missing_scenario|edge_case|negative_test|security|performance",
      "title": "string",
      "description": "string",
      "suggestedPriority": "Critical|High|Medium|Low"
    }
  ]
}`
}

// ── Automation Code Generation ─────────────────────────────────────────────────

const FRAMEWORK_INSTRUCTIONS: Record<AutomationFramework, string> = {
  'selenium-java': `Generate Selenium 4 Java code using TestNG.
- Use Page Object Model (POM) with @FindBy annotations
- Use WebDriverWait for all element interactions
- Include proper assertions using TestNG Assert
- Add @Test methods with @BeforeMethod/@AfterMethod for setup/teardown
- Use the following structure:
  pageObjectCode: The page class (extends BasePage or standalone)
  testCode: The TestNG test class importing the page class`,

  'playwright-ts': `Generate Playwright TypeScript code.
- Use Page Object Model with a class per page
- Use async/await throughout
- Include proper expect() assertions from @playwright/test
- Add beforeEach/afterEach hooks
- Structure:
  pageObjectCode: The page object class
  testCode: The test file using test() from @playwright/test`,

  'playwright-js': `Generate Playwright JavaScript code (no TypeScript).
- Use Page Object Model with a class per page
- Use async/await throughout
- Include proper expect() assertions from @playwright/test
- Add beforeEach/afterEach hooks
- Structure:
  pageObjectCode: The page object class (JS)
  testCode: The test file using test() from @playwright/test`,
}

export function buildAutomationPrompt(
  testCases: TestCase[],
  framework: AutomationFramework,
  applicationName: string,
  pageUnderTest: string
): string {
  const caseSummaries = testCases.map(tc => {
    const steps = tc.steps.map(s => `    Step ${s.stepNumber}: ${s.action} → Expected: ${s.expectedResult}`).join('\n')
    return `Test Case ${tc.id}: ${tc.title}
  Priority: ${tc.priority} | Type: ${tc.type}
  Preconditions: ${tc.preconditions}
  Test Data: ${tc.testData}
${steps}
  Overall Expected: ${tc.overallExpectedResult}`
  }).join('\n\n')

  return `You are an expert test automation engineer. Generate automation code for the following test cases.

APPLICATION: ${applicationName}
PAGE UNDER TEST: ${pageUnderTest}
FRAMEWORK: ${framework}

${FRAMEWORK_INSTRUCTIONS[framework]}

TEST CASES TO AUTOMATE:
${caseSummaries}

Return ONLY this JSON (no markdown fences):
{
  "className": "string (PascalCase page class name, e.g. LoginPage)",
  "testFileName": "string (e.g. LoginTest.java or login.spec.ts)",
  "pageObjectCode": "string (complete page object source code)",
  "testCode": "string (complete test file source code)"
}

Rules:
- Code must be production-quality, not pseudocode
- Use realistic locators (id, data-testid, aria-label preferred over xpath)
- Include all imports
- pageObjectCode and testCode must be complete, runnable files
- Add meaningful comments for complex interactions`
}
