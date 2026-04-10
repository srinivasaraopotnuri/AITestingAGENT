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
You are a Senior QA Engineer with 10+ years of experience in test design, BDD, and Gherkin specification writing. You specialize in identifying edge cases others miss and writing test cases that are immediately executable.

INTENT:
I need to generate ${count} comprehensive, independently executable test cases to ensure complete coverage of the feature described below — covering happy paths, negative scenarios, boundary values, and edge cases — before release.

CONTEXT:
- Ticket / Feature ID: ${ticketId}
- Title: ${title || 'Not provided'}
- User Story / Description:
${story || 'Not provided'}
- Acceptance Criteria:
${ac || 'Not provided'}
${ctx ? `- Additional Context:\n${ctx}` : ''}

EXPECTED OUTPUT:
- Exactly ${count} test cases in the "cases" array
- Coverage must include: Functional (happy path), Negative, Edge Case, Boundary, and at least 1 Security or Integration test
- Each test case must have 3–8 concrete steps with realistic test data — no placeholder values
- Each test case must include a complete Gherkin BDD scenario (Given/When/Then)
- 3–5 AI suggestions identifying gaps, missing scenarios, or risks not covered

=== POT ===

PARAMETERS:
- Use ONLY the information provided above — do NOT assume undocumented features
- Mark any unclear requirements as "[NOT SPECIFIED]" rather than guessing
- No hallucinations — every step and expected result must be derivable from the context
- All status values must be "Draft"
- IDs must be sequential: TC-001, TC-002, …

OUTPUT FORMAT:
Return a valid JSON object with exactly this shape. No markdown fences, no extra text outside the JSON:
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
      "testData": "string (realistic values, not placeholders)",
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
Generate ${count} test cases for the feature described in CONTEXT above.
- The "gherkin" field must be a complete Gherkin scenario using Feature/Scenario/Given/When/Then/And/But keywords. Use \\n for line breaks. Indent each step with 4 spaces.
- Use "Scenario Outline" with an "Examples:" table for data-driven cases where appropriate.
- Spread coverage across types — do not generate only Functional tests.
- Return ONLY the JSON object.`
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
