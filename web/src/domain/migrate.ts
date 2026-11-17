import { KINDS, type Kind, type Task, type Unmatched, type Wedding, type ChannelKind, type TimeKey } from './types'
import { emptyWedding } from './wedding'
import { norm } from './search'
import { todayVN } from './vn-date'
import { TIME_KEYS } from './ceremony'

// Old export: src/app.html exportData() → { app: 'sotay-nhac-viec', version: 1, data: { 'sotay-items', 'sotay-forms', 'sotay-resp', 'sotay-appresp', 'sotay-deliv', 'sotay-activity', ... } }
type Any = Record<string, any>

const hash = (s: string) => { let h = 5381; for (let i = 0; i < s.length; i++) h = (h * 33 ^ s.charCodeAt(i)) >>> 0; return h.toString(36) }
const idFor = (prefix: string, key: string) => prefix + hash(key) + hash(key.split('').reverse().join(''))

export function splitNames(s: string): [string, string] {
  const parts = String(s || '').replace(/\s+/g, ' ').trim().split(/\s*(?:&|\+|,|\s-\s|\svà\s|\sva\s)\s*/i).filter(Boolean)
  return [parts[0] || '', parts.slice(1).join(' & ')]
}
export function parseOldDate(v: unknown): string {
  const s = String(v ?? '').trim()
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : ''
}
export function parseOldTime(v: unknown): string {
  const s = String(v ?? '').trim()
  const m = s.match(/^(\d{1,2})[:h](\d{2})(?::\d{2})?\s*([AP]M)?$/i)
  if (!m) return s
  let h = +m[1]
  if (m[3]) { const pm = /p/i.test(m[3]); if (pm && h < 12) h += 12; if (!pm && h === 12) h = 0 }
  return `${String(h).padStart(2, '0')}:${m[2]}`
}
const kindOf = (v: unknown, fallback: Kind = 'Cưới'): Kind => {
  const n = norm(String(v ?? ''))
  if (n.includes('dinh hon') || n.includes('an hoi') || n.includes('dam hoi')) return 'Đính hôn'
  if (n.includes('bao hy') || n.includes('tiec')) return 'Tiệc báo hỷ'
  return KINDS.includes(v as Kind) ? v as Kind : fallback
}
const channelOf = (v: unknown): ChannelKind => {
  const n = norm(String(v ?? ''))
  return n.includes('zalo') ? 'zalo' : n.includes('insta') ? 'instagram' : n.includes('ca nhan') ? 'fb' : n.includes('fanpage') ? 'fanpage' : n ? 'other' : 'fanpage'
}
/** Same couple regardless of order/accents: sorted letters of both names. */
const coupleSig = (names: string) => norm(names).replace(/[^a-z]/g, '').split('').sort().join('')

export interface MigrateResult {
  weddings: Wedding[]
  tasks: Task[]
  unmatched: Unmatched[]
  report: { weddings: number; tasks: number; linked: number; unmatched: number; skipped: number }
}

