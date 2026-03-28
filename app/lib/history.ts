import type { GenerateResponse } from '@/types'

export interface HistoryEntry extends GenerateResponse {
  id: string
  llmProvider: string
  llmModel: string
  ticketSummary: string
}

const KEY = 'atp_history'

export function loadHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

export function saveToHistory(entry: HistoryEntry): void {
  if (typeof window === 'undefined') return
  const existing = loadHistory()
  // Keep latest 50, newest first
  const updated = [entry, ...existing.filter(e => e.id !== entry.id)].slice(0, 50)
  localStorage.setItem(KEY, JSON.stringify(updated))
}

export function deleteFromHistory(id: string): void {
  if (typeof window === 'undefined') return
  const updated = loadHistory().filter(e => e.id !== id)
  localStorage.setItem(KEY, JSON.stringify(updated))
}

export function clearHistory(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(KEY)
}
