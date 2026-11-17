import { coupleName, type Task, type Wedding } from './types'

export interface CalEvent { id: string; extendedProperties?: { private?: Record<string, string> } }
export interface EventBody {
  summary: string
  description: string
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
  reminders: { useDefault: false; overrides: { method: 'popup'; minutes: number }[] }
  extendedProperties: { private: { sotayApp: string; sotayId: string; sig: string } }
  transparency: 'transparent'
}
export const APP_TAG = '2'

const shash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36) }
const iso = (ms: number) => new Date(ms).toISOString()

export function eventFor(t: Task, w?: Wedding, link = ''): EventBody {
  const summary = t.title + (w ? ' – ' + coupleName(w) : '')
  const description = [t.body, link && 'Mở Sổ Tay: ' + link].filter(Boolean).join('\n\n')
  const sig = shash([summary, t.due, description].join('|'))
  return {
    summary, description,
    start: { dateTime: iso(t.due!), timeZone: 'Asia/Ho_Chi_Minh' },
    end: { dateTime: iso(t.due! + 30 * 60e3), timeZone: 'Asia/Ho_Chi_Minh' },
    reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 0 }] },
    extendedProperties: { private: { sotayApp: APP_TAG, sotayId: t.id, sig } },
    transparency: 'transparent',
  }
}

/** What to change on the calendar so it holds exactly one event per open, dated, not-past task of mine. */
export function planSync(mine: Task[], existing: CalEvent[], weddingOf: (id: string | null) => Wedding | undefined, now: Date = new Date(), link = '') {
  const want = new Map<string, EventBody>()
  for (const t of mine) {
    if (t.done || t.due == null || t.due < now.getTime() - 3600e3) continue
    want.set(t.id, eventFor(t, weddingOf(t.weddingId) ?? undefined, link))
  }
  const create: EventBody[] = [], update: { eventId: string; body: EventBody }[] = [], del: string[] = []
  const seen = new Set<string>()
  for (const ev of existing) {
    const p = ev.extendedProperties?.private
    if (!p || p.sotayApp !== APP_TAG) continue
    const body = want.get(p.sotayId)
    if (!body || seen.has(p.sotayId)) { del.push(ev.id); continue }
    seen.add(p.sotayId)
    if (p.sig !== body.extendedProperties.private.sig) update.push({ eventId: ev.id, body })
  }
  for (const [id, body] of want) if (!seen.has(id)) create.push(body)
  return { create, update, delete: del }
}
