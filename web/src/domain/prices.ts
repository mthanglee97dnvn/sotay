/** Báo giá: the studio website's hidden price pages. Category links are fixed; sheets come from the site's feed. */
export const PRICE_SITE = 'https://mthangleestudio.com'
export const PRICE_FEED = PRICE_SITE + '/bao-gia/index.json'
export type PriceKey = 'dinh-hon' | 'tiec-bao-hy' | 'ngay-cuoi' | 'hon-phoi' | 'destination'
export interface PriceSheet { name: string; url: string; count: number; thumb: string | null }
export interface PriceCat { key: PriceKey; label: string; url: string; sheets: PriceSheet[] }

export const PRICE_CATS: readonly PriceCat[] = ([['dinh-hon', 'Đính hôn'], ['tiec-bao-hy', 'Tiệc báo hỷ'], ['ngay-cuoi', 'Ngày cưới'], ['hon-phoi', 'Hôn phối'], ['destination', 'Destination']] as const)
  .map(([key, label]) => ({ key, label, url: `${PRICE_SITE}/bao-gia/${key}/`, sheets: [] }))

const onSite = (u: unknown): u is string => typeof u === 'string' && u.startsWith(PRICE_SITE + '/bao-gia/')
const okThumb = (u: unknown) => typeof u === 'string' && /^https:\/\/[a-z0-9.-]*mthangleestudio\.com\//.test(u) ? u : null

/** The five categories in order, with sheets from the feed when it is well-formed (anything else is ignored). */
export function mergeFeed(feed: unknown): PriceCat[] {
  const cats = feed && typeof feed === 'object' && Array.isArray((feed as { cats?: unknown }).cats) ? (feed as { cats: Record<string, unknown>[] }).cats : []
  return PRICE_CATS.map(c => {
    const f = cats.find(x => x && x.key === c.key)
    const sheets = Array.isArray(f?.sheets) ? (f.sheets as Record<string, unknown>[]).filter(s => s && typeof s.name === 'string' && s.name && onSite(s.url))
      .map(s => ({ name: s.name as string, url: s.url as string, count: typeof s.count === 'number' ? s.count : 0, thumb: okThumb(s.thumb) })) : []
    return { ...c, sheets }
  })
}
