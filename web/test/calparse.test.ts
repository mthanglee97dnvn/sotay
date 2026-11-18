import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseBooking, plainText, parseClock } from '../src/domain/calparse'

const E = JSON.parse(readFileSync(new URL('./fixtures/cal-events.json', import.meta.url), 'utf8'))
const p = (k: string) => parseBooking(E[k])!

describe('title', () => {
  it('reads kind, video, channel and client name', () => {
    expect(p('tuongVy')).toMatchObject({ kind: 'Cưới', hasVideo: true, channelKind: 'instagram', clientName: 'Tường Vy' })
    expect(p('framevisParty')).toMatchObject({ kind: 'Tiệc báo hỷ', hasVideo: false, channelKind: 'fb' })
    expect(p('zalo')).toMatchObject({ kind: 'Đính hôn', channelKind: 'zalo' })
    expect(p('html').channelKind).toBe('fanpage')
    expect(p('framevisTwoDay')).toMatchObject({ kind: 'Tiệc báo hỷ', clientName: 'Hải Yến' })
  })
  it('skips non-bookings and our own reminders', () => {
    expect(parseBooking(E.thoiNoi)).toBe(null)
    expect(parseBooking({ ...E.tuongVy, extendedProperties: { private: { sotayApp: '2' } } })).toBe(null)
  })
  it('date is the Vietnam day of the start', () => {
    expect(p('framevisFull').date).toBe('2026-11-24')
    expect(p('tuongVy').date).toBe('2026-11-24')
  })
})

describe('timeline', () => {
  it('FrameVis note with sections', () => {
    expect(p('framevisFull')).toMatchObject({
      bride: 'Thục Đoan', groom: 'Hoàng Thắng',
      addrGroom: '34 Tiểu La, phường Hoà Cường, Đà Nẵng', phoneGroom: '0905375721',
      addrBride: '03 Thanh Lương 01, Đà Nẵng', phoneBride: '0702484591',
      addrRest: 'For You Luxury tầng 2', times: { tArrive: '07:30', tParty: '11:00' },
      clientPhone: '0905375721', bookingId: 'bkRJVE9P3877220Q',
    })
  })
  it('party note without sections', () => {
    expect(p('framevisParty')).toMatchObject({ bride: 'Bảo Ngọc', groom: 'Văn Hoàng', phoneBride: '0901212740', phoneGroom: '0379678460', addrRest: 'White Swan (01 Đinh Thị Hoà)', times: { tParty: '17:00' } })
  })
  it('HTML description parses like plain text', () => {
    const b = p('html')
    expect(b).toMatchObject({ phoneGroom: '0931922399', phoneBride: '0898628629', times: { tParty: '17:00', tArrive: '09:00' } })
    expect(b.addrRest.startsWith('For you')).toBe(true)
    expect(b.bride).toBe('Thanh Ngọc')
  })
  it('takes the first time in a sentence; non-phone text is not a phone', () => {
    const b = p('plainMakeup')
    expect(b.times.tMakeup).toBe('08:00')
    expect(b.phoneGroom).toBe('')
    expect(b.times.tDepart).toBe('08:45')
  })
  it('engagement with "&" names, "Số điện thoại" label and range times', () => {
    expect(p('zalo')).toMatchObject({ bride: 'Thục Anh', groom: 'Văn Lai', phoneGroom: '0374428791', phoneBride: '0905698001', times: { tDepart: '08:30', tArrive: '09:00', tMakeup: '07:15' } })
  })
  it('fallbacks: quote-only uses title name; FrameVis without note uses Khách line', () => {
    expect(p('quoteOnly')).toMatchObject({ bride: 'Anna N Lopez', groom: '' })
    expect(p('framevisNoNote')).toMatchObject({ bride: 'Trương Thanh Tâm', groom: 'Trần Văn Quốc Nguyên' })
    expect(p('tuongVy')).toMatchObject({ bride: 'Huỳnh Thị Tường Vi', clientPhone: '0934758189' })
  })
  it('calNote keeps the original text, without HTML', () => {
    expect(p('zalo').calNote).toContain('Phụ kiện cô dâu : Quạt xếp hồng')
    expect(p('html').calNote).not.toContain('<p>')
    expect(p('plainMakeup').calNote).not.toContain(' ')
  })
})

describe('helpers', () => {
  it('parseClock', () => {
    expect(parseClock('7H30')).toBe('07:30')
    expect(parseClock('3h30p')).toBe('03:30')
    expect(parseClock('7:30')).toBe('07:30')
    expect(parseClock('2h-4h hoàn thiện')).toBe('02:00')
    expect(parseClock('')).toBe('')
    expect(parseClock('chưa có')).toBe('')
  })
  it('plainText', () => {
    expect(plainText('<p>A &amp; B</p><p>C<br>D</p>')).toBe('A & B\nC\nD')
  })
})
