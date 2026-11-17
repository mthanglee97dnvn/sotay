import type { Wedding } from './types'
import { dmy } from './vn-date'

export const norm = (s: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/\s+/g, ' ').trim()

export function matches(w: Wedding, q: string): boolean {
  const n = norm(q)
  if (!n) return true
  const digits = n.replace(/\D/g, '')
  const text = norm([w.bride, w.groom, w.kind, dmy(w.date)].join(' '))
  if (text.includes(n)) return true
  if (digits.length >= 4 && [w.phoneBride, w.phoneGroom].some(p => (p || '').replace(/\D/g, '').includes(digits))) return true
  return false
}
