import type { Wedding, TimeKey } from './types'
import { parseBooking, type CalEvt, type Booking } from './calparse'
import { emptyWedding, withCoupleKey } from './wedding'
import { norm } from './search'
import { todayVN, addDays } from './vn-date'

/** Read window around today, in days (spec: 60 back, 13 months ahead). */
export const WINDOW_BACK = 60, WINDOW_AHEAD = 400

const hash = (s: string) => { let a = 5381, b = 52711; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); a = (a * 33 ^ c) >>> 0; b = (b * 31 + c) >>> 0 } return a.toString(36) + b.toString(36) }
export const calWeddingId = (cal: string, eventId: string) => 'c' + hash(cal + '|' + eventId)

const digits = (s: string) => (s || '').replace(/\D/g, '')
const nameKey = (s: string) => norm(s).replace(/[^a-z]/g, '')

/** The values a booking owns on a profile. */
function synced(b: Booking, cal: string, eventId: string) {
  const noPhone = !b.phoneBride && !b.phoneGroom
  return {
    kind: b.kind, date: b.date, bride: b.bride, groom: b.groom,
    phoneBride: noPhone ? b.clientPhone : b.phoneBride, phoneGroom: b.phoneGroom,
    addrBride: b.addrBride, addrGroom: b.addrGroom, addrRest: b.addrRest,
    times: b.times, hasVideo: b.hasVideo, channelKind: b.channelKind, calNote: b.calNote,
    source: { cal, eventId, bookingId: b.bookingId, title: b.title },
  }
}
type Synced = ReturnType<typeof synced>
const TEXT = ['kind', 'date', 'bride', 'groom', 'phoneBride', 'phoneGroom', 'addrBride', 'addrGroom', 'addrRest'] as const

export interface CalWrite { id: string; patch: Partial<Wedding>; create: boolean }

/**
 * Decide what to write so profiles follow the calendars.
 * `input` lists only calendars that were read successfully, FrameVis first (it wins duplicates).
 */
export function planCalendarSync(input: { cal: string; events: CalEvt[] }[], existing: Wedding[], email: string, now: Date = new Date()) {
  const today = todayVN(now)
  const from = addDays(today, -WINDOW_BACK), to = addDays(today, WINDOW_AHEAD)
  const byId = new Map(existing.map(w => [w.id, w]))
  const seenKeys = new Set<string>()
  const present = new Set<string>()
  const writes: CalWrite[] = []
  let count = 0

  for (const { cal, events } of input) {
    for (const e of events) {
      if (e.status === 'cancelled') continue
      const b = parseBooking(e)
      if (!b) continue
      const keys = [b.clientPhone, b.phoneBride, b.phoneGroom].map(digits).filter(d => d.length >= 8).map(d => b.date + '|p' + d)
        .concat([b.clientName, b.bride].map(nameKey).filter(Boolean).map(n => b.date + '|n' + n))
      if (keys.some(k => seenKeys.has(k))) continue // same booking already taken from an earlier calendar
      keys.forEach(k => seenKeys.add(k))
      const id = calWeddingId(cal, e.id)
      present.add(id)
      count++
      const s = synced(b, cal, e.id)
      const sig = hash(JSON.stringify(s))
      const cur = byId.get(id)
      if (!cur) { writes.push({ id, create: true, patch: createDoc(s, sig, email) }); continue }
      if (cur.syncSig === sig && !cur.cancelled) continue
      writes.push({ id, create: false, patch: patchFor(cur, s, sig) })
    }
  }

  const cals = new Set(input.map(i => i.cal))
  const cancelled: string[] = []
  for (const w of existing) {
    if (!w.source || !cals.has(w.source.cal) || present.has(w.id) || w.cancelled) continue
    if (!w.date || w.date < from || w.date > to) continue
    cancelled.push(w.id)
    writes.push({ id: w.id, create: false, patch: { cancelled: true } })
  }
  return { writes, cancelled, count }
}

function createDoc(s: Synced, sig: string, email: string): Partial<Wedding> {
  const { channelKind, ...rest } = s
  const { id: _omit, ...doc } = withCoupleKey({ ...emptyWedding(email), ...rest, id: '', channel: { kind: channelKind, url: '' }, consultDone: false, cancelled: false, syncSig: sig, updatedAt: Date.now() })
  return doc
}

function patchFor(cur: Wedding, s: Synced, sig: string): Partial<Wedding> {
  const p: Partial<Wedding> = { syncSig: sig }
  for (const k of TEXT) {
    const v = s[k] as string
    if (v && v !== (cur[k] as string)) (p as Record<string, unknown>)[k] = v
  }
  const times = { ...cur.times }
  for (const [k, v] of Object.entries(s.times)) if (v) times[k as TimeKey] = v
  if (JSON.stringify(times) !== JSON.stringify(cur.times || {})) p.times = times
  if (s.hasVideo !== cur.hasVideo) p.hasVideo = s.hasVideo
  if (s.channelKind !== cur.channel?.kind) p.channel = { kind: s.channelKind, url: cur.channel?.url || '' }
  if (s.calNote !== cur.calNote) p.calNote = s.calNote
  if (JSON.stringify(s.source) !== JSON.stringify(cur.source)) p.source = s.source
  if (cur.cancelled) p.cancelled = false
  return p
}
