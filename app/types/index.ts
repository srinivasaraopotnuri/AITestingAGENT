export type LLMProvider = 'groq' | 'ollama' | 'grok' | 'openai'
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
