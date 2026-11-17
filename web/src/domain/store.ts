import type { Wedding } from './types'
import { deliveryStatus, type Part, type DeliveryStatus } from './delivery'
import { daysUntil } from './vn-date'

/** Patch that sets a new product link and keeps the old one in history. */
export function withNewLink(w: Wedding, part: Part, link: string, now = Date.now()): Partial<Wedding> {
  const cur = w[part] || { link: '', history: [] }
  const l = link.trim()
  if (l === cur.link) return {}
  const history = cur.link ? [...(cur.history || []), { link: cur.link, at: now }] : [...(cur.history || [])]
  return { [part]: { ...cur, link: l, history } } as Partial<Wedding>
}

const RANK: Record<DeliveryStatus, number> = { late: 4, 'due-soon': 3, waiting: 2, done: 1, na: 0 }
export const worst = (w: Wedding, now: Date = new Date()): DeliveryStatus => {
  const a = deliveryStatus(w, 'photo', now), b = deliveryStatus(w, 'video', now)
  return RANK[a] >= RANK[b] ? a : b
}

/** Ceremonies that already happened, grouped for the product store. */
export function storeBuckets(ws: Wedding[], now: Date = new Date()) {
  const b = { late: [] as Wedding[], dueSoon: [] as Wedding[], waiting: [] as Wedding[], done: [] as Wedding[] }
  const past = ws.filter(w => w.date && daysUntil(w.date, now) < 0).sort((x, y) => x.date.localeCompare(y.date))
  for (const w of past) {
    const s = worst(w, now)
    if (s === 'late') b.late.push(w)
    else if (s === 'due-soon') b.dueSoon.push(w)
    else if (s === 'waiting') b.waiting.push(w)
    else b.done.push(w)
  }
  b.done.reverse()
  return b
}
