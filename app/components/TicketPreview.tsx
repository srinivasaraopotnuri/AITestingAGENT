'use client'

import { AlertTriangle } from 'lucide-react'
import type { JiraTicketFields } from '@/types'

interface Props {
  fields: JiraTicketFields
}

export default function TicketPreview({ fields }: Props) {
  const missing: string[] = []
  if (!fields.userStory) missing.push('User Story')
  if (!fields.prd) missing.push('PRD')
  if (!fields.acceptanceCriteria) missing.push('Acceptance Criteria')

  return (
    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-slate-800 dark:text-white font-semibold text-sm">Ticket Preview</h3>
        <span className="text-xs bg-indigo-100 dark:bg-indigo-600/30 text-indigo-600 dark:text-indigo-300 px-2 py-1 rounded-full font-mono">
          {fields.ticketId}
        </span>
      </div>

      {missing.length > 0 && (
        <div className="flex items-start gap-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/40 rounded-lg p-3">
          <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-yellow-700 dark:text-yellow-300 text-xs font-medium">Missing fields detected</p>
            <p className="text-yellow-600 dark:text-yellow-400/70 text-xs mt-0.5">
              {missing.join(', ')} not found. A best-effort draft will be generated.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2">
          <span className="text-slate-400">Status</span>
          <p className="text-slate-700 dark:text-white mt-0.5 font-medium">{fields.status || '—'}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2">
          <span className="text-slate-400">Priority</span>
          <p className="text-slate-700 dark:text-white mt-0.5 font-medium">{fields.priority || '—'}</p>
        </div>
      </div>

      <PreviewField label="Summary" value={fields.summary} />
      <PreviewField label="User Story" value={fields.userStory} />
      <PreviewField label="PRD" value={fields.prd} />
      <PreviewField label="Acceptance Criteria" value={fields.acceptanceCriteria} />
    </div>
  )
}

function PreviewField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</p>
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm text-slate-700 dark:text-slate-200 max-h-32 overflow-y-auto whitespace-pre-wrap">
        {value || <span className="text-slate-400 italic">Not provided</span>}
      </div>
    </div>
  )
}
