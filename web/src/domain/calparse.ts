import type { Kind, ChannelKind, TimeKey } from './types'
import { norm } from './search'
import { todayVN } from './vn-date'

/** The parts of a Google Calendar event the sync reads. */
export interface CalEvt {
  id: string
  summary?: string
  description?: string
  status?: string
  /** Last edit time (RFC3339), used to pick the newest of duplicate entries. */
  updated?: string
  start?: { dateTime?: string; date?: string }
  extendedProperties?: { private?: Record<string, string> }
}

export interface Booking {
  kind: Kind
  date: string
  bride: string
  groom: string
  phoneBride: string
  phoneGroom: string
  addrBride: string
  addrGroom: string
  addrRest: string
  times: Partial<Record<TimeKey, string>>
  hasVideo: boolean
  channelKind: ChannelKind
  clientName: string
  clientPhone: string
  bookingId: string
  calNote: string
  title: string
}

const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ' }
const BR = new RegExp('<br\\s*/?>', 'gi'), PEND = new RegExp('</p>\\s*', 'gi'), TAG = new RegExp('<[^>]+>', 'g')
export function plainText(s: string): string {
  const t = (s || '').replace(BR, '\n').replace(PEND, '\n').replace(TAG, '')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, k: string) => ENT[k])
    .replace(/\u2028|\u2029/g, '\n').replace(/\r/g, '')
  return t.split('\n').map(l => l.replace(/\s+$/, '')).join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

/** First clock time in free text: "7H30" → 07:30, "3h30p" → 03:30, "2h-4h" → 02:00. */
export function parseClock(s: string): string {
  const m = (s || '').match(/(\d{1,2})\s*(?:[hH:g]\s*(\d{2})?|\s*giờ)/)
  if (!m) return ''
  const h = +m[1], mi = m[2] ? +m[2] : 0
  if (h > 23 || mi > 59) return ''
  return `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`
}

const phoneOf = (s: string) => { const t = (s || '').trim(); return /^[\d\s.+()-]{8,}$/.test(t) ? t.replace(/\s+/g, ' ') : '' }
const titleCase = (s: string) => s.trim().toLocaleLowerCase('vi').replace(/(^|\s)(\S)/g, (_, a, b) => a + b.toLocaleUpperCase('vi'))
const smartCase = (s: string) => (s === s.toLocaleUpperCase('vi') ? titleCase(s) : s.trim())

function kindOf(pkg: string): Kind {
  const n = norm(pkg)
  if (n.includes('bao hy')) return 'Tiệc báo hỷ'
  if (/dinh hon|an hoi|dam hoi/.test(n)) return 'Đính hôn'
  return 'Cưới'
}
function channelOf(c: string): ChannelKind {
  const n = norm(c)
  if (n === 'fb' || n.includes('facebook')) return 'fb'
  if (n.includes('page')) return 'fanpage'
  if (n === 'ig' || n.includes('insta')) return 'instagram'
  if (n.includes('zalo')) return 'zalo'
  return 'other'
}

/** "Gói - Tên / Kênh (2 Chụp + 2 Quay)": the last "- name / channel (...)" segment counts. */
const TITLE = /^(.*)\s-\s([^/]+?)\s*\/\s*([^()/-]+?)\s*\(([^)]*)\)\s*$/

const FIELD: [RegExp, keyof Fields][] = [
  [/^sdt co dau/, 'phoneBride'], [/^sdt chu re/, 'phoneGroom'],
  [/^(dia chi)/, 'addr'], [/^(sdt|so dien thoai)/, 'phone'], [/^(ten nha hang|to chuc|nha hang)/, 'rest'],
  [/xuat phat/, 'tDepart'], [/trinh le/, 'tArrive'], [/ruoc dau/, 'tRuoc'], [/makeup/, 'tMakeup'],
  [/don khach/, 'tWelcome'], [/dai tiec/, 'tParty'],
]
interface Fields { addr?: string; phone?: string; rest?: string; tDepart?: string; tArrive?: string; tRuoc?: string; tMakeup?: string; tWelcome?: string; tParty?: string; phoneBride?: string; phoneGroom?: string }

