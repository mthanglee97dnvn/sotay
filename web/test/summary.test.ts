import { describe, it, expect } from 'vitest'
import { summarize } from '../src/domain/summary'
import { emptyWedding } from '../src/domain/wedding'
import type { Wedding, Task } from '../src/domain/types'

const w = (p: Partial<Wedding>): Wedding => ({ ...emptyWedding(''), id: 'x', bride: 'A', groom: 'B', ...p })
const t = (p: Partial<Task>): Task => ({ id: 't', title: 'x', body: '', due: null, done: false, weddingId: null, assigneeEmail: null, createdByEmail: '', updatedAt: 0, ...p })

describe('summary', () => {
  it('counts the next 6 months including empty ones, plus consult/late/due-soon/open tasks', () => {
    const now = new Date('2026-11-30T10:00:00+07:00')
    const s = summarize([
      w({ id: 'a', date: '2026-11-21', hasVideo: false }),   // past, photo day 9 → due soon
      w({ id: 'b', date: '2026-12-20' }),                     // consult due (20 d)
      w({ id: 'c', date: '2026-12-27', consultDone: true }),
      w({ id: 'd', date: '2026-10-01', hasVideo: false }),   // photo late
    ], [t({}), t({ done: true })], 45, now)
    expect(s.byMonth).toEqual([
      { month: '11/2026', count: 1 }, { month: '12/2026', count: 2 }, { month: '01/2027', count: 0 },
      { month: '02/2027', count: 0 }, { month: '03/2027', count: 0 }, { month: '04/2027', count: 0 },
    ])
    expect(s).toMatchObject({ consultDue: 1, late: 1, dueSoon: 1, openTasks: 1 })
  })
})
