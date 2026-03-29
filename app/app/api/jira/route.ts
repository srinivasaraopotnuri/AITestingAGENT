import { NextRequest, NextResponse } from 'next/server'
import { fetchJiraTicket } from '@/lib/jira'
import { fetchADOWorkItem } from '@/lib/ado'
import type { SourceConnection } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const { ticketId, connection }: { ticketId: string; connection: SourceConnection } = await req.json()

    if (!ticketId || !connection) {
      return NextResponse.json({ error: 'ticketId and connection are required' }, { status: 400 })
    }

    let fields
    if (connection.type === 'ado') {
      console.log('[ado] Fetching work item:', ticketId, '| org:', connection.baseUrl, '| project:', connection.projectKey)
      fields = await fetchADOWorkItem(ticketId, connection)
    } else {
      console.log('[jira] Fetching ticket:', ticketId, '| baseUrl:', connection.baseUrl, '| email:', connection.email)
      fields = await fetchJiraTicket(ticketId, connection)
    }

    return NextResponse.json({ fields })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch ticket' },
      { status: 500 }
    )
  }
}
