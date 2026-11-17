import { describe, it, expect } from 'vitest'
import { mergeAnswers, newToken, inviteMessage, validateAnswers } from '../src/domain/invite'
import { emptyWedding } from '../src/domain/wedding'

describe('invites', () => {
  it('mergeAnswers keeps existing values when an answer is empty and trims', () => {
    const w = { ...emptyWedding('a@x.com'), id: 'w', bride: 'Lan', phoneGroom: '0905', times: { tMakeup: '05:00' } }
    const p = mergeAnswers(w, { bride: '  Lan Anh ', groom: 'Minh', phoneGroom: '', tMakeup: '', tRuoc: '09:30', addrRest: ' Sảnh A ', note: 'Mang hoa', kind: 'Đính hôn', date: '2026-12-20' })
    expect(p.bride).toBe('Lan Anh')
    expect(p.groom).toBe('Minh')
    expect(p).not.toHaveProperty('phoneGroom')
    expect(p.times).toEqual({ tMakeup: '05:00', tRuoc: '09:30' })
    expect(p.addrRest).toBe('Sảnh A')
    expect(p.kind).toBe('Đính hôn')
    expect(p.date).toBe('2026-12-20')
    expect(p.notes).toBe('Khách ghi: Mang hoa')
  })
  it('mergeAnswers appends the client note to existing notes and ignores unknown kinds', () => {
    const w = { ...emptyWedding(''), notes: 'Gói 2 chụp' }
    const p = mergeAnswers(w, { note: 'Có flycam', kind: 'Lạ' })
    expect(p.notes).toBe('Gói 2 chụp\nKhách ghi: Có flycam')
    expect(p).not.toHaveProperty('kind')
  })
  it('token is 32 base62 chars and random', () => {
    const t = newToken()
    expect(t).toMatch(/^[0-9A-Za-z]{32}$/)
    expect(newToken()).not.toBe(t)
  })
  it('invite message uses the ceremony word and casual tone', () => {
    const m = inviteMessage('Tiệc báo hỷ', 'https://x/form.html#abc')
    expect(m).toContain('tiệc báo hỷ')
    expect(m).toContain('https://x/form.html#abc')
    expect(m.toLowerCase()).not.toContain('anh chị')
    expect(inviteMessage('Đính hôn', 'u')).toContain('lễ đính hôn')
  })
  it('validateAnswers lists missing required fields for the kind', () => {
    expect(validateAnswers('Tiệc báo hỷ', { bride: 'a', groom: 'b', phoneGroom: '1', date: '2026-12-01' })).toEqual(['Địa chỉ nhà hàng'])
    expect(validateAnswers('Đính hôn', { bride: 'a', groom: 'b', phoneGroom: '1', date: '2026-12-01', addrGroom: 'x' })).toEqual([])
  })
})
