/** Chấm công: editors' sets logged against the editing price list, totalled per person per month (admin only). */

export interface PayEntry {
  id: string
  date: string // YYYY-MM-DD
  personId: string
  /** Name when logged; shown only if the person is no longer in the list. */
  person: string
  item: string
  /** Price when logged, so later price changes leave past months alone. */
  price: number
  weddingId?: string
  weddingName?: string
  note?: string
  createdAt: number
  updatedAt: number
}
export interface PayPerson { id: string; name: string; hidden?: boolean }
export interface PayItem { id: string; name: string; price: number; hidden?: boolean }
export interface PayConfig { people: PayPerson[]; items: PayItem[] }

export const SEED_ITEMS: PayItem[] = ([
  ['Chỉnh sửa ảnh đính hôn phóng sự – 2 máy', 400000],
  ['Chỉnh sửa ảnh đính hôn truyền thống', 250000],
  ['Chỉnh sửa ảnh cưới phóng sự cơ bản – 2 máy', 600000],
  ['Chỉnh sửa ảnh cưới phóng sự cơ bản – 3 máy', 800000],
  ['Chỉnh sửa ảnh tiệc báo hỷ phóng sự', 400000],
  ['Chỉnh sửa ảnh tiệc báo hỷ truyền thống', 250000],
  ['Chỉnh sửa ảnh hôn phối phóng sự', 400000],
  ['Chỉnh sửa ảnh outdoor cơ bản – 2 máy', 600000],
  ['Chỉnh sửa ảnh outdoor cơ bản – 3 máy', 900000],
] as const).map(([name, price], i) => ({ id: `i${i + 1}`, name, price }))

export const money = (n: number) => `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`

/** "600.000", "600000", "600k", "1,2tr" → number of đồng; null if it isn't a sum. */
export function parseMoney(s: string): number | null {
  const t = s.trim().toLowerCase().replace(/\s+/g, '').replace(/đ$/, '')
  const m = t.match(/^(\d+(?:[.,]\d+)?)(k|tr|triệu)$/)
  if (m) return Math.round(parseFloat(m[1].replace(',', '.')) * (m[2] === 'k' ? 1000 : 1000000))
  if (/^\d{1,3}([.,]\d{3})+$/.test(t)) return +t.replace(/[.,]/g, '')
  return /^\d+$/.test(t) ? +t : null
}

export const monthOf = (date: string) => date.slice(0, 7)
export function shiftMonth(m: string, d: number): string {
  const [y, mo] = m.split('-').map(Number), n = y * 12 + (mo - 1) + d
  return `${Math.floor(n / 12)}-${String(n % 12 + 1).padStart(2, '0')}`
}
const ddmm = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`

export interface PayRow { personId: string; name: string; count: number; total: number; entries: PayEntry[] }

/** One row per person for the month, highest total first; names come from the current list (renames apply). */
export function monthTotals(entries: PayEntry[], month: string, cfg: PayConfig): PayRow[] {
  const rows = new Map<string, PayRow>()
  for (const x of entries) {
    if (monthOf(x.date) !== month) continue
    const r = rows.get(x.personId) ?? { personId: x.personId, name: cfg.people.find(p => p.id === x.personId)?.name || x.person, count: 0, total: 0, entries: [] }
    r.count++; r.total += x.price; r.entries.push(x); rows.set(x.personId, r)
  }
  for (const r of rows.values()) r.entries.sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
  return [...rows.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'vi'))
}

/** Plain text to send the editor for checking before payday. */
export function statement(row: PayRow, month: string): string {
  const [y, m] = month.split('-')
  return [`CHẤM CÔNG THÁNG ${m}/${y} – ${row.name}`,
    ...row.entries.map(x => `- ${ddmm(x.date)} ${x.item}${x.weddingName ? ` (${x.weddingName})` : ''}: ${money(x.price)}`),
    `Tổng: ${row.count} bộ – ${money(row.total)}`].join('\n')
}
