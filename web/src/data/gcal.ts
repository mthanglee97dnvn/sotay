import { signal, effect } from '@preact/signals'
import { tasks } from './tasks'
import { weddings } from './weddings'
import { me, myEmail, orgDoc } from './org'
import { isMine } from '../domain/tasks'
import { planSync, APP_TAG, type CalEvent } from '../domain/gcal-plan'

// Web OAuth client (same as the old app, src/bridge.js). Only permission asked: create/edit events.
const CLIENT_ID = '1042960343879-803otqls5306677ofg7upickl3b0hsqa.apps.googleusercontent.com'
const SCOPE = 'https://www.googleapis.com/auth/calendar.events'
const CAL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
const ON_KEY = 'sotay2-gcal', TOKEN_KEY = 'sotay2-gtoken'

export const gcalOn = signal(localStorage.getItem(ON_KEY) === '1')
export const gcalStatus = signal('')

type G = { accounts: { oauth2: { initTokenClient(o: object): { requestAccessToken(o?: object): void } } } }
const g = () => (window as unknown as { google?: G }).google
let client: ReturnType<G['accounts']['oauth2']['initTokenClient']> | null = null
let waiter: { res: (t: string) => void; rej: (e: Error) => void } | null = null

function loadGis() {
  if (g() || document.getElementById('gis')) return
  const s = document.createElement('script')
  s.id = 'gis'; s.src = 'https://accounts.google.com/gsi/client'; s.async = true
  document.head.appendChild(s)
}
const readToken = () => {
  try { const t = JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null'); return t && t.exp > Date.now() && t.email === myEmail() ? t.t as string : '' } catch { return '' }
}

/** Opens the small Google window. Must be called synchronously inside a tap (Safari). */
function requestToken(): Promise<string> {
  const G = g()
  if (!G) return Promise.reject(new Error('gis_not_ready'))
  if (!client) client = G.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID, scope: SCOPE,
    callback: (r: { access_token?: string; expires_in?: number; error?: string }) => {
      const w = waiter; waiter = null
      if (r.access_token) {
        localStorage.setItem(TOKEN_KEY, JSON.stringify({ t: r.access_token, email: myEmail(), exp: Date.now() + Math.max(60, (r.expires_in || 3600) - 300) * 1000 }))
        w?.res(r.access_token); kick(0)
      } else w?.rej(new Error(r.error || 'no_token'))
    },
    error_callback: (e: { type?: string }) => { const w = waiter; waiter = null; w?.rej(new Error(e.type || 'closed')) },
  })
  if (waiter) return Promise.reject(new Error('busy'))
  const p = new Promise<string>((res, rej) => (waiter = { res, rej }))
  client.requestAccessToken({ prompt: '', login_hint: myEmail() })
  return p
}

export function enableGcal(on: boolean) {
  gcalOn.value = on
  localStorage.setItem(ON_KEY, on ? '1' : '0')
  if (on) { if (!readToken()) requestToken().catch(() => (gcalStatus.value = 'Chưa cấp quyền Google Lịch. Bấm bật lại để thử.')); else kick(0) }
}

async function api(token: string, url: string, method = 'GET', body?: unknown) {
  const r = await fetch(url, { method, headers: { Authorization: 'Bearer ' + token, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined })
  if (r.status === 401) { localStorage.removeItem(TOKEN_KEY); throw Object.assign(new Error('auth'), { auth: true }) }
  if (!r.ok && !(method === 'DELETE' && (r.status === 404 || r.status === 410))) throw new Error(`${r.status} ${(await r.text()).slice(0, 160)}`)
  return method === 'DELETE' ? null : r.json()
}

let running = false, again = false, pending = false, timer: ReturnType<typeof setTimeout> | undefined
async function sync() {
  if (!gcalOn.value || !myEmail()) return
  if (running) { again = true; return }
  const token = readToken()
  if (!token) { pending = true; gcalStatus.value = 'Chạm vào app để tiếp tục cập nhật Google Lịch.'; return }
  running = true; pending = false
  try {
    const o = orgDoc.value
    const admin = o && o !== 'loading' ? o.admin : ''
    const mine = tasks.value.filter(t => isMine(t, myEmail(), admin))
    const q = new URLSearchParams({ privateExtendedProperty: 'sotayApp=' + APP_TAG, timeMin: new Date(Date.now() - 2 * 864e5).toISOString(), singleEvents: 'true', maxResults: '2500' })
    const have = ((await api(token, `${CAL}?${q}`)).items || []) as CalEvent[]
    const plan = planSync(mine, have, id => weddings.value.find(w => w.id === id), new Date(), location.origin + import.meta.env.BASE_URL)
    for (const b of plan.create) await api(token, CAL, 'POST', b)
    for (const u of plan.update) await api(token, `${CAL}/${encodeURIComponent(u.eventId)}`, 'PATCH', u.body)
    for (const id of plan.delete) await api(token, `${CAL}/${encodeURIComponent(id)}`, 'DELETE')
    const hh = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    const n = mine.filter(t => !t.done && t.due != null && t.due >= Date.now() - 3600e3).length
    gcalStatus.value = `Đã cập nhật lúc ${hh}: ${n} việc của bạn có nhắc trên Google Lịch.`
  } catch (e) {
    if ((e as { auth?: boolean }).auth) { pending = true; gcalStatus.value = 'Phiên Google hết hạn. Chạm vào app để tiếp tục.' }
    else gcalStatus.value = 'Chưa cập nhật được Google Lịch (' + (e as Error).message + '). Sẽ thử lại.'
  } finally {
    running = false
    if (again) { again = false; kick(500) }
  }
}
const kick = (ms = 3000) => { clearTimeout(timer); timer = setTimeout(sync, ms) }

effect(() => { void tasks.value; void weddings.value; if (gcalOn.value && me.value && me.value !== 'loading') { loadGis(); kick() } })

// A tap anywhere after the token expired: open the Google window in that same tap, at most every 2 minutes.
let lastAsk = 0
document.addEventListener('click', () => {
  if (!gcalOn.value || !pending || readToken() || waiter || Date.now() - lastAsk < 120e3) return
  lastAsk = Date.now(); requestToken().catch(() => {})
}, true)
