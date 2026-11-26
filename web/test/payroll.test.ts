import { describe, it, expect } from 'vitest'
import { money, parseMoney, monthOf, shiftMonth, monthTotals, statement, SEED_ITEMS, type PayEntry, type PayConfig } from '../src/domain/payroll'

const e = (o: Partial<PayEntry>): PayEntry => ({ id: Math.random().toString(36).slice(2), date: '2026-11-22', personId: 'p1', person: 'Linh', item: 'Chỉnh sửa ảnh cưới phóng sự cơ bản – 2 máy', price: 600000, createdAt: 1, updatedAt: 1, ...o })
const cfg: PayConfig = { people: [{ id: 'p1', name: 'Linh' }, { id: 'p2', name: 'Hùng' }], items: SEED_ITEMS }

describe('payroll', () => {
  it('formats and parses money', () => {
    expect(money(600000)).toBe('600.000đ')
    expect(money(10050000)).toBe('10.050.000đ')
    expect(money(0)).toBe('0đ')
    for (const s of ['600.000', '600000', '600k', '600K', ' 600 000 ']) expect(parseMoney(s)).toBe(600000)
    expect(parseMoney('1,2tr')).toBe(1200000)
    expect(parseMoney('')).toBe(null)
    expect(parseMoney('abc')).toBe(null)
  })
  it('seeds the nine editing prices in order', () => {
    expect(SEED_ITEMS.map(i => i.price)).toEqual([400000, 250000, 600000, 800000, 400000, 250000, 400000, 600000, 900000])
    expect(SEED_ITEMS[3].name).toBe('Chỉnh sửa ảnh cưới phóng sự cơ bản – 3 máy')
    expect(new Set(SEED_ITEMS.map(i => i.id)).size).toBe(9)
  })
  it('moves between months across years', () => {
    expect(monthOf('2026-11-30')).toBe('2026-11')
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
  })
  it("totals each person's month from the stored prices, highest first", () => {
    const rows = monthTotals([
      e({ date: '2026-11-30' }), e({ date: '2026-11-02', price: 250000 }),
      e({ date: '2026-12-01' }), e({ date: '2026-10-31' }),
      e({ personId: 'p2', person: 'Hùng', price: 900000 }),
      e({ personId: 'gone', person: 'Tú (cũ)', price: 400000 }),
    ], '2026-11', cfg)
    expect(rows.map(r => [r.name, r.count, r.total])).toEqual([['Hùng', 1, 900000], ['Linh', 2, 850000], ['Tú (cũ)', 1, 400000]])
    expect(rows[1].entries.map(x => x.date)).toEqual(['2026-11-02', '2026-11-30'])
  })
  it('shows a renamed person under the new name in one row', () => {
    const rows = monthTotals([e({ person: 'Lin' }), e({ person: 'Linh' })], '2026-11', { ...cfg, people: [{ id: 'p1', name: 'Linh Nguyễn' }] })
    expect(rows).toHaveLength(1)
    expect(rows[0].name).toBe('Linh Nguyễn')
  })
  it('writes the statement to send for checking', () => {
    const [row] = monthTotals([e({ date: '2026-11-22', weddingName: 'Trà My & Phát Lộc' }), e({ date: '2026-11-05', item: 'Chỉnh sửa ảnh hôn phối phóng sự', price: 400000 })], '2026-11', cfg)
    expect(statement(row, '2026-11')).toBe(`CHẤM CÔNG THÁNG 11/2026 – Linh
- 05/11 Chỉnh sửa ảnh hôn phối phóng sự: 400.000đ
- 22/11 Chỉnh sửa ảnh cưới phóng sự cơ bản – 2 máy (Trà My & Phát Lộc): 600.000đ
Tổng: 2 bộ – 1.000.000đ`)
  })
})
