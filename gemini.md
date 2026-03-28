# Project Constitution — AI Test Plan Generator

## Status: BLUEPRINT LOCKED ✅ → Phase 2: Link

---

## System Overview
An intelligent web-based Test Plan Creator.
1. User configures connections (Jira/ADO/X-Ray + LLM) via a settings panel
2. User enters a Ticket ID + optional additional context
3. Preview panel shows fetched fields BEFORE generation
4. LLM generates a structured test plan based on the Word template
5. User reads in UI, downloads as `.docx` or `.pdf`

---

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Primary LLM | Groq API |
| Additional LLMs | Ollama, Grok (xAI) — pluggable |
| Source Integrations | Jira (P1), ADO (P2), X-Ray (P3) |
| Doc Export | docx (npm) + jsPDF |
| API Layer | Next.js API Routes |

---

## Data Schema

### Input Shape
```json
{
  "source_connection": {
    "type": "jira | ado | xray",
    "base_url": "string",
    "api_token": "string",
    "project_key": "string"
  },
  "llm_connection": {
    "provider": "groq | ollama | grok",
    "model": "string",
    "api_key": "string (if required)",
    "base_url": "string (for ollama)"
  },
  "ticket_id": "string",
  "additional_context": "string (optional)",
  "jira_fields_fetched": {
    "user_story": "string",
    "prd": "string",
    "acceptance_criteria": "string"
  }
}
```

### Output Shape
```json
{
  "test_plan": {
    "objective": "string",
    "scope": "string",
    "inclusions": "string",
    "test_environments": "string",
    "defect_reporting_procedure": "string",
    "test_strategy": "string",
    "test_schedule": "string",
    "test_deliverables": "string",
    "entry_exit_criteria": {
      "entry": "string",
      "exit": "string"
    },
    "test_execution": "string",
    "test_closure": "string",
    "tools": "string",
    "risks_and_mitigations": "string",
    "approvals": "HUMAN_ONLY — left blank"
  },
  "delivery": {
    "web_preview": true,
    "download_docx": true,
    "download_pdf": true
  }
}
```

---

## Template Sections (from Test Plan - Template.docx)
1. Objective
2. Scope
   - Inclusions
   - Test Environments
   - Defect Reporting Procedure
   - Test Strategy
   - Test Schedule
   - Test Deliverables
   - Entry and Exit Criteria (Entry / Exit)
   - Test Execution (Entry / Exit)
   - Test Closure (Entry / Exit)
   - Tools
   - Risks and Mitigations
   - **Approvals** ← HUMAN ONLY, always blank

---

## Behavioral Rules
- **Strict template order**: AI follows template sections in fixed order
- **Approvals section**: Always left blank — human sign-off only
- **Missing data handling**: If User Story / PRD / AC is missing from ticket, warn user with a banner but still generate best-effort draft
- **Additional context**: Always merged into the LLM prompt alongside ticket data
- **Preview gate**: Fetched ticket data is always shown to user BEFORE generation is triggered

---

## Architectural Invariants
- Connections and API keys stored only in `.env.local` — never in client-side code
- All LLM calls go through `/app/api/generate/route.ts` (server-side only)
- Template structure is defined in `lib/template.ts` — single source of truth for section order

---

## Maintenance Log
> Updated during Trigger phase.
