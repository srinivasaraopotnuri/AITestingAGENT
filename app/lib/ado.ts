import type { JiraTicketFields, SourceConnection } from '@/types'

function buildHeaders(apiToken: string): Record<string, string> {
  const encoded = Buffer.from(`:${apiToken.trim()}`).toString('base64')
  return { 'Content-Type': 'application/json', 'Authorization': `Basic ${encoded}` }
}

function stripHtml(html: string | undefined): string {
  if (!html) return ''
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function fetchADOWorkItem(
  workItemId: string,
  connection: SourceConnection
): Promise<JiraTicketFields> {
  const org = connection.baseUrl.trim().replace(/\/$/, '')
  const project = encodeURIComponent(connection.projectKey)
  const id = workItemId.replace(/^#/, '').trim()
  const headers = buildHeaders(connection.apiToken)

  const url = `${org}/${project}/_apis/wit/workitems/${id}?api-version=7.1&$expand=all`
  const res = await fetch(url, { headers })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`ADO error ${res.status}: ${errText}`)
  }

  const data = await res.json()
  const f = data.fields

  return {
    ticketId: workItemId,
    summary: f['System.Title'] || '',
    userStory: stripHtml(f['System.Description']),
    prd: '',
    acceptanceCriteria: stripHtml(f['Microsoft.VSTS.Common.AcceptanceCriteria']),
    status: f['System.State'] || '',
    priority: String(f['Microsoft.VSTS.Common.Priority'] ?? ''),
  }
}

export async function testADOConnection(
  connection: SourceConnection
): Promise<{ ok: boolean; message: string }> {
  try {
    const org = connection.baseUrl.trim().replace(/\/$/, '')
    const headers = buildHeaders(connection.apiToken)
    const res = await fetch(`${org}/_apis/projects?api-version=7.1`, { headers })
    if (!res.ok) return { ok: false, message: `HTTP ${res.status}: Check your organization URL and PAT` }
    const data = await res.json()
    const count: number = data.count ?? data.value?.length ?? 0
    return { ok: true, message: `ADO connected — ${count} project${count !== 1 ? 's' : ''} accessible` }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Connection failed' }
  }
}