export function migrate(json: Any, existing: { weddings: Wedding[]; taskIds: string[]; unmatchedIds?: string[] }, email: string): MigrateResult {
  if (!json || json.app !== 'sotay-nhac-viec' || typeof json.data !== 'object') throw new Error('File không phải dữ liệu Sổ Tay')
  const d = json.data as Any
  const items: Any[] = Array.isArray(d['sotay-items']) ? d['sotay-items'] : []
  const forms: Any[] = Array.isArray(d['sotay-forms']) ? d['sotay-forms'] : []
  const resp: Any = d['sotay-resp'] || {}
  const appResp: Any[] = Array.isArray(d['sotay-appresp']) ? d['sotay-appresp'] : []
  const deliv: Any = d['sotay-deliv'] || {}
  const activity: Any[] = Array.isArray(d['sotay-activity']) ? d['sotay-activity'] : []
  let skipped = 0

  // ---- weddings, keyed by the old source key (sheetId|ts-or-names) ----
  const bySource = new Map<string, Wedding>()
  const bySig = new Map<string, Wedding>()
  const add = (source: string, o: Any, kind: Kind, date: string) => {
    const [bride, groom] = splitNames(o.names)
    if (!bride && !groom) { skipped++; return }
    const sig = coupleSig(bride + groom) + '|' + date
    const dup = bySig.get(sig)
    if (dup) { bySource.set(source, dup); return }
    const times: Partial<Record<TimeKey, string>> = {}
    for (const k of TIME_KEYS) if (o[k]) times[k] = parseOldTime(o[k])
    const extra = Array.isArray(o.extra) ? o.extra.filter((x: unknown) => Array.isArray(x)).map(([h, v]: string[]) => `${h}: ${v}`) : []
    const w: Wedding = {
      ...emptyWedding(email), id: idFor('m', source), kind, date, bride, groom,
      phoneBride: o.phoneBride || '', phoneGroom: o.phoneGroom || '',
      addrBride: o.addrBride || '', addrGroom: o.addrGroom || '', addrRest: o.addrRest || '', times,
      channel: { kind: channelOf(o.channel), url: '' },
      notes: [o.pkg && 'Gói: ' + o.pkg, ...extra, o.note && 'Khách ghi: ' + o.note].filter(Boolean).join('\n'),
      coupleKey: norm(bride) + '|' + norm(groom), updatedAt: Date.now(),
    }
    bySource.set(source, w); bySig.set(sig, w)
  }
  for (const f of forms) for (const o of (resp[f.id]?.rows || []) as Any[]) {
    const date = parseOldDate(o.date)
    add(`${f.sheetId}|${o.ts || o.names}`, o, kindOf(o.kind, kindOf(f.kind)), date)
  }
  for (const o of appResp) add(`app|${o.ts || o.names}`, o, kindOf(o.kind), parseOldDate(o.date))
  for (const it of items) {
    const src = String(it.src || '')
    if (it.deleted || !src.endsWith('#shoot') || !it.due) continue
    const key = src.slice(0, -6)
    if (bySource.has(key)) continue
    const names = String(it.title || '').replace(/^\S*\s*Chụp[^:]*:\s*/, '')
    add(key, { names }, kindOf(it.title), todayVN(new Date(it.due)))
  }

  // ---- tasks: only what people wrote themselves (generated ones came from forms) ----
  const taskIds = new Set(existing.taskIds)
  const tasks: Task[] = []
  for (const it of items) {
    if (it.deleted || it.src || !(it.type === 'task' || it.type === 'note') || !String(it.title || '').trim()) continue
    const id = idFor('t', 'item:' + it.id)
    if (taskIds.has(id)) continue
    tasks.push({ id, title: String(it.title).trim(), body: String(it.body || ''), due: typeof it.due === 'number' ? it.due : null, done: !!it.done,
      weddingId: null, assigneeEmail: it.assigneeEmail ? String(it.assigneeEmail).toLowerCase() : null, createdByEmail: email, updatedAt: Date.now() })
  }

  // ---- delivery links ----
  const titleOf = new Map<string, string>()
  for (const a of [...activity].reverse()) if (a?.key && a.title) titleOf.set(a.key, String(a.title))
  const prior = existing.weddings.map(x => structuredClone(x))
  const priorById = new Map(prior.map(x => [x.id, x]))
  for (const [k, w] of bySource) { const p = priorById.get(w.id); if (p) bySource.set(k, p) }
  const all = [...new Set([...prior, ...bySource.values()])]
  const linkedPrior = new Set<Wedding>()
  let linked = 0
  const unmatched: Unmatched[] = []
  const handled = new Set(existing.unmatchedIds || [])
  for (const [key, r] of Object.entries(deliv) as [string, Any][]) {
    if (key.startsWith('_') || !r || !(r.link || r.video)) continue
    let w: Wedding | undefined
    if (key.startsWith('f:')) w = bySource.get(key.slice(2))
    if (!w) {
      const t = titleOf.get(key)
      if (t) {
        const sig = coupleSig(splitNames(t).join(''))
        const hits = all.filter(x => coupleSig(x.bride + x.groom) === sig && x.date <= todayVN())
        if (hits.length === 1) w = hits[0]
      }
    }
    if (!w) { if (handled.has(idFor('u', key))) continue; unmatched.push({ id: idFor('u', key), name: titleOf.get(key) || '', day: '', link: r.link || '', video: r.video || '', raw: { key } }); continue }
    const hist = (Array.isArray(r.hist) ? r.hist : []) as Any[]
    const histFor = (video: boolean) => hist.filter(h => h?.old && (h.part === 'video') === video).map(h => ({ link: String(h.old), at: Number(h.at) || 0 }))
    // Never overwrite a link already set (it may be newer, edited in v2).
    let filled = false
    if (r.link && !w.photo.link) { w.photo = { link: r.link, history: histFor(false), ...(r.at ? { deliveredAt: r.at } : {}) }; filled = true }
    if (r.video && !w.video.link) { w.video = { link: r.video, history: histFor(true), ...(r.vat ? { deliveredAt: r.vat } : {}) }; w.hasVideo = true; filled = true }
    if (r.hasVideo === true && !w.hasVideo) { w.hasVideo = true; filled = true }
    if (prior.includes(w) && filled) linkedPrior.add(w)
    linked++
  }

  const weddings = [...new Set(bySource.values())].filter(x => !priorById.has(x.id))
  // Existing profiles that just got links are returned too, so they are written.
  return { weddings: [...weddings, ...linkedPrior], tasks, unmatched, report: { weddings: weddings.length, tasks: tasks.length, linked, unmatched: unmatched.length, skipped } }
}
