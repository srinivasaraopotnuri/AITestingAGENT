export type LLMProvider = 'groq' | 'ollama' | 'grok' | 'openai' | 'openrouter'
export type SourceType = 'jira' | 'ado' | 'xray'

export interface SourceConnection {
  type: SourceType
  baseUrl: string
  apiToken: string
  projectKey: string
  email?: string // required for Jira basic auth
}

export interface LLMConnection {
  provider: LLMProvider
  model: string
  apiKey?: string
  baseUrl?: string // for ollama
}

export interface ConnectionSettings {
  source: SourceConnection | null
  llm: LLMConnection | null
}

export interface JiraTicketFields {
  ticketId: string
  summary: string
  userStory: string
  prd: string
  acceptanceCriteria: string
  status: string
  priority: string
}

export interface TestPlanSections {
  objective: string
  scope: string
  inclusions: string
  testEnvironments: string
  defectReportingProcedure: string
  testStrategy: string
  testSchedule: string
  testDeliverables: string
  entryCriteria: string
  exitCriteria: string
  testExecution: string
  testClosure: string
  tools: string
  risksAndMitigations: string
  approvals: string
}

export interface GenerateRequest {
  ticketFields: JiraTicketFields
  additionalContext: string
  llmConnection: LLMConnection
  templateSections: (keyof TestPlanSections)[]
}

export interface GenerateResponse {
  testPlan: TestPlanSections
  ticketId: string
  generatedAt: string
}

export type ConnectionStatus = 'idle' | 'testing' | 'success' | 'error'

// ─── Feature: Flexible Input ──────────────────────────────────────────────────

export type InputSourceType = 'ticket' | 'upload' | 'manual'

export interface ManualInput {
  title: string
  description: string
  acceptanceCriteria: string
  additionalContext: string
}

// ─── Feature: Test Cases ─────────────────────────────────────────────────────

export type TestCasePriority = 'Critical' | 'High' | 'Medium' | 'Low'
export type TestCaseStatus   = 'Draft' | 'Ready' | 'In Progress' | 'Passed' | 'Failed' | 'Blocked'
export type TestCaseType     = 'Functional' | 'Negative' | 'Edge Case' | 'Boundary' | 'Integration' | 'UI' | 'Performance' | 'Security'

export interface TestStep {
  stepNumber: number
  action: string
  expectedResult: string
}

export interface TestCase {
  id: string
  title: string
  type: TestCaseType
  priority: TestCasePriority
  status: TestCaseStatus
  tags: string[]
  preconditions: string
  testData: string
  steps: TestStep[]
  gherkin?: string          // Full Gherkin scenario (Feature/Scenario/Given/When/Then)
  overallExpectedResult: string
  automationCandidate: boolean
  sourceTicketId?: string
  createdAt: string
  updatedAt: string
}

export interface TestCaseSet {
  id: string
  ticketId: string
  ticketSummary: string
  cases: TestCase[]
  generatedAt: string
  llmProvider: string
  llmModel: string
}

// ─── Feature: Automation Code Generation ─────────────────────────────────────

export type AutomationFramework = 'selenium-java' | 'playwright-ts' | 'playwright-js'

export interface AutomationScript {
  framework: AutomationFramework
  className: string
  testFileName: string
  pageObjectCode: string
  testCode: string
  generatedAt: string
}

// ─── Feature: AI Suggestions ─────────────────────────────────────────────────

export interface AISuggestion {
  type: 'missing_scenario' | 'edge_case' | 'negative_test' | 'security' | 'performance'
  title: string
  description: string
  suggestedPriority: TestCasePriority
}

// ─── Request / Response shapes ────────────────────────────────────────────────

export interface GenerateTestCasesRequest {
  source: 'ticket' | 'manual'
  ticketFields?: JiraTicketFields
  manualInput?: ManualInput
  additionalContext: string
  llmConnection: LLMConnection
  count?: number
}

export interface GenerateTestCasesResponse {
  cases: TestCase[]
  suggestions: AISuggestion[]
  ticketId: string
  generatedAt: string
}

export interface GenerateAutomationRequest {
  testCases: TestCase[]
  framework: AutomationFramework
  llmConnection: LLMConnection
  applicationName: string
  pageUnderTest: string
}

export interface ParseDocumentResponse {
  text: string
  source: 'docx' | 'txt' | 'image'
}

// ─── Feature: Test Strategy ───────────────────────────────────────────────────
export interface TestStrategyResult {
  testingObjectives: string
  testingTypes: string[]
  toolsAndFrameworks: string
  automationApproach: string
  riskAssessment: string
  entryExitCriteria: string
  metricsAndReporting: string
}

export interface GenerateStrategyRequest {
  projectName: string
  scope: string
  techStack: string
  releaseType: string
  riskLevel: string
  additionalContext?: string
  llmConnection: LLMConnection
}

export interface GenerateStrategyResponse {
  strategy: TestStrategyResult
  projectName: string
  generatedAt: string
}
