import { NextRequest, NextResponse } from 'next/server'
import { fetchJiraTicket } from '@/lib/jira'
import type { SourceConnection } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const { ticketId, connection }: { ticketId: string; connection: SourceConnection } = await req.json()

    if (!ticketId || !connection) {
      return NextResponse.json({ error: 'ticketId and connection are required' }, { status: 400 })
    }

    console.log('[jira] Fetching ticket:', ticketId, '| baseUrl:', connection.baseUrl, '| email:', connection.email)
    const fields = await fetchJiraTicket(ticketId, connection)
    return NextResponse.json({ fields })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch ticket' },
      { status: 500 }
    )
  }
}
