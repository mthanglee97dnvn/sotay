import type { Kind } from './types'

export interface FieldDef {
  k?: string
  sec?: string
  l?: string
  type?: 'text' | 'tel' | 'date' | 'time' | 'select'
  req?: boolean
  hint?: string
  ph?: string
  opts?: string[]
  full?: boolean
  /** Shown but computed by the app; never sent as an answer. */
  derived?: boolean
  /** For a derived time: the time it is counted back from. */
  from?: 'tArrive' | 'tWelcome' | 'tDepart'
  /** Explanation shown to the client under the field. */
  note?: string
  /** Minutes before `from` (default 90). */
  minus?: number
}
interface Rule extends FieldDef { hideFor?: Kind[]; reqFor?: Kind[]; per?: Partial<Record<Kind, Partial<FieldDef>>> }

// Labels and hints copied from the old app (src/app.html AF_FIELDS).
const MAKEUP_NOTE = 'Ekip chụp ảnh, quay phim sẽ bắt đầu làm việc từ giờ này. Bạn báo giúp mình với chuyên viên trang điểm (makeup artist) để tính giờ bắt đầu, sao cho cô dâu hoàn thiện makeup đúng giờ. Như vậy ekip ghi lại đủ những khoảnh khắc chuẩn bị, tránh thiếu hình ảnh và rối rắm trong khâu chuẩn bị nghi thức trước lễ nhé!'

const ALL: Rule[] = [
  // Pairs share a row on wide screens: kind|date, bride|groom, phones.
  { k: 'kind', l: 'Loại lễ', type: 'select', opts: ['Cưới', 'Đính hôn', 'Tiệc báo hỷ'] },
  { k: 'date', l: 'Ngày tổ chức', req: true, type: 'date' },
  { sec: 'Cô dâu & chú rể' },
  { k: 'bride', l: 'Tên cô dâu', req: true, ph: 'vd: Nguyễn Thị A' },
  { k: 'groom', l: 'Tên chú rể', req: true, ph: 'vd: Trần Văn B' },
  { k: 'phoneBride', l: 'Số điện thoại cô dâu', type: 'tel' },
  { k: 'phoneGroom', l: 'Số điện thoại chú rể', req: true, type: 'tel' },
  { sec: 'Nhà gái', hideFor: ['Tiệc báo hỷ'] },
  { k: 'addrBride', l: 'Địa chỉ nhà gái', full: true, hint: 'Nếu khó tìm, dán link Google Maps', hideFor: ['Tiệc báo hỷ'] },
  { k: 'tMakeup', l: 'Giờ makeup (trang điểm)', type: 'time', hideFor: ['Tiệc báo hỷ'] },
  { k: 'tMakeupDone', l: 'Giờ cô dâu cần makeup xong', type: 'time', derived: true, from: 'tArrive', note: MAKEUP_NOTE, hideFor: ['Tiệc báo hỷ'],
    hint: 'Tự tính: trước giờ nhà trai trình lễ 1 tiếng 30 phút, để ekip có mặt và bắt đầu chụp',
    per: { 'Đính hôn': { minus: 60, hint: 'Tự tính: trước giờ nhà trai trình lễ 1 tiếng, để ekip có mặt và bắt đầu chụp' } } },
  { k: 'tCrewBride', l: 'Giờ ekip có mặt ở nhà gái', type: 'time', derived: true, from: 'tArrive', minus: 105, hideFor: ['Tiệc báo hỷ'],
    hint: 'Tự tính: trước giờ cô dâu makeup xong 15 phút', per: { 'Đính hôn': { minus: 75 } } },
  { sec: 'Nhà trai', hideFor: ['Tiệc báo hỷ'] },
  { k: 'addrGroom', l: 'Địa chỉ nhà trai', req: true, full: true, hint: 'Nếu khó tìm, dán link Google Maps', hideFor: ['Tiệc báo hỷ'] },
  { k: 'tDepart', l: 'Giờ nhà trai xuất phát đến nhà gái', type: 'time', hideFor: ['Tiệc báo hỷ'] },
  { k: 'tCrewGroom', l: 'Giờ ekip có mặt ở nhà trai', type: 'time', derived: true, from: 'tDepart', hideFor: ['Tiệc báo hỷ'],
    hint: 'Tự tính: trước giờ nhà trai xuất phát 1 tiếng 30 phút',
    per: { 'Đính hôn': { minus: 60, hint: 'Tự tính: trước giờ nhà trai xuất phát 1 tiếng' } } },
  { k: 'tArrive', l: 'Giờ nhà trai có mặt tại nhà gái & trình lễ', type: 'time', hideFor: ['Tiệc báo hỷ'] },
  { k: 'tRuoc', l: 'Giờ rước dâu từ nhà gái về nhà trai', type: 'time', hideFor: ['Đính hôn', 'Tiệc báo hỷ'] },
  { sec: 'Nhà hàng', hideFor: ['Đính hôn'] },
  { k: 'addrRest', l: 'Địa chỉ nhà hàng', full: true, hint: 'Tên nhà hàng / sảnh, hoặc link Google Maps', hideFor: ['Đính hôn'], reqFor: ['Tiệc báo hỷ'] },
  { k: 'tWelcome', l: 'Giờ đón khách tại nhà hàng', type: 'time', hideFor: ['Đính hôn'] },
  { k: 'tParty', l: 'Giờ đãi tiệc tại nhà hàng', type: 'time', hideFor: ['Đính hôn'] },
  { k: 'tMakeupDone', l: 'Giờ cô dâu cần makeup xong', type: 'time', derived: true, from: 'tWelcome', note: MAKEUP_NOTE, hideFor: ['Cưới', 'Đính hôn'],
    hint: 'Tự tính: trước giờ đón khách 1 tiếng 30 phút, để ekip có mặt và bắt đầu chụp' },
]

