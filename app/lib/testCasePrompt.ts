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

  return `You are a senior QA engineer. Generate ${count} detailed test cases for the following feature.

TICKET / FEATURE ID: ${ticketId}
TITLE: ${title || 'Not provided'}

USER STORY / DESCRIPTION:
${story || 'Not provided'}

ACCEPTANCE CRITERIA:
${ac || 'Not provided'}

${ctx ? `ADDITIONAL CONTEXT:\n${ctx}` : ''}

Return a valid JSON object with exactly this shape (no markdown fences, no extra text):
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
      "testData": "string",
      "steps": [
        { "stepNumber": 1, "action": "string", "expectedResult": "string" }
      ],
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

Rules:
- Generate exactly ${count} test cases in the "cases" array
- Spread types: include Functional, Negative, Edge Case, and at minimum 1 Boundary test
- Each test case must have 3–8 detailed steps with concrete actions and expected results
- testData must contain realistic sample values, not placeholders
- Generate 3–5 AI suggestions in the "suggestions" array for missing scenarios, edge cases, or gaps
- IDs must be sequential: TC-001, TC-002, …
- Be specific to the feature — no generic filler text
- All status values must be "Draft"
- Return ONLY the JSON object`
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
