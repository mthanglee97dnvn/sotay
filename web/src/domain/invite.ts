import { KINDS, type Kind, type Wedding } from './types'
import { fieldsFor, TIME_KEYS } from './ceremony'

const B62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
export function newToken(): string {
  const a = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(a, b => B62[b % 62]).join('')
}

const word = (k: Kind) => k === 'Đính hôn' ? 'lễ đính hôn' : k === 'Tiệc báo hỷ' ? 'tiệc báo hỷ' : 'lễ cưới'
// Based on the old app's MSG_DEFAULT (src/app.html).
export const inviteMessage = (kind: Kind, url: string, again = false) => again
  ? `Chào bạn! Mình gửi lại phiếu thông tin ${word(kind)}, mình đã điền sẵn những gì đã có, bạn xem lại và bổ sung giúp mình phần còn thiếu nhé 🥰\n${url}`
  : `Chào bạn! Mình gửi bạn phiếu thông tin ${word(kind)}, bạn điền giúp mình lịch trình và địa chỉ để ekip MThanglee chuẩn bị chu đáo cho ngày vui của hai bạn nhé 🥰\n${url}`

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

/** Stable signature of a set of answers (key order doesn't matter). */
export function answersSig(a: Record<string, string> | undefined): string {
  const s = JSON.stringify(Object.keys(a || {}).sort().map(k => [k, (a || {})[k]]))
  let h1 = 5381, h2 = 52711
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = (h1 * 33 ^ c) >>> 0; h2 = (h2 * 31 + c) >>> 0 }
  return h1.toString(36) + h2.toString(36)
}

/** Profile fields a client may see and fill. Never internal notes, consult, delivery, channel or crew. */
export const CLIENT_KEYS = ['kind', ...TEXT_KEYS, ...TIME_KEYS] as readonly string[]

/** The profile's client-facing data, to prefill the client form (non-empty values only). */
export function prefillOf(w: Wedding): Record<string, string> {
  const out: Record<string, string> = {}
  const put = (k: string, v: unknown) => { const t = typeof v === 'string' ? v.trim() : ''; if (t) out[k] = t }
  put('kind', w.kind)
  for (const k of TEXT_KEYS) put(k, w[k])
  for (const k of TIME_KEYS) put(k, w.times?.[k])
  return out
}

/** Answers the client added or changed compared with what they saw (base). Blank answers never count. */
export function changedAnswers(answers: Record<string, string>, base: Record<string, string> | undefined): Record<string, string> {
  const b = base ?? {}
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(answers || {})) {
    const t = (v || '').trim()
    if (t && t !== (b[k] || '').trim()) out[k] = v
  }
  return out
}
