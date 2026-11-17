import { describe, it, expect } from 'vitest'
import { withNewLink, storeBuckets } from '../src/domain/store'
import { emptyWedding } from '../src/domain/wedding'
import type { Wedding } from '../src/domain/types'

const at = (d: string) => new Date(`${d}T10:00:00+07:00`)
const w = (p: Partial<Wedding>): Wedding => ({ ...emptyWedding(''), id: 'x', bride: 'A', groom: 'B', date: '2026-11-01', hasVideo: true, ...p })

describe('store', () => {
  it('withNewLink keeps the previous link in history', () => {
    const a = w({ photo: { link: 'old', history: [] } })
    const p = withNewLink(a, 'photo', ' new ', 1000)
    expect(p.photo).toEqual({ link: 'new', history: [{ link: 'old', at: 1000 }] })
  })
  it('withNewLink ignores unchanged links and starts without history', () => {
    expect(withNewLink(w({ photo: { link: 'same', history: [] } }), 'photo', 'same', 1)).toEqual({})
    expect(withNewLink(w({}), 'video', 'v1', 1).video).toEqual({ link: 'v1', history: [] })
  })
  it('buckets past ceremonies by their worst status, oldest late first; future ones stay out', () => {
    const now = at('2026-11-30')
    const ws = [
      w({ id: 'late1', date: '2026-11-10' }),                                     // photo late
      w({ id: 'late0', date: '2026-11-05' }),                                     // photo late, older
      w({ id: 'soon', date: '2026-11-22', hasVideo: false }),                     // photo day 8
      w({ id: 'wait', date: '2026-11-28', hasVideo: false }),                     // day 2
      w({ id: 'done', date: '2026-10-01', photo: { link: 'p', history: [], deliveredAt: 1 }, video: { link: 'v', history: [], deliveredAt: 1 } }),
      w({ id: 'vlate', date: '2026-10-01', photo: { link: 'p', history: [], deliveredAt: 1 } }), // video late
      w({ id: 'future', date: '2026-12-20' }),
    ]
    const b = storeBuckets(ws, now)
    expect(b.late.map(x => x.id)).toEqual(['vlate', 'late0', 'late1'])
    expect(b.dueSoon.map(x => x.id)).toEqual(['soon'])
    expect(b.waiting.map(x => x.id)).toEqual(['wait'])
    expect(b.done.map(x => x.id)).toEqual(['done'])
  })
})
