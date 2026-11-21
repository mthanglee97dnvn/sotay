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
    const other = ev('o2', 'Phóng sự cưới - Còn Lại / FB (2 Chụp)', '2026-12-30')
    const gone = plan([{ cal: FV, events: [other] }], [first])
    expect(gone.cancelled).toEqual([first.id])
    expect(gone.writes.filter(w => !w.create)).toEqual([{ id: first.id, patch: { cancelled: true }, create: false }])
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

describe('review fixes', () => {
  it('I1: never merges on name alone when phones differ, nor different ceremonies', () => {
    const a = ev('a', 'Phóng sự cưới - Ngọc Anh / Page (2 Chụp)', '2026-12-12', 'Khách: Ngọc Anh · 0905000001')
    const b = ev('b', 'Phóng sự cưới - Ngọc Ánh / Page (2 Chụp)', '2026-12-12', 'Khách: Ngọc Ánh · 0905000002')
    expect(plan([{ cal: FV, events: [a, b] }]).count).toBe(2)
    const party = ev('c', 'Tiệc báo hỷ - Ngọc Anh / Page (2 Chụp)', '2026-12-12', 'Khách: Ngọc Anh · 0905000001')
    expect(plan([{ cal: FV, events: [a, party] }]).count).toBe(2)
    const pr = ev('p', 'Phóng sự cưới - Ngọc Ánh / FB (2 Chụp)', '2026-12-12', 'Khách: X · 0905000009')
    expect(plan([{ cal: FV, events: [a] }, { cal: PR, events: [pr] }]).count).toBe(2)
  })
  it('I2: a profile first made from the primary calendar is reused when FrameVis appears', () => {
    const prEv = ev('pr1', 'Phóng sự cưới - Kim Ngân / FB (2 Chụp)', '2026-12-29', 'Khách: X · 0828127234')
    const P = { ...asWedding(plan([{ cal: PR, events: [prEv] }]).writes[0]), consultDone: true }
    const r = plan([{ cal: FV, events: [kim] }, { cal: PR, events: [prEv] }], [P])
    expect(r.cancelled).toEqual([])
    expect(r.writes.map(w => [w.id, w.create])).toEqual([[P.id, false]])
    expect(r.writes[0].patch.source?.cal).toBe(FV)
  })
  it('I3: no false cancel at the edges of the read window', () => {
    const edge = asWedding(plan([{ cal: FV, events: [ev('e', 'Phóng sự cưới - Edge / FB (2 Chụp)', '2026-09-19')] }]).writes[0])
    expect(plan([{ cal: FV, events: [kim] }], [edge]).cancelled).toEqual([])
  })
  it('I5: an empty or mostly-missing calendar does not mass-cancel', () => {
    const many = Array.from({ length: 6 }, (_, i) => ev('m' + i, `Phóng sự cưới - Khách ${'ABCDEF'[i]} / FB (2 Chụp)`, '2026-12-1' + i))
    const ws = plan([{ cal: FV, events: many }]).writes.map(asWedding)
    const empty = plan([{ cal: FV, events: [] }], ws)
    expect(empty.cancelled).toEqual([])
    expect(empty.guarded).toEqual([FV])
    const oneLeft = plan([{ cal: FV, events: [many[0]] }], ws)
    expect(oneLeft.cancelled).toEqual([])
    const oneGone = plan([{ cal: FV, events: many.slice(1) }], ws)
    expect(oneGone.cancelled).toEqual([ws[0].id])
  })
  it('I6: a value removed on the calendar is cleared; values the calendar never had stay editable', () => {
    const withTimes = { ...kim, description: kim.description + '\nNote: TIMELINE / A - B\n* Nhà hàng\n- Giờ đãi tiệc : 11H00' }
    const first = asWedding(plan([{ cal: FV, events: [withTimes] }]).writes[0])
    expect(first.calFields).toContain('tParty')
    expect(first.calFields).not.toContain('addrRest')
    const fromForm = { ...first, addrRest: 'Sảnh A' }
    const removed = plan([{ cal: FV, events: [kim] }], [fromForm]).writes[0].patch
    expect(removed.times).toEqual({})
    expect(removed).not.toHaveProperty('addrRest')
    expect(removed.calFields).not.toContain('tParty')
  })
})

