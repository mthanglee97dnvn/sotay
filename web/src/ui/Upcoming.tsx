import { useState, useEffect } from 'preact/hooks'
import { weddingsReady, saveWedding, visibleWeddings } from '../data/weddings'
import { leadDays, canEdit } from '../data/org'
import { upcomingChips } from '../domain/wedding'
import { matches } from '../domain/search'
import { consultDue } from '../domain/consult'
import { daysUntil, dm, dateLong, todayVN, vnTime, weekday } from '../domain/vn-date'
import { coupleName, type Wedding, type Task } from '../domain/types'
import { kindClass, makeupDoneBy, normClock } from '../domain/ceremony'
import { ICalendar, ICheck, IArrow } from './icons'
import { groupTasks } from '../domain/tasks'
import { openWedding, openInvites } from './sheets'
import { go } from './Shell'
import { SwipeRow } from './SwipeRow'
import { toast } from './toast'
import { Logo } from './Logo'

type Filter = 'all' | 'consult'

/** Groups weddings (already in date order) by month: "Tháng 12/2026". */
const rolls = (ws: Wedding[]) => ws.reduce<[string, Wedding[]][]>((a, w) => {
  const m = w.date ? `Tháng ${+w.date.slice(5, 7)}/${w.date.slice(0, 4)}` : 'Chưa có ngày'
  const last = a[a.length - 1]
  if (last && last[0] === m) last[1].push(w); else a.push([m, [w]])
  return a
}, [])

/** "Thứ Bảy" and "21.11" from an ISO date. */
const wdLong = (date: string) => dateLong(date).split(', ')[0]
const dd_mm = (date: string) => `${date.slice(8, 10)}.${date.slice(5, 7)}`
/** Bride and groom with the "&" styled; falls back to coupleName for a missing half. */
export function Names({ w, amp = '' }: { w: Wedding; amp?: string }) {
  const [a, b] = coupleName(w).split(' & ')
  return <>{a}{b && <> <i class={amp}>&amp;</i> {b}</>}</>
}

/** Marks consult done / not done right from the list, with an undo.
 *  A second tap right after is ignored: under the "Cần hẹn tư vấn" filter the row leaves the list
 *  and the next couple's button slides under the finger. */
let lastConsultTap = 0
function setConsult(w: Wedding, v: boolean, btn: HTMLElement) {
  if (Date.now() - lastConsultTap < 600) return
  lastConsultTap = Date.now()
  saveWedding({ id: w.id, consultDone: v })
  // If the row left the list, keep keyboard focus somewhere sensible.
  requestAnimationFrame(() => { if (!btn.isConnected) (document.querySelector('.stat[aria-pressed="true"]') as HTMLElement | null)?.focus() })
  toast(v ? 'Đã đánh dấu đã tư vấn' : 'Đã bỏ đánh dấu', false, { label: 'Hoàn tác', run: () => saveWedding({ id: w.id, consultDone: !v }) })
}

export function WeddingRow({ w, right, consult }: { w: Wedding; right?: preact.ComponentChildren; consult?: boolean }) {
  const n = w.date ? daysUntil(w.date) : null
  const soon = n != null && n >= 0 && n <= 7
  const cls = 'item wrow' + (soon ? ' soon' : '') + (w.cancelled ? ' off' : '')
  const open = () => (openWedding.value = { id: w.id })
  // Consult status only while there is still time to consult (not today, past or cancelled).
  const showConsult = consult && n != null && n >= 1 && !w.cancelled
  const label = w.consultDone ? <><ICheck size={14} />Đã tư vấn</> : 'Chưa tư vấn'
  const cnt = right ?? (n != null && n >= 0 && <span class="pill">{n === 0 ? 'Hôm nay' : n === 1 ? 'Ngày mai' : `Còn ${n} ngày`}</span>)
  // Editors get two separate buttons (open the profile / toggle consult): a button may not sit inside another.
  if (showConsult && canEdit()) return <div class={cls + ' has-consult'}>
    <button class="wopen" onClick={open}><RowBody w={w} /></button>
    <span class="wside">
      <button class={'consult' + (w.consultDone ? ' done' : '')} aria-label={`${w.consultDone ? 'Bỏ đánh dấu' : 'Đánh dấu'} đã tư vấn cho ${coupleName(w)}`} onClick={e => setConsult(w, !w.consultDone, e.currentTarget as HTMLElement)}>{label}</button>
      {cnt}
    </span>
  </div>
  return <button class={cls} onClick={open}>
    <RowBody w={w} />
    {showConsult ? <span class="wside"><span class={'consult' + (w.consultDone ? ' done' : '')}>{label}</span>{cnt}</span> : cnt}
  </button>
}

