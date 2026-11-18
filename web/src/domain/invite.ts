import { KINDS, type Kind, type Wedding } from './types'
import { fieldsFor, TIME_KEYS } from './ceremony'

const B62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
export function newToken(): string {
  const a = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(a, b => B62[b % 62]).join('')
}

const word = (k: Kind) => k === 'Đính hôn' ? 'lễ đính hôn' : k === 'Tiệc báo hỷ' ? 'tiệc báo hỷ' : 'lễ cưới'
// Based on the old app's MSG_DEFAULT (src/app.html).
export const inviteMessage = (kind: Kind, url: string) =>
  `Chào bạn! Mình gửi bạn phiếu thông tin ${word(kind)}, bạn điền giúp mình lịch trình và địa chỉ để ekip MThanglee chuẩn bị chu đáo cho ngày vui của hai bạn nhé 🥰\n${url}`

const TEXT_KEYS = ['bride', 'groom', 'phoneBride', 'phoneGroom', 'date', 'addrBride', 'addrGroom', 'addrRest'] as const

/** Patch to apply client answers onto a wedding; empty answers never overwrite. */
export function mergeAnswers(w: Wedding, a: Record<string, string>): Partial<Wedding> {
  const v = (k: string) => (a[k] || '').trim()
  const p: Partial<Wedding> = {}
  for (const k of TEXT_KEYS) if (v(k)) (p as Record<string, string>)[k] = v(k)
  if (KINDS.includes(v('kind') as Kind)) p.kind = v('kind') as Kind
  const times = { ...w.times }
  let tChanged = false
  for (const k of TIME_KEYS) if (v(k)) { times[k] = v(k); tChanged = true }
  if (tChanged) p.times = times
  if (v('note')) p.notes = [w.notes, 'Khách ghi: ' + v('note')].filter(Boolean).join('\n')
  return p
}

/** Labels of required fields still empty. */
export const validateAnswers = (kind: Kind, a: Record<string, string>) =>
  fieldsFor(kind).filter(f => f.k && f.req && !(a[f.k] || '').trim()).map(f => f.l!)