describe('duplicate bookings in one calendar (FrameVis double entries)', () => {
  const T = (h: string, n = 'Thanh Ngọc - Huy Nhật') => `\nNote: TIMELINE / ${n}\n* Nhà hàng\n- Giờ đãi tiệc : ${h}`
  const old = { ...ev('d1', 'Phóng sự cưới - Ngô Thị Thanh Ngọc / Page (2 Chụp)', '2026-11-28', 'Khách: Ngô Thị Thanh Ngọc · 0898628629' + T('11H00', 'Ngô Thị Thanh Ngọc - Lại Huy Nhật')), updated: '2026-11-01T00:00:00Z' }
  const neu = { ...ev('d2', 'Phóng sự cưới - Thanh Ngọc / Page (2 Chụp)', '2026-11-28', 'Khách: Thanh Ngọc · 0898628629' + T('12H00')), updated: '2026-11-10T00:00:00Z' }
  it('one profile per booking when the same calendar has it twice (same day, kind and phone)', () => {
    const r = plan([{ cal: FV, events: [old, neu] }])
    expect(r.count).toBe(1)
    expect(r.writes).toHaveLength(1)
  })
  it('the most recently edited event wins; its blanks are filled from the other', () => {
    const blankNew = { ...neu, description: 'Khách: Thanh Ngọc · 0898628629' }
    const p1 = plan([{ cal: FV, events: [old, neu] }]).writes[0].patch
    expect(p1.bride).toBe('Thanh Ngọc'); expect(p1.times?.tParty).toBe('12:00')
    const p2 = plan([{ cal: FV, events: [old, blankNew] }]).writes[0].patch
    expect(p2.times?.tParty).toBe('11:00')
  })
  it('keeps the fuller existing profile, carries app data over, deletes the other', () => {
    const fuller = { ...emptyWedding('a@x.com'), id: calWeddingId(FV, 'd1'), date: '2026-11-28', bride: 'Ngô Thị Thanh Ngọc', phoneBride: '0898628629', addrRest: 'For You', times: { tParty: '11:00' }, source: { cal: FV, eventId: 'd1', bookingId: '', title: '' } } as Wedding
    const thin = { ...emptyWedding('a@x.com'), id: calWeddingId(FV, 'd2'), date: '2026-11-28', bride: 'Thanh Ngọc', phoneBride: '0898628629', consultDone: true, notes: 'gọi lúc 8h',
      photo: { link: 'https://photos/x', history: [] }, formToken: 'TOK', source: { cal: FV, eventId: 'd2', bookingId: '', title: '' } } as Wedding
    const r = plan([{ cal: FV, events: [old, neu] }], [fuller, thin])
    expect(r.deletes).toEqual([thin.id])
    expect(r.mergedInto).toEqual({ [thin.id]: fuller.id })   // client-form links of the deleted profile move to the kept one
    const w = r.writes.find(x => x.id === fuller.id)!
    expect(w.patch).toMatchObject({ consultDone: true, notes: 'gọi lúc 8h', formToken: 'TOK', photo: { link: 'https://photos/x', history: [] } })
    expect(r.writes.some(x => x.id === thin.id)).toBe(false)
    // Next sync: nothing left to merge or delete.
    const merged = asWedding({ id: fuller.id, patch: { ...fuller, ...w.patch } })
    expect(plan([{ cal: FV, events: [old, neu] }], [merged]).deletes).toEqual([])
  })
  it('different ceremonies or different phones on the same day stay separate', () => {
    const party = { ...ev('d3', 'Tiệc báo hỷ - Thanh Ngọc / Page (2 Chụp)', '2026-11-28', 'Khách: Thanh Ngọc · 0898628629'), updated: '2026-11-11T00:00:00Z' }
    expect(plan([{ cal: FV, events: [old, party] }]).count).toBe(2)
    const other = { ...ev('d4', 'Phóng sự cưới - Thanh Ngọc / Page (2 Chụp)', '2026-11-28', 'Khách: Thanh Ngọc · 0905111222'), updated: '2026-11-11T00:00:00Z' }
    expect(plan([{ cal: FV, events: [old, other] }]).count).toBe(2)
  })
})
