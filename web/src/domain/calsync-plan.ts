import type { Wedding, TimeKey } from './types'
import { parseBooking, type CalEvt, type Booking } from './calparse'
import { emptyWedding, withCoupleKey } from './wedding'
import { norm } from './search'
import { todayVN, addDays } from './vn-date'
import { TIME_KEYS } from './ceremony'

/** Read window around today, in days (spec: 60 back, 13 months ahead). */
export const WINDOW_BACK = 60, WINDOW_AHEAD = 400

const hash = (s: string) => { let a = 5381, b = 52711; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); a = (a * 33 ^ c) >>> 0; b = (b * 31 + c) >>> 0 } return a.toString(36) + b.toString(36) }
export const calWeddingId = (cal: string, eventId: string) => 'c' + hash(cal + '|' + eventId)

const digits = (s: string) => (s || '').replace(/\D/g, '')
const nameKey = (s: string) => norm(s).replace(/[^a-z]/g, '')
const TEXT = ['kind', 'date', 'bride', 'groom', 'phoneBride', 'phoneGroom', 'addrBride', 'addrGroom', 'addrRest'] as const

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
/** Fields the calendar actually filled (only these are locked in the app and cleared when removed). */
const filled = (s: Synced): string[] => [...TEXT.filter(k => s[k]), ...TIME_KEYS.filter(k => s.times[k])]

/** Who a booking or profile is, for matching the same booking across the two calendars. */
interface Who { date: string; phones: string[]; names: string[] }
const whoOfBooking = (b: Booking): Who => ({
  date: b.date,
  phones: [b.clientPhone, b.phoneBride, b.phoneGroom].map(digits).filter(d => d.length >= 8),
  names: [b.clientName, b.bride].map(nameKey).filter(Boolean),
})
const whoOfWedding = (w: Wedding): Who => ({
  date: w.date,
  phones: [w.phoneBride, w.phoneGroom].map(digits).filter(d => d.length >= 8),
  names: [w.bride].map(nameKey).filter(Boolean),
})
/** Same day and same phone; or same name when there is no conflicting phone. */
function sameBooking(a: Who, b: Who): boolean {
  if (a.date !== b.date) return false
  if (a.phones.some(p => b.phones.includes(p))) return true
  if (a.phones.length && b.phones.length) return false
  return a.names.some(n => b.names.includes(n))
}

export interface CalWrite { id: string; patch: Partial<Wedding>; create: boolean }

/**
 * Decide what to write so profiles follow the calendars.
 * `input` lists only calendars that were read successfully, FrameVis first (it wins duplicates).
 */
export function planCalendarSync(input: { cal: string; events: CalEvt[] }[], existing: Wedding[], email: string, now: Date = new Date()) {
  const today = todayVN(now)
  const from = addDays(today, -WINDOW_BACK), to = addDays(today, WINDOW_AHEAD)
  const byId = new Map(existing.map(w => [w.id, w]))
  const taken: { cal: string; who: Who }[] = []
  const present = new Set<string>()
  const writes: CalWrite[] = []
  const perCal = new Map<string, number>()
  let count = 0

  for (const { cal, events } of input) {
    for (const e of events) {
      if (e.status === 'cancelled') continue
      const b = parseBooking(e)
      if (!b) continue
      perCal.set(cal, (perCal.get(cal) || 0) + 1)
      const who = whoOfBooking(b)
      const ownId = calWeddingId(cal, e.id)
      // Same booking already taken from the other calendar: keep that one, and don't cancel this one's profile.
      if (taken.some(t => t.cal !== cal && sameBooking(t.who, who))) { present.add(ownId); continue }
      // A profile already made for this booking from the other calendar is reused, so its consult flag and links stay.
      let id = ownId
      if (!byId.has(ownId)) {
        const sib = existing.find(w => w.source && w.source.cal !== cal && !present.has(w.id) && sameBooking(whoOfWedding(w), who))
        if (sib) id = sib.id
      }
      taken.push({ cal, who })
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

  // Cancel profiles whose event is gone, strictly inside the read window, unless a calendar looks wrongly empty.
  const cancelled: string[] = [], guarded: string[] = []
  for (const { cal } of input) {
    const mine = existing.filter(w => w.source?.cal === cal && !w.cancelled && w.date > from && w.date < to)
    const gone = mine.filter(w => !present.has(w.id))
    if (!gone.length) continue
    if (!perCal.get(cal) || (gone.length > 3 && gone.length > mine.length / 2)) { guarded.push(cal); continue }
    for (const w of gone) { cancelled.push(w.id); writes.push({ id: w.id, create: false, patch: { cancelled: true } }) }
  }
  return { writes, cancelled, guarded, count }
}

/** Fields for a new profile. Written with merge, so app-only fields are left out (defaults apply on read). */
function createDoc(s: Synced, sig: string, email: string): Partial<Wedding> {
  const { channelKind, ...rest } = s
  const coupleKey = withCoupleKey({ ...emptyWedding(email), bride: s.bride, groom: s.groom }).coupleKey
  return { ...rest, channel: { kind: channelKind } as Wedding['channel'], coupleKey, calFields: filled(s), createdByEmail: email, cancelled: false, syncSig: sig, updatedAt: Date.now() }
}

function patchFor(cur: Wedding, s: Synced, sig: string): Partial<Wedding> {
  const p: Partial<Wedding> = { syncSig: sig }
  const had = new Set(cur.calFields || [])
  for (const k of TEXT) {
    const v = s[k] as string
    // Calendar value wins; a value the calendar once gave and then removed is cleared; others (e.g. from the client form) stay.
    const next = v || (had.has(k) ? '' : (cur[k] as string))
    if (next !== (cur[k] as string)) (p as Record<string, unknown>)[k] = next
  }
  const times: Partial<Record<TimeKey, string>> = {}
  for (const k of TIME_KEYS) {
    const v = s.times[k] || (had.has(k) ? '' : cur.times?.[k] || '')
    if (v) times[k] = v
  }
  if (JSON.stringify(times) !== JSON.stringify(cur.times || {})) p.times = times
  if (s.hasVideo !== cur.hasVideo) p.hasVideo = s.hasVideo
  if (s.channelKind !== cur.channel?.kind) p.channel = { kind: s.channelKind, url: cur.channel?.url || '' }
  if (s.calNote !== cur.calNote) p.calNote = s.calNote
  if (JSON.stringify(s.source) !== JSON.stringify(cur.source)) p.source = s.source
  const cf = filled(s)
  if (JSON.stringify(cf) !== JSON.stringify(cur.calFields || [])) p.calFields = cf
  if (cur.cancelled) p.cancelled = false
  return p
}
