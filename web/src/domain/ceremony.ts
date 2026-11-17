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
}
interface Rule extends FieldDef { hideFor?: Kind[]; reqFor?: Kind[] }

// Labels and hints copied from the old app (src/app.html AF_FIELDS).
const ALL: Rule[] = [
  { sec: 'Cô dâu & chú rể' },
  { k: 'kind', l: 'Loại lễ', type: 'select', opts: ['Cưới', 'Đính hôn', 'Tiệc báo hỷ'] },
  { k: 'bride', l: 'Tên cô dâu', req: true, ph: 'vd: Nguyễn Thị A' },
  { k: 'groom', l: 'Tên chú rể', req: true, ph: 'vd: Trần Văn B' },
  { k: 'phoneBride', l: 'Số điện thoại cô dâu', type: 'tel' },
  { k: 'phoneGroom', l: 'Số điện thoại chú rể', req: true, type: 'tel' },
  { k: 'date', l: 'Ngày tổ chức', req: true, type: 'date' },
  { sec: 'Nhà gái', hideFor: ['Tiệc báo hỷ'] },
  { k: 'addrBride', l: 'Địa chỉ nhà gái', full: true, hint: 'Nếu khó tìm, dán link Google Maps', hideFor: ['Tiệc báo hỷ'] },
  { k: 'tMakeup', l: 'Giờ makeup (trang điểm)', type: 'time', hideFor: ['Tiệc báo hỷ'] },
  { sec: 'Nhà trai', hideFor: ['Tiệc báo hỷ'] },
  { k: 'addrGroom', l: 'Địa chỉ nhà trai', req: true, full: true, hint: 'Nếu khó tìm, dán link Google Maps', hideFor: ['Tiệc báo hỷ'] },
  { k: 'tDepart', l: 'Giờ nhà trai xuất phát đến nhà gái', type: 'time', hideFor: ['Tiệc báo hỷ'] },
  { k: 'tArrive', l: 'Giờ nhà trai có mặt tại nhà gái & trình lễ', type: 'time', hideFor: ['Tiệc báo hỷ'] },
  { k: 'tRuoc', l: 'Giờ rước dâu từ nhà gái về nhà trai', type: 'time', hideFor: ['Đính hôn', 'Tiệc báo hỷ'] },
  { sec: 'Nhà hàng', hideFor: ['Đính hôn'] },
  { k: 'addrRest', l: 'Địa chỉ nhà hàng', full: true, hint: 'Tên nhà hàng / sảnh, hoặc link Google Maps', hideFor: ['Đính hôn'], reqFor: ['Tiệc báo hỷ'] },
  { k: 'tWelcome', l: 'Giờ đón khách tại nhà hàng', type: 'time', hideFor: ['Đính hôn'] },
  { k: 'tParty', l: 'Giờ đãi tiệc tại nhà hàng', type: 'time', hideFor: ['Đính hôn'] },
]

/** Form fields (with section headers) for a ceremony kind. */
export function fieldsFor(kind: Kind): FieldDef[] {
  return ALL.filter(f => !f.hideFor?.includes(kind)).map(({ hideFor, reqFor, ...f }) =>
    reqFor?.includes(kind) ? { ...f, req: true } : f)
}

export const TIME_KEYS = ['tMakeup', 'tDepart', 'tArrive', 'tRuoc', 'tWelcome', 'tParty'] as const
export const ANSWER_KEYS = ALL.filter(f => f.k).map(f => f.k!)

export const kindClass = (k: Kind) => k === 'Đính hôn' ? 'k-dh' : k === 'Tiệc báo hỷ' ? 'k-bh' : 'k-c'