function RowBody({ w }: { w: Wedding }) {
  return <>
    <span class="tile">
      {w.date ? <><b>{w.date.slice(8, 10)}</b><small>{weekday(w.date)}</small></> : <small>?</small>}
    </span>
    <div class="grow">
      <div class="nm"><Names w={w} /></div>
      <div class="meta"><em class={kindClass(w.kind)}>{w.kind}</em>{w.hasVideo ? ' · Có quay' : ''}</div>
      {w.cancelled && <div class="note">Đã huỷ trên lịch</div>}
    </div>
  </>
}

/** Key times of the day, earliest first; crew arrivals flagged. Same rules as the client form. */
export function dayMarks(w: Wedding): { t: string; l: string; crew: boolean }[] {
  const t = w.times || {}, dh = w.kind === 'Đính hôn', out: { t: string; l: string; crew: boolean }[] = []
  const add = (v: string, l: string, crew = false) => { if (v) out.push({ t: v, l, crew }) }
  if (w.kind === 'Tiệc báo hỷ') {
    add(makeupDoneBy(t.tWelcome, 90), 'Ekip có mặt', true)
    add(normClock(t.tWelcome), 'Đón khách')
    add(normClock(t.tParty), 'Đãi tiệc')
  } else {
    add(makeupDoneBy(t.tDepart, dh ? 60 : 90), 'Ekip đến nhà trai', true)
    add(makeupDoneBy(t.tArrive, dh ? 75 : 105), 'Ekip đến nhà gái', true)
    add(makeupDoneBy(t.tArrive, dh ? 60 : 90), 'Xong trang điểm')
    add(normClock(t.tArrive), 'Trình lễ')
    add(normClock(t.tRuoc), 'Rước dâu')
    add(normClock(t.tWelcome), 'Đón khách')
  }
  return out.sort((a, b) => a.t.localeCompare(b.t))
}

const p2 = (n: number) => String(n).padStart(2, '0')
/** The next ceremony: landmark photo, a live countdown to the crew's call time, the crew time as a gold pill. */
function Hero({ w }: { w: Wedding }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])
  const marks = dayMarks(w), crew = marks.find(m => m.crew)
  const left = Math.max(0, vnTime(w.date, crew?.t || '00:00') - now)
  const s = Math.floor(left / 1000)
  const hms = `${p2(Math.floor(s / 3600) % 24)}:${p2(Math.floor(s / 60) % 60)}:${p2(s % 60)}`
  // Mẫu A: kind and date, the couple, then one ruled line with the countdown and the ekip time.
  return <button class="hero" onClick={() => (openWedding.value = { id: w.id })} aria-label={`Lễ gần nhất: ${coupleName(w)}, ${dateLong(w.date)}. Mở hồ sơ`}>
    <span class="go">Mở hồ sơ <IArrow size={16} /></span>
    <span class="kick">{w.kind}{w.hasVideo ? ' · Có quay' : ''} · {wdLong(w.date)} {dd_mm(w.date)}</span>
    <span class="names"><Names w={w} /></span>
    <span class="bottom">
      <span class="cd" role="timer" aria-live="off">{!left ? 'Đang diễn ra hôm nay' : daysUntil(w.date) >= 1 ? <b>Còn {daysUntil(w.date)} ngày</b> : <><b>Hôm nay</b> · còn <span class="tnum">{hms}</span></>}</span>
      {crew && <span class="crew">{crew.l} <em>{crew.t}</em></span>}
    </span>
  </button>
}

/** The most urgent open task: overdue first, then today's earliest. */
function TodayStrip({ tasks }: { tasks: Task[] }) {
  const g = groupTasks(tasks)
  const list = [...g.late, ...g.today]
  if (!list.length) return null
  const t = list[0], late = g.late.length > 0
  const time = t.due != null ? new Date(t.due).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }) : ''
  return <button class={'todaystrip' + (late ? ' is-late' : '')} onClick={() => go('tasks')}>
    <span class="when"><b>{late ? 'Trễ' : time}</b><small>{late ? 'QUÁ HẠN' : 'HÔM NAY'}</small></span>
    <span class="grow"><span class="t">{t.title}</span>{list.length > 1 && <span class="s">và {list.length - 1} việc khác</span>}</span>
    <IArrow size={18} />
  </button>
}

