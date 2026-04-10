import type { TestCase, TestCaseSet } from '@/types'

const KEY = 'atp_test_cases'
const MAX_SETS = 20

export function loadTestCaseSets(): TestCaseSet[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

export function saveTestCaseSet(set: TestCaseSet): void {
  if (typeof window === 'undefined') return
  const existing = loadTestCaseSets()
  const updated = [set, ...existing.filter(s => s.id !== set.id)].slice(0, MAX_SETS)
  localStorage.setItem(KEY, JSON.stringify(updated))
}

export function deleteTestCaseSet(id: string): void {
  if (typeof window === 'undefined') return
  const updated = loadTestCaseSets().filter(s => s.id !== id)
  localStorage.setItem(KEY, JSON.stringify(updated))
}

export function updateTestCase(setId: string, updated: TestCase): void {
  if (typeof window === 'undefined') return
  const sets = loadTestCaseSets()
  const idx = sets.findIndex(s => s.id === setId)
  if (idx === -1) return
  sets[idx].cases = sets[idx].cases.map(c =>
    c.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : c
  )
  localStorage.setItem(KEY, JSON.stringify(sets))
}

export function deleteTestCase(setId: string, caseId: string): void {
  if (typeof window === 'undefined') return
  const sets = loadTestCaseSets()
  const idx = sets.findIndex(s => s.id === setId)
  if (idx === -1) return
  sets[idx].cases = sets[idx].cases.filter(c => c.id !== caseId)
  localStorage.setItem(KEY, JSON.stringify(sets))
}

export function clearTestCaseSets(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(KEY)
}
