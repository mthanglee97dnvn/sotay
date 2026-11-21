import { describe, it, expect } from 'vitest'
import { mergeAnswers, newToken, inviteMessage, validateAnswers, answersSig, prefillOf, changedAnswers } from '../src/domain/invite'
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
    expect(m.startsWith('Chào bạn! Mình gửi bạn phiếu thông tin tiệc báo hỷ')).toBe(true)
    expect(m).toContain('hai bạn')
    expect(m).not.toMatch(/\b(em|anh)\b/i)
  })
  it('validateAnswers lists missing required fields for the kind', () => {
    expect(validateAnswers('Tiệc báo hỷ', { bride: 'a', groom: 'b', phoneGroom: '1', date: '2026-12-01' })).toEqual(['Địa chỉ nhà hàng'])
    expect(validateAnswers('Đính hôn', { bride: 'a', groom: 'b', phoneGroom: '1', date: '2026-12-01', addrGroom: 'x' })).toEqual([])
  })
})

describe('answersSig', () => {
  it('is stable across key order and changes with values', () => {
    expect(answersSig({ a: '1', b: '2' })).toBe(answersSig({ b: '2', a: '1' }))
    expect(answersSig({ a: '1', b: '2' })).not.toBe(answersSig({ a: '1', b: '3' }))
    expect(answersSig({})).toBe(answersSig({}))
  })
})

describe('prefill and changed answers', () => {
  it('prefillOf copies only non-empty client-facing fields', () => {
    const w = { ...emptyWedding('a@x.com'), id: 'w', kind: 'Cưới' as const, bride: 'Lan', groom: '', phoneGroom: '0905', notes: 'nội bộ', date: '2026-12-20', times: { tRuoc: '09:30' } }
    expect(prefillOf(w)).toEqual({ kind: 'Cưới', bride: 'Lan', phoneGroom: '0905', date: '2026-12-20', tRuoc: '09:30' })
  })
  it('changedAnswers keeps only what the client added or changed', () => {
    expect(changedAnswers({ bride: 'Lan', groom: 'Minh', addrRest: ' ' }, { bride: 'Lan' })).toEqual({ groom: 'Minh' })
    expect(changedAnswers({ tRuoc: '09:30' }, { tRuoc: '10:00' })).toEqual({ tRuoc: '09:30' })
  })
  it('changedAnswers on a legacy invite (no base) keeps every answered field', () => {
    expect(changedAnswers({ bride: 'Lan' }, undefined)).toEqual({ bride: 'Lan' })
  })
  it('the "again" message says it is prefilled and asks to add what is missing', () => {
    const m = inviteMessage('Cưới', 'u', true)
    expect(m).toContain('điền sẵn'); expect(m).toContain('bổ sung'); expect(m).not.toContain('anh chị'); expect(m).toContain('u')
  })
})
