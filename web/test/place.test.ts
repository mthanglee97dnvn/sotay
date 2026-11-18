import { describe, it, expect } from 'vitest'
import { placeOf, placePhoto } from '../src/domain/place'

const w = (addrBride = '', addrGroom = '', addrRest = '') => ({ addrBride, addrGroom, addrRest })

describe('placeOf', () => {
  it('finds Hội An with or without diacritics', () => {
    expect(placeOf(w('12 Trần Phú, Hội An'))).toBe('hoian')
    expect(placeOf(w('', 'kiet 5 hoi an, quang nam'))).toBe('hoian')
  })
  it('finds Đà Nẵng', () => expect(placeOf(w('', '', 'Nhà hàng Bạch Đằng, Đà Nẵng'))).toBe('danang'))
  it('finds Huế but not Nguyễn Huệ street', () => {
    expect(placeOf(w('Phú Hội, TP Huế'))).toBe('hue')
    expect(placeOf(w('99 Nguyễn Huệ, Quy Nhơn'))).toBeNull()
  })
  it('prefers the restaurant, then the bride, then the groom', () => {
    expect(placeOf(w('Huế', 'Đà Nẵng', 'Hội An'))).toBe('hoian')
    expect(placeOf(w('Huế', 'Đà Nẵng'))).toBe('hue')
  })
  it('returns null for empty or unknown addresses, and the photo falls back to Đà Nẵng', () => {
    expect(placeOf(w())).toBeNull()
    expect(placeOf(w('https://maps.app.goo.gl/abc'))).toBeNull()
    expect(placePhoto(null)).toBe('/places/danang.webp')
    expect(placePhoto('hue', true)).toBe('/places/hue-sq.webp')
  })
})