const formsBanner = (all: number, upd: number) => {
  const fresh = all - upd
  const parts = [fresh && `${fresh} phiếu mới`, upd && `${upd} phiếu khách bổ sung`].filter(Boolean)
  return `Bạn có ${parts.join(' và ')}. Xem và đưa vào hồ sơ`
}

export function Upcoming({ tasks, newForms, updatedForms = 0, calBar }: { tasks: Task[]; newForms: number; updatedForms?: number; calBar?: preact.ComponentChildren }) {
  const [q, setQ] = useState('')
  const [f, setF] = useState<Filter>('all')
  const [showPast, setShowPast] = useState(false)
  const all = visibleWeddings.value
  const ws = all.filter(w => !w.cancelled)
  const chips = upcomingChips(ws, tasks, leadDays.value, newForms)
  // Bookings removed from the calendar only show up when searching.
  const found = (q ? all : ws).filter(w => matches(w, q))
  let future = found.filter(w => !w.date || daysUntil(w.date) >= 0)
  let past = found.filter(w => w.date && daysUntil(w.date) < 0).reverse()
  if (f === 'consult') { future = future.filter(w => consultDue(w, leadDays.value)); past = [] }
  const toggle = (x: Filter) => setF(f === x ? 'all' : x)
  const next = f === 'all' && !q ? ws.find(w => w.date && daysUntil(w.date) >= 0) : undefined
  const [wd, dmy] = dateLong(todayVN()).split(', ')
  return <main class="page">
    {/* Masthead, centred like the client form: logo, gold rule, title, today's date. Sync sits quietly in the corner. */}
    <header class="mast">
      {calBar}
      <Logo />
      <span class="rule" />
      <h1>Lịch cưới</h1>
      <p class="mast-date">{wd}, {+(dmy || '').slice(0, 2)} tháng {+(dmy || '').slice(3, 5)}</p>
    </header>
    {newForms > 0 && <button class="banner" onClick={() => (openInvites.value = true)}>{formsBanner(newForms, updatedForms)}</button>}
    {next && <Hero w={next} />}
    <div class="stats" role="group" aria-label="Lọc">
      <button class="stat" aria-pressed={f === 'consult'} onClick={() => toggle('consult')}><span class="ic"><span><ICalendar size={15} /></span></span><b>{chips.consult}</b><span class="lb">Cần hẹn tư vấn</span></button>
      <button class="stat" onClick={() => go('tasks')}><span class="ic"><span><ICheck size={15} /></span></span><b>{chips.today}</b><span class="lb">Việc hôm nay</span></button>
    </div>
    {f === 'all' && !q && <TodayStrip tasks={tasks} />}
    <input class="search" type="search" placeholder="Tìm tên, số điện thoại, ngày 20/12" value={q} onInput={e => setQ((e.target as HTMLInputElement).value)} aria-label="Tìm" />
    {!weddingsReady.value ? <p class="empty">Đang tải…</p> : <>
      {future.length ? rolls(future).map(([m, ws]) => <><h2 class="roll">{m}<small>{ws.length} đám</small></h2><div class="list wrows">{ws.map(w => <SwipeRow key={w.id} w={w}><WeddingRow w={w} consult /></SwipeRow>)}</div></>)
        : f === 'all' && !q ? <p class="empty"><b>Chưa có lễ nào sắp tới</b>Bấm nút + để thêm lễ hoặc gửi phiếu cho khách điền.</p>
        : <p class="empty">Không có lễ nào khớp. Thử gõ tên khác, hoặc bấm lại bộ lọc để tắt.</p>}
      {past.length > 0 && (showPast || q
        ? <><h2>Đã qua<small>{past.length} đám</small></h2><div class="list wrows">{past.map(w => <SwipeRow key={w.id} w={w}><WeddingRow w={w} right={<span class="txt">{dm(w.date)}</span>} /></SwipeRow>)}</div></>
        : <p><button class="btn ghost" onClick={() => setShowPast(true)}>Xem {past.length} lễ đã qua</button></p>)}
    </>}
  </main>
}
