import { fieldsFor } from './ceremony'
import { coupleName, KINDS, type Kind } from './types'
import { dmy } from './vn-date'

export const APP_URL = 'https://sotay.mthangleestudio.com/'

/** Plain-text email about a client's form, or null when it has no answers. */
export function buildEmail(inv: { kind?: string; answers?: Record<string, string>; appliedAt?: unknown }): { subject: string; body: string } | null {
  const a = inv.answers || {}
  if (!Object.values(a).some(v => (v || '').trim())) return null
  const kind = (KINDS.includes(a.kind as Kind) ? a.kind : KINDS.includes(inv.kind as Kind) ? inv.kind : 'Cưới') as Kind
  const update = !!inv.appliedAt
  const subject = `${update ? 'Khách bổ sung phiếu' : 'Phiếu mới'}: ${coupleName({ bride: a.bride || '', groom: a.groom || '' })} – ${kind} ${a.date ? dmy(a.date) : ''}`.trim()
  const fields = fieldsFor(kind).filter(f => f.k && !f.derived && f.k !== 'kind')
  const lines = fields.filter(f => (a[f.k!] || '').trim()).map(f => `${f.l}: ${f.k === 'date' ? dmy(a[f.k!]) : a[f.k!].trim()}`)
  if ((a.note || '').trim()) lines.push(`Ghi chú thêm: ${a.note.trim()}`)
  const missing = fields.filter(f => !(a[f.k!] || '').trim()).map(f => f.l)
  const body = [
    update ? 'Khách vừa bổ sung phiếu thông tin.' : 'Khách vừa gửi phiếu thông tin.',
    '', `Loại lễ: ${kind}`, ...lines,
    ...(missing.length ? ['', `Chưa có: ${missing.join(', ')}`] : []),
    '', `Mở Sổ Tay để đưa vào hồ sơ: ${APP_URL}`,
  ].join('\n')
  return { subject, body }
}
