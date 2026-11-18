import { describe, it, expect } from 'vitest'
import { todayVN, daysUntil, addDays, dmy } from '../src/domain/vn-date'
import { fieldsFor } from '../src/domain/ceremony'
import { deliveryStatus } from '../src/domain/delivery'
import { consultDue, consultMessage, ekipReminder } from '../src/domain/consult'
import { norm, matches } from '../src/domain/search'
import type { Wedding } from '../src/domain/types'

const at = (vnDate: string, time = '10:00') => new Date(`${vnDate}T${time}:00+07:00`)
const w = (p: Partial<Wedding> = {}): Wedding => ({
  id: 'w1', kind: 'Cưới', date: '2026-11-01', bride: 'Lan', groom: 'Minh',
  phoneBride: '', phoneGroom: '', addrBride: '', addrGroom: '', addrRest: '', times: {},
  channel: { kind: 'fanpage', url: '' }, notes: '', hasVideo: true, consultDone: false,
  photo: { link: '', history: [] }, video: { link: '', history: [] },
  coupleKey: 'lan|minh', createdByEmail: 'a@x.com', updatedAt: 0, ...p,
})

describe('vn-date', () => {
  it('todayVN uses Vietnam time, not device time', () => {
    expect(todayVN(new Date('2026-11-17T17:30:00Z'))).toBe('2026-11-18')
    expect(todayVN(new Date('2026-11-17T16:59:00Z'))).toBe('2026-11-17')
  })
  it('daysUntil counts calendar days in Vietnam', () => {
    expect(daysUntil('2026-12-20', new Date('2026-11-17T03:00:00Z'))).toBe(33)
    expect(daysUntil('2026-11-18', at('2026-11-17', '23:30'))).toBe(1)
    expect(daysUntil('2026-11-17', at('2026-11-17', '23:59'))).toBe(0)
  })
  it('addDays and dmy', () => {
    expect(addDays('2026-12-25', 10)).toBe('2027-01-04')
    expect(dmy('2026-12-20')).toBe('20/12/2026')
  })
})

describe('ceremony fields', () => {
  const keys = (k: Parameters<typeof fieldsFor>[0]) => fieldsFor(k).filter(f => f.k).map(f => f.k)
  it('Đính hôn has no rước dâu and no restaurant', () => {
    expect(keys('Đính hôn')).not.toContain('tRuoc')
    expect(keys('Đính hôn')).not.toContain('addrRest')
  })
  it('Tiệc báo hỷ has only restaurant, phones, welcome and party times', () => {
    expect(keys('Tiệc báo hỷ')).toEqual(['kind', 'date', 'bride', 'groom', 'phoneBride', 'phoneGroom', 'addrRest', 'tWelcome', 'tParty'])
    expect(fieldsFor('Tiệc báo hỷ').find(f => f.k === 'addrRest')!.req).toBe(true)
  })
  it('pairs line up: kind|date, then bride|groom, phones', () => {
    const f = fieldsFor('Cưới')
    const i = (k: string) => f.findIndex(x => x.k === k)
    expect(f[0].k).toBe('kind'); expect(f[1].k).toBe('date')
    expect(f[2].sec).toBe('Cô dâu & chú rể')
    expect([i('bride') + 1, i('phoneBride') + 1]).toEqual([i('groom'), i('phoneGroom')])
  })
  it('Cưới has everything', () => {
    expect(keys('Cưới')).toContain('tRuoc')
    expect(keys('Cưới')).toContain('addrRest')
    expect(fieldsFor('Cưới').find(f => f.k === 'addrRest')!.req).toBeFalsy()
  })
})

describe('delivery status', () => {
  it('photo goes waiting → due-soon (day 7–10) → late (day 11)', () => {
    expect(deliveryStatus(w(), 'photo', at('2026-11-05'))).toBe('waiting')
    expect(deliveryStatus(w(), 'photo', at('2026-11-08'))).toBe('due-soon')
    expect(deliveryStatus(w(), 'photo', at('2026-11-11'))).toBe('due-soon')
    expect(deliveryStatus(w(), 'photo', at('2026-11-12'))).toBe('late')
  })
  it('done once delivered', () => {
    expect(deliveryStatus(w({ photo: { link: 'x', history: [], deliveredAt: 1 } }), 'photo', at('2026-12-30'))).toBe('done')
  })
  it('video na for photo-only jobs, due at day 25, late after day 30', () => {
    expect(deliveryStatus(w({ hasVideo: false }), 'video', at('2026-12-30'))).toBe('na')
    expect(deliveryStatus(w(), 'video', at('2026-11-26'))).toBe('due-soon')
    expect(deliveryStatus(w(), 'video', at('2026-12-02'))).toBe('late')
  })
  it('future ceremony is waiting', () => {
    expect(deliveryStatus(w({ date: '2026-12-20' }), 'photo', at('2026-11-17'))).toBe('waiting')
  })
})

describe('consult', () => {
  const now = at('2026-11-17')
  it('due within lead days, not when done or past', () => {
    expect(consultDue(w({ date: addDays('2026-11-17', 45) }), 45, now)).toBe(true)
    expect(consultDue(w({ date: addDays('2026-11-17', 46) }), 45, now)).toBe(false)
    expect(consultDue(w({ date: addDays('2026-11-17', 10), consultDone: true }), 45, now)).toBe(false)
    expect(consultDue(w({ date: '2026-11-10' }), 45, now)).toBe(false)
  })
  it('consult message is casual mình/bạn with countdown and date', () => {
    const m = consultMessage(w({ date: '2026-12-20' }), now)
    expect(m.startsWith('Chào bạn! Mình bên MThanglee Studio')).toBe(true)
    expect(m).not.toMatch(/(^|\s)(em|anh)(\s|[.,!]|$)/i)
    expect(m).toContain('Còn khoảng 5 tuần nữa')
    expect(m).toContain('20/12/2026')
    expect(m.toLowerCase()).not.toContain('anh chị')
  })
  it('countdown in weeks from 14 days', () => {
    expect(consultMessage(w({ date: addDays('2026-11-17', 9) }), now)).toContain('Còn khoảng 9 ngày nữa')
    expect(consultMessage(w({ date: addDays('2026-11-17', 15) }), now)).toContain('Còn khoảng 2 tuần nữa')
  })
  it('ekip reminder names couple, date and deadline', () => {
    const m = ekipReminder(w({ date: '2026-11-01' }), 'photo', at('2026-11-09'))
    expect(m).toContain('Lan & Minh')
    expect(m).toContain('01/11/2026')
    expect(m).toContain('11/11')
    expect(m).toContain('ảnh')
    expect(m).not.toMatch(/\bem\b/)
    expect(ekipReminder(w(), 'video', at('2026-11-09'))).toContain('01/12')
  })
})

describe('search', () => {
  it('norm strips Vietnamese diacritics and đ', () => {
    expect(norm('Nguyễn Đức Lân')).toBe('nguyen duc lan')
  })
  it('matches names, phones without spaces, and date', () => {
    expect(matches(w({ bride: 'Lân' }), 'lan')).toBe(true)
    expect(matches(w({ groom: 'Nguyễn Đức' }), 'nguyen duc')).toBe(true)
    expect(matches(w({ phoneBride: '0905 123 456' }), '0905123')).toBe(true)
    expect(matches(w({ date: '2026-12-20' }), '20/12')).toBe(true)
    expect(matches(w(), 'zzz')).toBe(false)
    expect(matches(w(), '')).toBe(true)
  })
})
