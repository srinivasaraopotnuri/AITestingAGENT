import { NextResponse } from 'next/server'

// Returns pre-configured credentials from .env.local to pre-fill the UI
// Keys are returned as-is so the form can be pre-populated
export async function GET() {
  return NextResponse.json({
    jira: {
      baseUrl: process.env.JIRA_BASE_URL?.trim() || '',
      email: process.env.JIRA_EMAIL?.trim() || '',
      apiToken: process.env.JIRA_API_TOKEN?.trim() || '',
    },
    groq: {
      apiKey: process.env.GROQ_API_KEY?.trim() || '',
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY?.trim() || '',
    },
    grok: {
      apiKey: process.env.GROK_API_KEY?.trim() || '',
    },
  })
}
