import { describe, it, expect } from 'vitest'
import { siblingDraft, withCoupleKey, upcomingChips, channelUrl, emptyWedding } from '../src/domain/wedding'
import type { Wedding, Task } from '../src/domain/types'

const at = (d: string, t = '10:00') => new Date(`${d}T${t}:00+07:00`)
const w = (p: Partial<Wedding> = {}): Wedding => ({ ...emptyWedding('a@x.com'), id: 'w1', bride: 'Lan', groom: 'Minh', date: '2026-12-01', ...p })
const t = (p: Partial<Task>): Task => ({ id: 't', title: 'x', body: '', due: null, done: false, weddingId: null, assigneeEmail: null, createdByEmail: 'a@x.com', updatedAt: 0, ...p })

describe('wedding helpers', () => {
  it('siblingDraft copies couple and contact, not ceremony specifics', () => {
    const src = w({ phoneBride: '1', phoneGroom: '2', channel: { kind: 'zalo', url: 'z' }, coupleKey: 'k', kind: 'Đính hôn', times: { tMakeup: '05:00' }, consultDone: true, photo: { link: 'p', history: [] } })
    const d = siblingDraft(src)
    expect(d).toMatchObject({ bride: 'Lan', groom: 'Minh', phoneBride: '1', phoneGroom: '2', channel: { kind: 'zalo', url: 'z' }, coupleKey: 'k' })
    for (const k of ['id', 'date', 'kind', 'times', 'photo', 'video', 'consultDone']) expect(d).not.toHaveProperty(k)
  })
  it('coupleKey is set from names on first save and kept after', () => {
    expect(withCoupleKey(w({ coupleKey: '', bride: 'Lân', groom: 'Đức' })).coupleKey).toBe('lan|duc')
    expect(withCoupleKey(w({ coupleKey: 'keep', bride: 'Other' })).coupleKey).toBe('keep')
  })
  it('upcomingChips counts consult due, late deliveries, today tasks and new forms', () => {
    const now = at('2026-11-17')
    const ws = [
      w({ id: 'a', date: '2026-12-20' }),                          // consult due (33 d)
      w({ id: 'b', date: '2026-12-20', consultDone: true }),       // not due
      w({ id: 'c', date: '2026-10-01', hasVideo: true }),          // photo + video late
      w({ id: 'd', date: '2026-10-01', hasVideo: false, photo: { link: 'x', history: [], deliveredAt: 1 } }), // done
    ]
    const ts = [t({ due: at('2026-11-17', '23:50').getTime() }), t({ due: at('2026-11-18', '08:00').getTime() }), t({ due: at('2026-11-17', '09:00').getTime(), done: true })]
    expect(upcomingChips(ws, ts, 45, 2, now)).toEqual({ consult: 1, late: 1, today: 1, newForms: 2 })
  })
  it('channelUrl falls back to the fanpage inbox', () => {
    expect(channelUrl(w({ channel: { kind: 'zalo', url: 'https://zalo.me/0905' } }))).toBe('https://zalo.me/0905')
    expect(channelUrl(w({ channel: { kind: 'fanpage', url: '' } }))).toBe('https://business.facebook.com/latest/inbox/all')
    expect(channelUrl(w({ channel: { kind: 'zalo', url: '' } }))).toBe('')
  })
})
