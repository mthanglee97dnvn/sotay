import type { Wedding } from './types'
import { daysUntil, addDays } from './vn-date'

export type DeliveryStatus = 'na' | 'waiting' | 'due-soon' | 'late' | 'done'
export type Part = 'photo' | 'video'

/** Delivery windows in days after the ceremony (spec: photo 7–10, video 25–30). */
export const WINDOW: Record<Part, [number, number]> = { photo: [7, 10], video: [25, 30] }

export const deadline = (w: Wedding, part: Part) => addDays(w.date, WINDOW[part][1])

export function deliveryStatus(w: Wedding, part: Part, now: Date = new Date()): DeliveryStatus {
  if (part === 'video' && !w.hasVideo) return 'na'
  if (w[part]?.deliveredAt) return 'done'
  const since = -daysUntil(w.date, now)
  const [min, max] = WINDOW[part]
  if (since > max) return 'late'
  if (since >= min) return 'due-soon'
  return 'waiting'
}

/** Days left until the deadline (negative = days late). */
export const daysLeft = (w: Wedding, part: Part, now: Date = new Date()) => daysUntil(deadline(w, part), now)
