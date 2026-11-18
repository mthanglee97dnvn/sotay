import { signal, effect } from '@preact/signals'
import { doc, collection, writeBatch } from 'firebase/firestore'
import { db } from '../db'
import { ORG } from '../firebase'
import { role, orgDoc, myEmail, guardedWrite } from './org'
import { weddings, weddingsFresh } from './weddings'
import { getToken, api, loadGis } from './gcal'
import { planCalendarSync, WINDOW_BACK, WINDOW_AHEAD } from '../domain/calsync-plan'
import type { CalEvt } from '../domain/calparse'

export const DEFAULT_FRAMEVIS_CAL = '8be6adaa55c616c63c7a632f1689bc68254a176505b575d3178e79a03f69de2c@group.calendar.google.com'
export const calStatus = signal('')
const BASE = 'https://www.googleapis.com/calendar/v3/calendars/'

async function listAll(token: string, cal: string): Promise<CalEvt[]> {
  const out: CalEvt[] = []
  let page = ''
  do {
    const q = new URLSearchParams({
      singleEvents: 'true', maxResults: '2500', showDeleted: 'false',
      timeMin: new Date(Date.now() - WINDOW_BACK * 864e5).toISOString(),
      timeMax: new Date(Date.now() + WINDOW_AHEAD * 864e5).toISOString(),
      fields: 'items(id,status,summary,description,start,extendedProperties),nextPageToken',
    })
    if (page) q.set('pageToken', page)
    const r = await api(token, `${BASE}${encodeURIComponent(cal)}/events?${q}`) as { items?: CalEvt[]; nextPageToken?: string }
    out.push(...(r.items || []))
    page = r.nextPageToken || ''
  } while (page)
  return out
}

let busy = false, needTap = false
const hhmm = () => new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })

/** Reads the admin's calendars and updates profiles. Only the admin runs it, after profiles came from the server. */
export async function syncCalendars(interactive = false): Promise<void> {
  if (role.value !== 'admin' || !weddingsFresh.value || busy) return
  let token = ''
  try { token = await getToken(interactive) } catch { /* closed the Google window */ }
  if (!token) { needTap = true; calStatus.value = 'Chạm để đồng bộ lịch Google'; return }
  busy = true; needTap = false
  calStatus.value = 'Đang đồng bộ lịch…'
  try {
    const o = orgDoc.value
    const fv = (o && o !== 'loading' && o.framevisCalId) || DEFAULT_FRAMEVIS_CAL
    const input: { cal: string; events: CalEvt[] }[] = []
    let fvFailed = false
    for (const cal of [fv, 'primary']) {
      try { input.push({ cal, events: await listAll(token, cal) }) }
      catch (e) {
        if ((e as { auth?: boolean }).auth) throw e
        if (cal === fv) fvFailed = true; else throw e
      }
    }
    const plan = planCalendarSync(input, weddings.value, myEmail())
    const col = collection(db, 'orgs', ORG, 'weddings')
    for (let i = 0; i < plan.writes.length; i += 400) {
      const b = writeBatch(db)
      for (const w of plan.writes.slice(i, i + 400)) b.set(doc(col, w.id), w.patch, { merge: true })
      if (!(await guardedWrite(b.commit()))) throw new Error('Chưa lưu được')
    }
    calStatus.value = `Đã đồng bộ lúc ${hhmm()} · ${plan.count} lễ` + (fvFailed ? ' · Không đọc được lịch FrameVis' : '')
  } catch (e) {
    if ((e as { auth?: boolean }).auth) { needTap = true; calStatus.value = 'Chạm để đồng bộ lịch Google' }
    else calStatus.value = 'Chưa đồng bộ được lịch (' + (e as Error).message.slice(0, 80) + ')'
  } finally { busy = false }
}

let started = false
/** Sync on open (once profiles are loaded), every 30 minutes, and on the next tap when Google needs a click. */
export function startCalendarSync() {
  if (started) return
  started = true
  loadGis()
  effect(() => { if (role.value === 'admin' && weddingsFresh.value) syncCalendars() })
  setInterval(() => syncCalendars(), 30 * 60e3)
  document.addEventListener('click', () => { if (needTap && !busy) syncCalendars(true) }, true)
}
