import { describe, expect, it } from 'vitest'
import { mergeFeed, PRICE_CATS, PRICE_FEED } from '../src/domain/prices'

const feed = { cats: [
  { key: 'dinh-hon', label: 'Đính hôn', url: 'https://mthangleestudio.com/bao-gia/dinh-hon/', sheets: [
    { name: 'Gói A', url: 'https://mthangleestudio.com/bao-gia/dinh-hon/goi-a/', count: 2, thumb: 'https://anh.mthangleestudio.com/img/a-640.webp' },
    { name: 'Hỏng', count: 1, thumb: null }] },
  { key: 'foo', label: 'Foo', url: 'x', sheets: [] }] }

describe('Báo giá feed', () => {
  it('always gives the five categories with their fixed links', () => {
    const c = mergeFeed(null)
    expect(c.map(x => x.key)).toEqual(['dinh-hon', 'tiec-bao-hy', 'ngay-cuoi', 'hon-phoi', 'destination'])
    expect(c[2]).toEqual({ key: 'ngay-cuoi', label: 'Ngày cưới', url: 'https://mthangleestudio.com/bao-gia/ngay-cuoi/', sheets: [] })
    expect(PRICE_CATS).toHaveLength(5)
    expect(PRICE_FEED).toBe('https://mthangleestudio.com/bao-gia/index.json')
  })
  it('takes sheets from a feed and drops unknown categories and broken sheets', () => {
    const c = mergeFeed(feed)
    expect(c).toHaveLength(5)
    expect(c[0].sheets).toEqual([feed.cats[0].sheets[0]])
    expect(mergeFeed({ cats: 'x' })[0].sheets).toEqual([])
  })
  it('only keeps sheet links on the studio site', () => {
    const bad = { cats: [{ key: 'dinh-hon', sheets: [{ name: 'X', url: 'https://evil.example/', count: 1, thumb: null }] }] }
    expect(mergeFeed(bad)[0].sheets).toEqual([])
  })
})