export function parseBooking(e: CalEvt): Booking | null {
  if (e.extendedProperties?.private?.sotayApp) return null
  const title = (e.summary || '').trim()
  const m = title.match(TITLE)
  if (!m) return null
  const [, pkgRaw, nameRaw, chan, crew] = m
  const pkg = pkgRaw.split(/\s\/\s/).pop() || pkgRaw // drop an earlier "… / Page -" part of combined titles
  const start = e.start?.dateTime ? todayVN(new Date(e.start.dateTime)) : (e.start?.date || '')
  if (!start) return null

  const text = plainText(e.description || '')
  const lines = text.split('\n')
  const b: Booking = {
    kind: kindOf(pkg), date: start, bride: '', groom: '', phoneBride: '', phoneGroom: '',
    addrBride: '', addrGroom: '', addrRest: '', times: {}, hasVideo: /quay/i.test(crew),
    channelKind: channelOf(chan), clientName: nameRaw.trim(), clientPhone: '', bookingId: '', calNote: text, title,
  }

  // FrameVis header lines
  let khach = ''
  for (const l of lines) {
    const k = l.match(/^Khách:\s*(.+?)(?:\s*·\s*([\d\s]+))?\s*$/)
    if (k) { khach = k[1].trim(); b.clientPhone = phoneOf(k[2] || '') }
    const id = l.match(/^ID:\s*(\S+)/)
    if (id) b.bookingId = id[1]
  }

  // Couple names from "… TIMELINE / A - B" or "A & B"
  const tl = lines.find(l => /timeline\s*\//i.test(l))
  if (tl) {
    const parts = tl.replace(/^.*timeline\s*\/\s*/i, '').split(/\s+[-&]\s+/).map(s => s.trim()).filter(s => s && !/bao gia/.test(norm(s)))
    if (parts[0]) b.bride = smartCase(parts[0])
    if (parts[1]) b.groom = smartCase(parts[1])
  }
  if (!b.bride && khach) { const [x, y] = khach.split(/\s+&\s+/); b.bride = x.trim(); b.groom = (y || '').trim() }
  if (!b.bride) b.bride = b.clientName

  // Sections and "- Label : value" lines
  let sec: 'groom' | 'bride' | 'rest' | null = null
  for (const raw of lines) {
    const n = norm(raw)
    if (/^\*?\s*nha trai\b/.test(n.replace(/^[*\s]+/, '')) && !raw.includes(':')) { sec = 'groom'; continue }
    if (/^\*?\s*nha gai\b/.test(n.replace(/^[*\s]+/, '')) && !raw.includes(':')) { sec = 'bride'; continue }
    if (/^\*?\s*nha hang\b/.test(n.replace(/^[*\s]+/, '')) && !raw.includes(':')) { sec = 'rest'; continue }
    const kv = raw.match(/^\s*-?\s*([^:]+?)\s*:\s*(.*)$/)
    if (!kv || /^(khach|chi nhanh|dia diem|nhan su|trang thai|id|note)$/.test(norm(kv[1]))) continue
    const label = norm(kv[1]), val = kv[2].trim()
    const hit = FIELD.find(([re]) => re.test(label))
    if (!hit || !val) continue
    const f = hit[1]
    if (f.startsWith('t')) { const t = parseClock(val); if (t && !b.times[f as TimeKey]) b.times[f as TimeKey] = t; continue }
    if (f === 'phoneBride') { b.phoneBride ||= phoneOf(val); continue }
    if (f === 'phoneGroom') { b.phoneGroom ||= phoneOf(val); continue }
    if (f === 'rest') { b.addrRest ||= val; continue }
    if (f === 'addr') { if (sec === 'groom') b.addrGroom ||= val; else if (sec === 'bride') b.addrBride ||= val; else if (sec === 'rest') b.addrRest ||= val; continue }
    if (f === 'phone') { const ph = phoneOf(val); if (sec === 'groom') b.phoneGroom ||= ph; else if (sec === 'bride') b.phoneBride ||= ph }
  }
  return b
}
