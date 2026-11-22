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
function synced(b: Booking, cal: string, eventId: string, eventIds: string[] = [eventId]) {
  const noPhone = !b.phoneBride && !b.phoneGroom
  return {
    kind: b.kind, date: b.date, bride: b.bride, groom: b.groom,
    phoneBride: noPhone ? b.clientPhone : b.phoneBride, phoneGroom: b.phoneGroom,
    addrBride: b.addrBride, addrGroom: b.addrGroom, addrRest: b.addrRest,
    times: b.times, hasVideo: b.hasVideo, channelKind: b.channelKind, calNote: b.calNote,
    source: { cal, eventId, bookingId: b.bookingId, title: b.title, ...(eventIds.length > 1 ? { eventIds } : {}) },
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
const hashedWho = (w: Who): Who => ({ date: w.date, phones: w.phones.map(p => 'p' + hash(p)), names: w.names.map(n => 'n' + hash(n)) })
const whoOfMarker = (w: Wedding): Who => ({ date: w.date, phones: (w.purgeKeys || []).filter(k => k[0] === 'p'), names: (w.purgeKeys || []).filter(k => k[0] === 'n') })

/** What stays of a calendar profile deleted for good: no names, phones or notes, only enough to recognise its booking. */
export function purgedMarker(w: Wedding): Partial<Wedding> {
  const { cal, eventId, eventIds } = w.source!
  const h = hashedWho(whoOfWedding(w))
  return { purged: true, hidden: true, date: w.date, purgeKeys: [...h.phones, ...h.names], source: { cal, eventId, bookingId: '', title: '', ...(eventIds ? { eventIds } : {}) }, updatedAt: Date.now() }
}

function sameBooking(a: Who, b: Who): boolean {
  if (a.date !== b.date) return false
  if (a.phones.some(p => b.phones.includes(p))) return true
  if (a.phones.length && b.phones.length) return false
  return a.names.some(n => b.names.includes(n))
}

export interface CalWrite { id: string; patch: Partial<Wedding>; create: boolean }

interface Item { cal: string; e: CalEvt; b: Booking; who: Who; ownId: string }
const sharesPhone = (a: Who, b: Who) => a.phones.some(p => b.phones.includes(p))
/** Names agree when one contains the other ("Ngô Thị Thanh Ngọc" ⊇ "Thanh Ngọc"); a missing name never disagrees. */
const nameFits = (x: string, y: string) => { const a = nameKey(x), b = nameKey(y); return !a || !b || a.includes(b) || b.includes(a) }
const sameCouple = (a: Booking, b: Booking) => nameKey(a.bride || a.clientName).length >= 4 && nameKey(b.bride || b.clientName).length >= 4
  && nameFits(a.bride || a.clientName, b.bride || b.clientName) && nameFits(a.groom, b.groom)

/** One booking entered twice in the same calendar: same day, same ceremony, a shared phone. */
function groupDuplicates(items: Item[]): Item[][] {
  const groups: Item[][] = []
  for (const it of items) {
    // A shared phone alone is not enough (planners and parents book for several couples): the names must fit too.
    const g = groups.find(g => g[0].b.date === it.b.date && g[0].b.kind === it.b.kind && g.some(x => sharesPhone(x.who, it.who) && sameCouple(x.b, it.b)))
    if (g) g.push(it); else groups.push([it])
  }
  // Newest edit first: it wins, older entries only fill its blanks.
  for (const g of groups) g.sort((a, b) => (b.e.updated || '').localeCompare(a.e.updated || ''))
  return groups
}

/** Newest booking's values, with blanks filled from the older duplicates. */
function mergeBookings(bs: Booking[]): Booking {
  const out: Booking = { ...bs[0], times: { ...bs[0].times } }
  for (const o of bs.slice(1)) {
    for (const k of Object.keys(out) as (keyof Booking)[]) {
      if (k === 'times' || k === 'hasVideo') continue
      if (!out[k] && o[k]) (out as unknown as Record<string, unknown>)[k] = o[k]
    }
    for (const t of TIME_KEYS) if (!out.times[t] && o.times[t]) out.times[t] = o.times[t]
    out.hasVideo = out.hasVideo || o.hasVideo
  }
  return out
}

/** How complete a profile is: filled wedding details first; app data (carried over anyway) only breaks ties. */
const fullness = (w: Wedding) => 10 * (TEXT.filter(k => w[k]).length + TIME_KEYS.filter(k => w.times?.[k]).length)
  + (w.consultDone ? 1 : 0) + (w.photo?.link ? 1 : 0) + (w.video?.link ? 1 : 0) + (w.notes ? 1 : 0) + (w.formToken ? 1 : 0)

/** Data of a duplicate that the kept profile lacks: app data, and details typed in the app or from the client form. */
function carryOver(keep: Wedding, from: Wedding[], s: Synced): Partial<Wedding> {
  const p: Partial<Wedding> = {}
  const times = { ...(keep.times || {}) }
  let tChanged = false
  let notes = keep.notes || ''
  for (const d of from) {
    if (d.consultDone && !keep.consultDone) p.consultDone = true
    if (d.photo?.link && !keep.photo?.link && !p.photo) p.photo = d.photo
    if (d.video?.link && !keep.video?.link && !p.video) p.video = d.video
    if (d.formToken && !keep.formToken && !p.formToken) p.formToken = d.formToken
    if (d.channel?.url && !keep.channel?.url && !p.channel) p.channel = { ...(keep.channel || d.channel), url: d.channel.url }
    if (d.notes && !notes.includes(d.notes)) notes = notes ? notes + '\n' + d.notes : d.notes
    for (const k of TEXT) if (!keep[k] && !s[k] && d[k] && !(k in p)) (p as Record<string, unknown>)[k] = d[k]
    for (const k of TIME_KEYS) if (!times[k] && !s.times[k] && d.times?.[k]) { times[k] = d.times[k]; tChanged = true }
  }
  if (tChanged) p.times = times
  if (notes !== (keep.notes || '')) p.notes = notes
  return p
}

/**
 * Decide what to write so profiles follow the calendars.
 * `input` lists only calendars that were read successfully, FrameVis first (it wins duplicates).
 * A booking entered twice in one calendar becomes one profile; the duplicate profiles are returned in `deletes`.
 */
export function planCalendarSync(input: { cal: string; events: CalEvt[] }[], existing: Wedding[], email: string, now: Date = new Date()) {
  const today = todayVN(now)
  const from = addDays(today, -WINDOW_BACK), to = addDays(today, WINDOW_AHEAD)
  const byId = new Map(existing.map(w => [w.id, w]))
  const taken: { cal: string; who: Who }[] = []
  const present = new Set<string>()
  const writes: CalWrite[] = []
  const deletes: string[] = []
  const mergedInto: Record<string, string> = {}
  const claimed = new Set<string>()
  const perCal = new Map<string, number>()
  let count = 0

  for (const { cal, events } of input) {
    const items: Item[] = []
    for (const e of events) {
      if (e.status === 'cancelled') continue
      const b = parseBooking(e)
      if (!b) continue
      perCal.set(cal, (perCal.get(cal) || 0) + 1)
      items.push({ cal, e, b, who: whoOfBooking(b), ownId: calWeddingId(cal, e.id) })
    }
    for (const g of groupDuplicates(items)) {
      const lead = g[0]
      const b = mergeBookings(g.map(x => x.b))
      const who: Who = { date: b.date, phones: [...new Set(g.flatMap(x => x.who.phones))], names: [...new Set(g.flatMap(x => x.who.names))] }
      // Same booking already taken from the other calendar: keep that one, and don't cancel these profiles.
      if (taken.some(t => t.cal !== cal && sameBooking(t.who, who))) { g.forEach(x => present.add(x.ownId)); continue }
      // Profiles already made for this booking: by an entry's own id, or one that lists the entry as merged in.
      const evIds = new Set(g.map(x => x.e.id))
      let mine = [...new Set([...g.map(x => byId.get(x.ownId)), ...existing.filter(w => w.source?.cal === cal && [w.source.eventId, ...(w.source.eventIds || [])].some(e => evIds.has(e)))]
        .filter((w): w is Wedding => !!w && !claimed.has(w.id)))]
      // Else one made from the other calendar.
      if (!mine.length) {
        const sib = existing.find(w => w.source && w.source.cal !== cal && !present.has(w.id) && !claimed.has(w.id) && (w.purged ? sameBooking(whoOfMarker(w), hashedWho(who)) : sameBooking(whoOfWedding(w), who)))
        if (sib) mine = [sib]
      }
      // Deleted for good in Sổ Tay: leave the booking out entirely, never recreate it.
      if (mine.some(w => w.purged)) { g.forEach(x => present.add(x.ownId)); mine.forEach(w => { present.add(w.id); claimed.add(w.id) }); taken.push({ cal, who }); continue }
      // Hidden profiles stay as they are; a visible profile of the same booking is the one kept.
      const hidden = mine.filter(w => w.hidden)
      if (hidden.length < mine.length) { hidden.forEach(w => { present.add(w.id); claimed.add(w.id) }); mine = mine.filter(w => !w.hidden) }
      const keep = mine.slice().sort((x, y) => fullness(y) - fullness(x))[0]
      const id = keep?.id ?? lead.ownId
      const dups = mine.filter(w => w.id !== id)
      for (const d of dups) { deletes.push(d.id); mergedInto[d.id] = id; present.add(d.id) }
      g.forEach(x => present.add(x.ownId))
      taken.push({ cal, who })
      present.add(id); claimed.add(id)
      count++
      const s = synced(b, cal, lead.e.id, g.map(x => x.e.id))
      const sig = hash(JSON.stringify(s))
      const cur = byId.get(id)
      if (!cur) { writes.push({ id, create: true, patch: createDoc(s, sig, email) }); continue }
      const sync = cur.syncSig === sig && !cur.cancelled ? {} : patchFor(cur, s, sig)
      // Carry over onto the profile as it will be after this sync, so calendar changes are not undone.
      const carry = carryOver({ ...cur, ...sync } as Wedding, dups, s)
      if (!Object.keys(sync).length && !Object.keys(carry).length) continue
      writes.push({ id, create: false, patch: { ...sync, ...carry } })
    }
  }
  // Cancel profiles whose event is gone, strictly inside the read window, unless a calendar looks wrongly empty.
  const cancelled: string[] = [], guarded: string[] = []
  for (const { cal } of input) {
    const mine = existing.filter(w => w.source?.cal === cal && !w.cancelled && !w.purged && w.date > from && w.date < to)
    const gone = mine.filter(w => !present.has(w.id))
    if (!gone.length) continue
    if (!perCal.get(cal) || (gone.length > 3 && gone.length > mine.length / 2)) { guarded.push(cal); continue }
    for (const w of gone) { cancelled.push(w.id); writes.push({ id: w.id, create: false, patch: { cancelled: true } }) }
  }
  return { writes, cancelled, guarded, count, deletes, mergedInto }
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
