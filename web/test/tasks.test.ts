import { describe, it, expect } from 'vitest'
import { groupTasks, isMine } from '../src/domain/tasks'
import { eventFor, planSync, type CalEvent } from '../src/domain/gcal-plan'
import type { Task } from '../src/domain/types'
import { emptyWedding } from '../src/domain/wedding'

const at = (d: string, t = '10:00') => new Date(`${d}T${t}:00+07:00`)
const t = (p: Partial<Task>): Task => ({ id: 't', title: 'Gọi khách', body: '', due: null, done: false, weddingId: null, assigneeEmail: null, createdByEmail: 'a@x.com', updatedAt: 0, ...p })

describe('tasks', () => {
  it('groups by Vietnam day', () => {
    const now = at('2026-11-17', '09:00')
    const g = groupTasks([
      t({ id: 'late', due: at('2026-11-16', '20:00').getTime() }),
      t({ id: 'today', due: at('2026-11-17', '23:50').getTime() }),
      t({ id: 'earlier', due: at('2026-11-17', '08:00').getTime() }),
      t({ id: 'up', due: at('2026-11-18', '07:00').getTime() }),
      t({ id: 'nodate' }),
      t({ id: 'done', done: true, due: at('2026-11-10').getTime() }),
    ], now)
    expect(g.late.map(x => x.id)).toEqual(['late'])
    expect(g.today.map(x => x.id)).toEqual(['earlier', 'today'])
    expect(g.upcoming.map(x => x.id)).toEqual(['up'])
    expect(g.noDate.map(x => x.id)).toEqual(['nodate'])
    expect(g.done.map(x => x.id)).toEqual(['done'])
  })
  it('isMine: assignee, else creator, else admin', () => {
    expect(isMine(t({ assigneeEmail: 'B@x.com' }), 'b@x.com', 'a@x.com')).toBe(true)
    expect(isMine(t({ assigneeEmail: 'b@x.com' }), 'a@x.com', 'a@x.com')).toBe(false)
    expect(isMine(t({ createdByEmail: 'c@x.com' }), 'c@x.com', 'a@x.com')).toBe(true)
    expect(isMine(t({ createdByEmail: '' }), 'a@x.com', 'a@x.com')).toBe(true)
  })
})

describe('google calendar plan', () => {
  const now = at('2026-11-17')
  const due = at('2026-11-20', '09:00').getTime()
  it('eventFor builds a 30-minute VN event with a popup and no attendees', () => {
    const w = { ...emptyWedding(''), bride: 'Lan', groom: 'Minh' }
    const e = eventFor(t({ id: 'x', due }), w)
    expect(e.summary).toBe('Gọi khách – Lan & Minh')
    expect(e.start.timeZone).toBe('Asia/Ho_Chi_Minh')
    expect(new Date(e.end.dateTime).getTime() - new Date(e.start.dateTime).getTime()).toBe(30 * 60e3)
    expect(e.reminders).toEqual({ useDefault: false, overrides: [{ method: 'popup', minutes: 0 }] })
    expect(e.extendedProperties.private.sotayApp).toBe('2')
    expect(e.extendedProperties.private.sotayId).toBe('x')
    expect(e).not.toHaveProperty('attendees')
  })
  it('planSync creates, updates on sig change, deletes stale, ignores foreign', () => {
    const mine = [t({ id: 'new', due }), t({ id: 'same', due }), t({ id: 'changed', due, title: 'Mới' })]
    const ev = (id: string, sotayId: string, sig: string, app = '2'): CalEvent => ({ id, extendedProperties: { private: { sotayApp: app, sotayId, sig } } })
    const sameSig = eventFor(mine[1]).extendedProperties.private.sig
    const p = planSync(mine, [ev('e1', 'same', sameSig), ev('e2', 'changed', 'old'), ev('e3', 'gone', 'x'), ev('e4', 'foreign', 'x', '9'), { id: 'e5' }], () => undefined, now)
    expect(p.create.map(x => x.extendedProperties.private.sotayId)).toEqual(['new'])
    expect(p.update.map(x => x.eventId)).toEqual(['e2'])
    expect(p.delete).toEqual(['e3'])
  })
  it('planSync drops done, undated and long-past tasks', () => {
    const p = planSync([t({ id: 'd', due, done: true }), t({ id: 'n' }), t({ id: 'p', due: at('2026-11-10').getTime() })], [], () => undefined, now)
    expect(p.create).toEqual([])
  })
})

import { eventIdFor } from '../src/domain/gcal-plan'
describe('calendar event ids (review: duplicates across devices)', () => {
  it('derives a stable base32hex event id from the task id', () => {
    const id = eventIdFor('AbC9xyz')
    expect(id).toMatch(/^[a-v0-9]{5,1024}$/)
    expect(eventIdFor('AbC9xyz')).toBe(id)
    expect(eventIdFor('AbC9xyZ')).not.toBe(id)
    expect(eventFor(t({ id: 'AbC9xyz', due: 1 })).id).toBe(id)
  })
})
