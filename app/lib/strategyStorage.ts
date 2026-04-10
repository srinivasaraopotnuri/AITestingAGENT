import type { TestStrategyResult } from '@/types'

export interface StrategyEntry {
  id: string
  projectName: string
  strategy: TestStrategyResult
  generatedAt: string
  llmProvider: string
  llmModel: string
}

const KEY = 'atp_strategies'
const MAX_ENTRIES = 20

export function loadStrategies(): StrategyEntry[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

export function saveStrategy(entry: StrategyEntry): void {
  if (typeof window === 'undefined') return
  const existing = loadStrategies()
  const updated = [entry, ...existing.filter(e => e.id !== entry.id)].slice(0, MAX_ENTRIES)
  localStorage.setItem(KEY, JSON.stringify(updated))
}

export function deleteStrategy(id: string): void {
  if (typeof window === 'undefined') return
  const updated = loadStrategies().filter(e => e.id !== id)
  localStorage.setItem(KEY, JSON.stringify(updated))
}
