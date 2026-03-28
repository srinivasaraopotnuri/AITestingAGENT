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

export function buildLLMPrompt(
  userStory: string,
  prd: string,
  acceptanceCriteria: string,
  additionalContext: string,
  ticketId: string
): string {
  const aiSections = TEMPLATE_SECTIONS.filter(s => !s.humanOnly).map(s => s.label).join('\n')

  return `You are an expert QA engineer. Generate a comprehensive test plan based on the following Jira ticket information.

TICKET ID: ${ticketId}

USER STORY:
${userStory || 'Not provided'}

PRODUCT REQUIREMENTS DOCUMENT (PRD):
${prd || 'Not provided'}

ACCEPTANCE CRITERIA:
${acceptanceCriteria || 'Not provided'}

${additionalContext ? `ADDITIONAL CONTEXT:\n${additionalContext}` : ''}

Generate the following sections in strict order. Return a valid JSON object with these exact keys:
{
  "objective": "...",
  "scope": "...",
  "inclusions": "...",
  "testEnvironments": "...",
  "defectReportingProcedure": "...",
  "testStrategy": "...",
  "testSchedule": "...",
  "testDeliverables": "...",
  "entryCriteria": "...",
  "exitCriteria": "...",
  "testExecution": "...",
  "testClosure": "...",
  "tools": "...",
  "risksAndMitigations": "..."
}

Rules:
- Be specific to the feature described in the ticket — do not use generic filler text
- Each section should be detailed and professional
- For testEnvironments, list realistic OS/browser combinations
- For risksAndMitigations, identify real risks from the ticket content
- Return ONLY the JSON object, no markdown code blocks, no extra text`
}
