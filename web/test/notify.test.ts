import { describe, it, expect } from 'vitest'
import { buildEmail, APP_URL } from '../src/domain/notify'
import { readFileSync } from 'node:fs'

const answers = { kind: 'Cưới', bride: 'Linh', groom: 'Thắng', phoneGroom: '0766552110', date: '2027-02-15', addrGroom: '248/12 Nguyễn Phước Nguyên', tArrive: '08:00' }

describe('buildEmail', () => {
  it('subject names the couple, kind and date; update when already applied', () => {
    expect(buildEmail({ kind: 'Cưới', answers })!.subject).toBe('Phiếu mới: Linh & Thắng – Cưới 15/02/2027')
    expect(buildEmail({ kind: 'Cưới', answers, appliedAt: 1 })!.subject).toBe('Khách bổ sung phiếu: Linh & Thắng – Cưới 15/02/2027')
  })
  it('body lists answers with labels in form order, then what is missing, then the app link', () => {
    const b = buildEmail({ kind: 'Cưới', answers })!.body
    expect(b).toContain('Giờ nhà trai có mặt tại nhà gái & trình lễ: 08:00')
    expect(b).toContain('Ngày tổ chức: 15/02/2027')
    expect(b.indexOf('Tên cô dâu: Linh')).toBeLessThan(b.indexOf('Tên chú rể: Thắng'))
    expect(b).toContain('Chưa có: Số điện thoại cô dâu, Địa chỉ nhà gái, Giờ makeup (trang điểm), Giờ nhà trai xuất phát đến nhà gái')
    expect(b).not.toContain('Giờ cô dâu cần makeup xong')
    expect(b).toContain(APP_URL)
  })
  it('omits the missing line when nothing is missing, and keeps HTML-like text literal', () => {
    const full = { kind: 'Tiệc báo hỷ', bride: '<b>A</b>', groom: 'B', phoneBride: '1', phoneGroom: '2', date: '2027-01-09', addrRest: 'Sảnh', tWelcome: '10:00', tParty: '11:00' }
    const b = buildEmail({ kind: 'Tiệc báo hỷ', answers: full })!.body
    expect(b).not.toContain('Chưa có')
    expect(b).toContain('Tên cô dâu: <b>A</b>')
  })
  it('returns null without answers', () => {
    expect(buildEmail({ kind: 'Cưới', answers: {} })).toBe(null)
    expect(buildEmail({})).toBe(null)
  })
})

describe('custom domain', () => {
  it('links emails and the installed app to sotay.mthangleestudio.com', () => {
    expect(APP_URL).toBe('https://sotay.mthangleestudio.com/')
    const m = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'))
    expect([m.start_url, m.scope]).toEqual(['/', '/'])
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
    expect(html).not.toContain('/sotay/')
  })
})
