import type { JiraTicketFields, SourceConnection } from '@/types'

const CLOUD_ID = '3eacc901-bbe1-4351-97ec-3480031a4eb6'
const GATEWAY = `https://api.atlassian.com/ex/jira/${CLOUD_ID}`

// Always use the Atlassian API gateway — direct .atlassian.net URLs return 404 for REST API
function getApiBase(baseUrl: string): string {
  const trimmed = baseUrl.trim()
  // Any atlassian.net URL → gateway
  if (trimmed.includes('atlassian.net') || trimmed === '') {
    return GATEWAY
  }
  // Non-Atlassian (self-hosted Jira, ADO, etc.) → use directly
  return trimmed
}

function buildHeaders(email: string | undefined, apiToken: string): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = apiToken.trim()
  const mail = email?.trim()
  if (mail && token) {
    const encoded = Buffer.from(`${mail}:${token}`).toString('base64')
    headers['Authorization'] = `Basic ${encoded}`
  } else if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

function extractText(field: unknown): string {
  if (!field) return ''
  if (typeof field === 'string') return field
  if (typeof field === 'object' && 'content' in (field as object)) {
    return extractADF(field as ADFNode)
  }
  return String(field)
}

interface ADFNode {
  type?: string
  text?: string
  content?: ADFNode[]
}

function extractADF(node: ADFNode): string {
  if (node.type === 'text') return node.text || ''
  if (node.content) return node.content.map(extractADF).join('\n')
  return ''
}

export async function fetchJiraTicket(
  ticketId: string,
  connection: SourceConnection
): Promise<JiraTicketFields> {
  const apiBase = getApiBase(connection.baseUrl)
  const headers = buildHeaders(connection.email, connection.apiToken)

  const url = `${apiBase}/rest/api/3/issue/${ticketId}?fields=summary,description,customfield_10016,status,priority`
  const response = await fetch(url, { headers })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Jira API error ${response.status}: ${errText}`)
  }

  const data = await response.json()
  const fields = data.fields
  const description = extractText(fields.description)

  // Heuristically extract User Story, PRD, Acceptance Criteria from description
  const userStoryMatch = description.match(/user story[:\s]*([\s\S]*?)(?=acceptance criteria|prd|$)/i)
  const acMatch = description.match(/acceptance criteria[:\s]*([\s\S]*?)(?=prd|user story|$)/i)
  const prdMatch = description.match(/prd[:\s]*([\s\S]*?)(?=acceptance criteria|user story|$)/i)

  return {
    ticketId,
    summary: fields.summary || '',
    userStory: userStoryMatch ? userStoryMatch[1].trim() : description,
    prd: prdMatch ? prdMatch[1].trim() : '',
    acceptanceCriteria: acMatch ? acMatch[1].trim() : extractText(fields.customfield_10016 || ''),
    status: fields.status?.name || '',
    priority: fields.priority?.name || '',
  }
}

export async function testJiraConnection(connection: SourceConnection): Promise<{ ok: boolean; message: string }> {
  try {
    const apiBase = getApiBase(connection.baseUrl)
    const headers = buildHeaders(connection.email, connection.apiToken)

    const response = await fetch(`${apiBase}/rest/api/3/myself`, { headers })
    if (!response.ok) return { ok: false, message: `HTTP ${response.status}: Check your URL and token` }

    const data = await response.json()
    return { ok: true, message: `Connected as ${data.displayName || data.emailAddress}` }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Connection failed' }
  }
}
