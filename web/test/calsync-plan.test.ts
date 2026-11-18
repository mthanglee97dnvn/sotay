import { describe, it, expect } from 'vitest'
import { planCalendarSync, calWeddingId } from '../src/domain/calsync-plan'
import { emptyWedding } from '../src/domain/wedding'
import type { CalEvt } from '../src/domain/calparse'
import type { Wedding } from '../src/domain/types'

const FV = 'framevis@group.calendar.google.com', PR = 'primary'
const NOW = new Date('2026-11-18T10:00:00+07:00')
const ev = (id: string, title: string, date: string, desc = ''): CalEvt => ({ id, summary: title, description: desc, start: { dateTime: `${date}T06:00:00+07:00` } })
const kim = ev('fv1', 'Trọn Gói Cơ Bản - Kimm Ngânn / Page (2 Chụp + 2 Quay)', '2026-12-29', 'Khách: Kimm Ngânn · 0828127234')
const plan = (input: { cal: string; events: CalEvt[] }[], existing: Wedding[] = []) => planCalendarSync(input, existing, 'admin@x.com', NOW)
const asWedding = (w: { id: string; patch: Partial<Wedding> }): Wedding => ({ ...emptyWedding('admin@x.com'), ...w.patch, id: w.id })

describe('calendar sync plan', () => {
  it('creates a full profile for a new booking', () => {
    const r = plan([{ cal: FV, events: [kim] }])
    expect(r.writes).toHaveLength(1)
    const w = r.writes[0]
    expect(w.create).toBe(true)
    expect(w.id).toBe(calWeddingId(FV, 'fv1'))
    expect(w.patch).toMatchObject({ kind: 'Cưới', date: '2026-12-29', bride: 'Kimm Ngânn', phoneBride: '0828127234', hasVideo: true, channel: { kind: 'fanpage' }, source: { cal: FV, eventId: 'fv1' } })
    // creates are merged, so they must not carry app-only fields that could wipe an unseen profile
    for (const k of ['consultDone', 'photo', 'video', 'notes']) expect(w.patch).not.toHaveProperty(k)
    expect(w.patch.channel).not.toHaveProperty('url')
    expect(w.patch.calNote).toContain('Khách: Kimm Ngânn')
    expect(r.count).toBe(1)
  })
  it('patches only synced fields when the calendar changed, never app-only fields', () => {
    const first = asWedding(plan([{ cal: FV, events: [kim] }]).writes[0])
    const mine: Wedding = { ...first, consultDone: true, notes: 'riêng', photo: { link: 'p', history: [] }, channel: { kind: 'fanpage', url: 'https://m.me/x' } }
    const moved = { ...kim, start: { dateTime: '2026-12-30T06:00:00+07:00' } }
    const r = plan([{ cal: FV, events: [moved] }], [mine])
    expect(r.writes).toHaveLength(1)
    const w = r.writes[0]
    expect(w.create).toBe(false)
    expect(w.id).toBe(first.id)
    expect(w.patch.date).toBe('2026-12-30')
    for (const k of ['consultDone', 'photo', 'video', 'notes']) expect(w.patch).not.toHaveProperty(k)
    expect(w.patch.channel).toBeUndefined()
  })
  it('writes nothing when the calendar is unchanged', () => {
    const first = asWedding(plan([{ cal: FV, events: [kim] }]).writes[0])
    expect(plan([{ cal: FV, events: [kim] }], [first]).writes).toEqual([])
  })
  it('an empty calendar value never clears an app value', () => {
    const first = asWedding(plan([{ cal: FV, events: [kim] }]).writes[0])
    const filled = { ...first, phoneGroom: '0909', addrRest: 'Sảnh A', times: { tParty: '11:00' } }
    const changed = { ...kim, summary: kim.summary!.replace('2 Quay', '3 Quay') }
    const w = plan([{ cal: FV, events: [changed] }], [filled]).writes[0]
    expect(w.patch).not.toHaveProperty('phoneGroom')
    expect(w.patch).not.toHaveProperty('addrRest')
    expect(w.patch.times).toBeUndefined()
  })
  it('channel kind from the calendar keeps the app link', () => {
    const first = { ...asWedding(plan([{ cal: FV, events: [kim] }]).writes[0]), channel: { kind: 'fanpage' as const, url: 'https://m.me/x' } }
    const zalo = { ...kim, summary: kim.summary!.replace('/ Page', '/ Zalo') }
    expect(plan([{ cal: FV, events: [zalo] }], [first]).writes[0].patch.channel).toEqual({ kind: 'zalo', url: 'https://m.me/x' })
  })
  it('merges the same booking found in both calendars, FrameVis wins', () => {
    const dupPhone = ev('pr1', 'Phóng sự cưới - Kim Ngân / FB (2 Chụp)', '2026-12-29', 'Khách: X · 0828 127 234')
    const dupName = ev('pr2', 'Phóng sự cưới - Kimm Ngânn / FB (2 Chụp)', '2026-12-29')
    const r = plan([{ cal: FV, events: [kim] }, { cal: PR, events: [dupPhone, dupName] }])
    expect(r.writes.map(w => w.id)).toEqual([calWeddingId(FV, 'fv1')])
    expect(r.count).toBe(1)
  })
  it('does not merge different couples on the same day', () => {
    const a = ev('a', 'Phóng sự cưới - Thanh Ngọc / Page (2 Chụp)', '2026-12-12')
    const b = ev('b', 'Phóng sự cưới - Thanh Ngân / Page (2 Chụp)', '2026-12-12')
    expect(plan([{ cal: PR, events: [a, b] }]).writes).toHaveLength(2)
  })
  it('two days of one FrameVis booking stay two profiles', () => {
    const d1 = ev('h1', 'Tiệc Báo Hỷ - Hải Yến / Page (2 Chụp)', '2026-12-26', 'Khách: Nguyễn Hải Yến · 0339951147\nID: bkG40')
    const d2 = ev('h2', 'Trọn Gói Cơ Bản - Hải Yến / Page (2 Chụp + 2 Quay)', '2026-12-27', 'Khách: Nguyễn Hải Yến · 0339951147\nID: bkG40')
    expect(plan([{ cal: FV, events: [d1, d2] }]).writes).toHaveLength(2)
  })
  it('marks a synced profile cancelled when its event is gone, and revives it when back', () => {
    const first = asWedding(plan([{ cal: FV, events: [kim] }]).writes[0])
    const gone = plan([{ cal: FV, events: [] }], [first])
    expect(gone.cancelled).toEqual([first.id])
    expect(gone.writes).toEqual([{ id: first.id, patch: { cancelled: true }, create: false }])
    const back = plan([{ cal: FV, events: [kim] }], [{ ...first, cancelled: true }])
    expect(back.writes[0].patch.cancelled).toBe(false)
  })
  it('never cancels manual profiles, other calendars, or events outside the window', () => {
    const manual = { ...emptyWedding('a'), id: 'm1', date: '2026-12-01', bride: 'A' }
    const other = { ...asWedding(plan([{ cal: PR, events: [ev('p9', 'Phóng sự cưới - Z / FB (2 Chụp)', '2026-12-05')] }]).writes[0]) }
    const old = { ...asWedding(plan([{ cal: FV, events: [ev('o1', 'Phóng sự cưới - Old / FB (2 Chụp)', '2026-08-01')] }]).writes[0]) }
    const r = plan([{ cal: FV, events: [] }], [manual, other, old])
    expect(r.cancelled).toEqual([])
  })
})
