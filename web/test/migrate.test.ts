import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { migrate, splitNames, parseOldDate, parseOldTime } from '../src/domain/migrate'

const file = () => JSON.parse(readFileSync(new URL('./fixtures/old-export.json', import.meta.url), 'utf8'))
const run = (existing = { weddings: [] as any[], taskIds: [] as string[], unmatchedIds: [] as string[] }) => migrate(file(), existing, 'admin@test.vn')

describe('migrate old export', () => {
  it('rejects other files', () => {
    expect(() => migrate({ app: 'x' }, { weddings: [], taskIds: [], unmatchedIds: [] }, 'a')).toThrow('File không phải dữ liệu Sổ Tay')
  })
  it('helpers parse names, dates and times', () => {
    expect(splitNames('Thu Hà và Quốc Bảo')).toEqual(['Thu Hà', 'Quốc Bảo'])
    expect(splitNames('Lan - Minh')).toEqual(['Lan', 'Minh'])
    expect(splitNames('Lan')).toEqual(['Lan', ''])
    expect(parseOldDate('20/12/2026')).toBe('2026-12-20')
    expect(parseOldDate('2026-12-27')).toBe('2026-12-27')
    expect(parseOldDate('mai')).toBe('')
    expect(parseOldTime('9:30')).toBe('09:30')
    expect(parseOldTime('05:00 PM')).toBe('17:00')
    expect(parseOldTime('9h')).toBe('9h')
  })
  it('keeps user tasks and notes as general tasks; drops generated, done-and-deleted ones', () => {
    const r = run()
    const titles = r.tasks.map(t => t.title).sort()
    expect(titles).toEqual(['Gọi in album', 'Mật khẩu wifi studio', 'Đã xong'])
    const t1 = r.tasks.find(t => t.title === 'Gọi in album')!
    expect(t1).toMatchObject({ body: 'Hỏi giá', due: 1795000000000, done: false, assigneeEmail: 'vo@test.vn', weddingId: null })
    expect(r.tasks.find(t => t.title === 'Mật khẩu wifi studio')!.due).toBe(null)
  })
  it('turns form responses and old shoot tasks into weddings without duplicates', () => {
    const r = run()
    const byName = Object.fromEntries(r.weddings.map(w => [w.bride + '&' + w.groom, w]))
    expect(Object.keys(byName).sort()).toEqual(['Kim Ngân&Tuấn Kiệt', 'Lan&Minh', 'Thu Hà&Quốc Bảo'])
    expect(byName['Lan&Minh']).toMatchObject({ kind: 'Cưới', date: '2026-12-20', phoneGroom: '0905 111 222', addrGroom: '12 Lê Lợi', times: { tRuoc: '09:30', tMakeup: '05:00' } })
    expect(byName['Lan&Minh'].notes).toContain('Gói dịch vụ: 2 chụp + 1 quay')
    expect(byName['Thu Hà&Quốc Bảo']).toMatchObject({ kind: 'Đính hôn', date: '2026-12-27', phoneBride: '0911', channel: { kind: 'zalo', url: '' } })
    expect(byName['Thu Hà&Quốc Bảo'].notes).toContain('Có flycam')
    expect(byName['Kim Ngân&Tuấn Kiệt']).toMatchObject({ kind: 'Đính hôn', date: '2026-10-07' })
  })
  it('links delivery records to weddings, keeping history and delivered state', () => {
    const r = run()
    const lan = r.weddings.find(w => w.bride === 'Lan')!
    expect(lan.photo).toEqual({ link: 'https://photos.app.goo.gl/new', history: [{ link: 'https://photos.app.goo.gl/old', at: 90 }], deliveredAt: 100 })
    const kn = r.weddings.find(w => w.bride === 'Kim Ngân')!
    expect(kn.photo.link).toBe('https://photos.app.goo.gl/kn')
    expect(kn.video).toMatchObject({ link: 'https://drive.google.com/v', deliveredAt: 300 })
    expect(kn.hasVideo).toBe(true)
    expect(r.unmatched).toEqual([expect.objectContaining({ name: '', link: 'https://photos.app.goo.gl/unknown', video: '' })])
    expect(r.report).toMatchObject({ weddings: 3, tasks: 3, linked: 2, unmatched: 1 })
  })
  it('is idempotent: importing again over its own output adds nothing', () => {
    const first = run()
    const again = migrate(file(), { weddings: first.weddings, taskIds: first.tasks.map(t => t.id), unmatchedIds: [] }, 'admin@test.vn')
    expect(again.report.weddings).toBe(0)
    expect(again.report.tasks).toBe(0)
    expect(again.report.unmatched).toBe(1)
    expect(again.report.linked).toBe(2)
  })
})

describe('re-import safety (review)', () => {
  it('does not overwrite links already set in v2', () => {
    const first = run()
    const lan = first.weddings.find(w => w.bride === 'Lan')!
    lan.photo = { link: 'https://v2/newer', history: [{ link: 'x', at: 1 }], deliveredAt: 9 }
    const kn = first.weddings.find(w => w.bride === 'Kim Ngân')!
    kn.photo = { link: '', history: [] }
    const again = migrate(file(), { weddings: first.weddings, taskIds: [], unmatchedIds: [] }, 'a')
    expect(again.weddings.find(w => w.bride === 'Lan')).toBeUndefined()
    expect(again.weddings.find(w => w.bride === 'Kim Ngân')!.photo.link).toBe('https://photos.app.goo.gl/kn')
  })
  it('does not recreate unmatched entries already handled', () => {
    const first = run()
    const again = migrate(file(), { weddings: first.weddings, taskIds: [], unmatchedIds: first.unmatched.map(u => u.id) }, 'a')
    expect(again.unmatched).toEqual([])
  })
})
