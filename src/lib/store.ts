// Local persistence — everything lives in this browser's localStorage only.
// No server, no upload: each device keeps its own data, never shared.

import type { ParsedSchedule } from './schedule'

const K_INITIALS = 'myInitials'
const K_HISTORY = 'ks:history'
const K_ACTIVE = 'ks:active'
const MAX_ITEMS = 36

/** One saved upload: the source PDF + its parsed result, keyed by month. */
export interface HistoryItem {
  id: string            // `${year}-${month}` — one entry per month (re-upload replaces)
  year: number
  month: number
  label: string         // "Jun 2026"
  fileName: string
  initials: string      // initials the stored `schedule` was parsed for
  savedAt: number
  pdf: string           // base64 of the original PDF (for re-parse on initials change)
  schedule: ParsedSchedule
}

export function loadInitials(): string {
  return localStorage.getItem(K_INITIALS) || 'JP'
}
export function saveInitials(v: string) {
  localStorage.setItem(K_INITIALS, v)
}

export function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(K_HISTORY)
    const items = raw ? (JSON.parse(raw) as HistoryItem[]) : []
    return items.sort((a, b) => b.year - a.year || b.month - a.month)
  } catch {
    return []
  }
}

function persist(items: HistoryItem[]) {
  localStorage.setItem(K_HISTORY, JSON.stringify(items))
}

export function getActiveId(): string | null {
  return localStorage.getItem(K_ACTIVE)
}
export function setActiveId(id: string | null) {
  if (id) localStorage.setItem(K_ACTIVE, id)
  else localStorage.removeItem(K_ACTIVE)
}

/** Insert or replace an item (by id), newest months first, with a size cap. */
export function upsertItem(item: HistoryItem): HistoryItem[] {
  const items = loadHistory().filter((x) => x.id !== item.id)
  items.push(item)
  items.sort((a, b) => b.year - a.year || b.month - a.month)
  const trimmed = items.slice(0, MAX_ITEMS)
  try {
    persist(trimmed)
  } catch {
    // quota exceeded: drop oldest entries until it fits
    while (trimmed.length > 1) {
      trimmed.pop()
      try { persist(trimmed); break } catch { /* keep dropping */ }
    }
  }
  return loadHistory()
}

export function removeItem(id: string): HistoryItem[] {
  persist(loadHistory().filter((x) => x.id !== id))
  return loadHistory()
}

export function abToB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(bin)
}

export function b64ToAb(b64: string): ArrayBuffer {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes.buffer
}