/** Form fields (with section headers) for a ceremony kind. */
export function fieldsFor(kind: Kind): FieldDef[] {
  return ALL.filter(f => !f.hideFor?.includes(kind)).map(({ hideFor, reqFor, per, ...f }) =>
    ({ ...f, ...(reqFor?.includes(kind) ? { req: true } : {}), ...(per?.[kind] || {}) }))
}

export const TIME_KEYS = ['tMakeup', 'tDepart', 'tArrive', 'tRuoc', 'tWelcome', 'tParty'] as const
export const ANSWER_KEYS = ALL.filter(f => f.k && !f.derived).map(f => f.k!)

/** Bride's makeup must be finished this long before the groom's family arrives (trình lễ). */
export const MAKEUP_LEAD_MIN = 90
/** A typed time as 24h HH:MM: "0800", "800", "7h30", "7:30", "17", "5h chiều". Empty if unreadable. */
export function normClock(raw: string | undefined): string {
  const s = (raw || '').trim().toLowerCase()
  if (!s) return ''
  let h: number, mi = 0
  const d = s.match(/^(\d{1,2})(\d{2})$/)
  const m = s.match(/^(\d{1,2})\s*(?:[h:g]\s*(\d{1,2})?\s*p?)?/)
  if (d) { h = +d[1]; mi = +d[2] } else if (m) { h = +m[1]; mi = m[2] ? +m[2] : 0 } else return ''
  if (/chiều|chieu|tối|toi|pm|ch\b/.test(s) && h < 12) h += 12
  if (h > 23 || mi > 59) return ''
  return `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`
}

export function makeupDoneBy(tArrive: string | undefined, minus = MAKEUP_LEAD_MIN): string {
  const m = normClock(tArrive).match(/^(\d{2}):(\d{2})$/)
  if (!m) return ''
  const t = +m[1] * 60 + +m[2] - minus
  return t < 0 ? '' : `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

export const kindClass = (k: Kind) => k === 'Đính hôn' ? 'k-dh' : k === 'Tiệc báo hỷ' ? 'k-bh' : 'k-c'

/** Input attributes per field type. Times are typed as 24h text (no AM/PM picker). */
export function inputProps(type: FieldDef['type']): Record<string, string> {
  if (type === 'time') return { type: 'text', inputmode: 'numeric', autocomplete: 'off' }
  if (type === 'tel') return { type: 'tel', inputmode: 'tel' }
  if (type === 'date') return { type: 'date' }
  return { type: 'text' }
}
