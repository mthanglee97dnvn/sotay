import type { Freelancer } from './types'
import { dateLong } from './vn-date'

/** Anh Thắng's own wording; the day and the job are slotted in once chosen. */
export function askMessage(o: { date?: string; job?: 'chup' | 'quay' }): string {
  const day = o.date ? dateLong(o.date).replace(/,/, '').replace(/\/\d{4}$/, '') : 'này'
  const job = o.job === 'chup' ? ' chụp' : o.job === 'quay' ? ' quay' : ''
  return `Hí Lô Ae, ngày ${day} bên Thén đang cần tìm thợ${job}, Ae còn rảnh lịch không báo giúp Thén để nhận lịch nhé`
}

const NOT_PEOPLE = new Set(['groups', 'pages', 'events', 'watch', 'share', 'photo', 'photo.php', 'story.php', 'reel', 'marketplace', 'messages', 'permalink.php', 'login', 'home.php', 'people', 'pg', 'profile'])

/** m.me chat link for a Facebook profile link (or bare username); null when it isn't a person. */
export function messengerUrl(fb: string): string | null {
  const raw = fb.trim()
  if (!raw) return null
  if (/^[\w.]+$/.test(raw) && !raw.includes('/')) return 'https://m.me/' + raw
  let u: URL
  try { u = new URL(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw) } catch { return null }
  if (!/(^|\.)(facebook\.com|fb\.com|m\.me)$/i.test(u.hostname)) return null
  const id = u.searchParams.get('id')
  const parts = u.pathname.split('/').filter(Boolean)
  const first = parts[0] || ''
  if (first === 'people') return /^\d+$/.test(parts[2] || '') ? 'https://m.me/' + parts[2] : null
  if (first === 'profile.php') return id && /^\d+$/.test(id) ? 'https://m.me/' + id : null
  if (!first || NOT_PEOPLE.has(first.toLowerCase()) || !/^[\w.]+$/.test(first)) return null
  return 'https://m.me/' + first
}

/** Where "Hỏi lịch" should go: the Messenger chat, else the saved link itself, else nowhere. */
export function openUrl(fb: string): string | null {
  const m = messengerUrl(fb)
  if (m) return m
  const raw = fb.trim()
  if (/^https?:\/\//i.test(raw)) return raw
  return /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(raw) ? 'https://' + raw : null
}

const fits = (f: Freelancer, job?: 'chup' | 'quay') => !job || f.does === 'ca' || f.does === job

/** Thợ who do the chosen job first, then the rest; each group by name. */
export function forJob(list: Freelancer[], job?: 'chup' | 'quay'): { f: Freelancer; fit: boolean }[] {
  return list.map(f => ({ f, fit: fits(f, job) }))
    .sort((a, b) => Number(b.fit) - Number(a.fit) || a.f.name.localeCompare(b.f.name, 'vi'))
}
