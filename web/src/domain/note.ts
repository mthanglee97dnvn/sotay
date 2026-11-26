import type { TimeKey, Wedding } from './types'
import { fieldsFor, makeupDoneBy, normClock } from './ceremony'

/** "08:00" → "8h00", the way the owner writes times in his notes. */
const h = (t: string | undefined) => { const c = normClock(t); return c ? `${+c.slice(0, 2)}h${c.slice(3)}` : '' }

/** A derived time (ekip arrival…) computed with the same rule the form shows for this kind. */
function derived(w: Wedding, k: string): string {
  const f = fieldsFor(w.kind).find(x => x.k === k && x.derived)
  const from = f?.from ? w.times?.[f.from as TimeKey] : undefined
  return f && from ? makeupDoneBy(from, f.minus) : ''
}

/** The wedding as the owner's timeline note ("2026_WEDDING TIMELINE / …"), ready to paste into Framevis, the calendar or Zalo.
 *  Same format the calendar sync reads back. Empty lines and sections are left out. */
export function timelineNote(w: Wedding): string {
  const t = (k: TimeKey) => h(w.times?.[k])
  const withCrew = (time: string, crew: string) => time && (crew ? `${time} (${h(crew)} Ekip có mặt)` : time)
  const line = (label: string, v: string | undefined) => v?.trim() ? `- ${label} : ${v.trim()}` : ''
  const section = (title: string, lines: string[]) => { const l = lines.filter(Boolean); return l.length ? [`* ${title}`, ...l].join('\n') : '' }
  const [y, m, d] = (w.date || '').split('-')
  const isParty = w.kind === 'Tiệc báo hỷ', isEngage = w.kind === 'Đính hôn'

  const groom = isParty ? '' : section('Nhà trai', [
    line('Địa chỉ', w.addrGroom), line('SĐT', w.phoneGroom),
    line('Giờ Nhà trai xuất phát', withCrew(t('tDepart'), derived(w, 'tCrewGroom'))),
    line('Giờ nhà trai có mặt trình lễ', t('tArrive')),
    isEngage ? '' : line('Giờ rước dâu từ nhà gái về nhà trai', t('tRuoc'))])
  const bride = isParty ? '' : section('Nhà gái', [
    line('Địa chỉ', w.addrBride), line('SĐT', w.phoneBride),
    line('Giờ makeup buổi sáng', withCrew(t('tMakeup'), derived(w, 'tCrewBride')))])
  const rest = isEngage ? '' : section('Nhà hàng', [
    line('Tên nhà hàng', w.addrRest),
    line('Giờ đón khách', withCrew(t('tWelcome'), isParty ? derived(w, 'tMakeupDone') : '')),
    line('Giờ đãi tiệc', t('tParty'))])
  const notes = (w.notes || '').split('\n').map(s => s.trim()).filter(Boolean)
  const note = notes.length ? ['Note :', ...notes.map(s => `- ${s.replace(/^-\s*/, '')}`)].join('\n') : ''

  const names = [w.bride, w.groom].map(s => (s || '').trim().toUpperCase()).filter(Boolean).join(' - ')
  return [`${y || new Date().getFullYear()}_WEDDING TIMELINE / ${names}`, d ? `NGÀY ${d}/${m}` : '', groom, bride, rest, note].filter(Boolean).join('\n\n')
}
