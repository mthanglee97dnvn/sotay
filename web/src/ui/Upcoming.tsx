import { useState, useEffect } from 'preact/hooks'
import { weddings, weddingsReady } from '../data/weddings'
import { leadDays } from '../data/org'
import { upcomingChips } from '../domain/wedding'
import { matches } from '../domain/search'
import { consultDue } from '../domain/consult'
import { deliveryStatus } from '../domain/delivery'
import { daysUntil, dm, dateLong, todayVN, vnTime } from '../domain/vn-date'
import { coupleName, type Wedding, type Task } from '../domain/types'
import { kindClass, makeupDoneBy, normClock } from '../domain/ceremony'
import { ICalendar, IClock, ICheck, IArrow } from './icons'
import { openWedding, openInvites } from './sheets'
import { go } from './Shell'

type Filter = 'all' | 'consult' | 'late'

/** Groups weddings (already in date order) by month: "Tháng 12/2026". */
const rolls = (ws: Wedding[]) => ws.reduce<[string, Wedding[]][]>((a, w) => {
  const m = w.date ? `Tháng ${+w.date.slice(5, 7)}/${w.date.slice(0, 4)}` : 'Chưa có ngày'
  const last = a[a.length - 1]
  if (last && last[0] === m) last[1].push(w); else a.push([m, [w]])
  return a
}, [])

const GLINT = 'M12 0C12.8 7 17 11.2 24 12C17 12.8 12.8 17 12 24C11.2 17 7 12.8 0 12C7 11.2 11.2 7 12 0Z'
export const Glint = (p: { style: string }) => <svg class="glint" viewBox="0 0 24 24" style={p.style} aria-hidden="true"><path d={GLINT} fill="#ffe7a3" /></svg>
/** "Thứ Bảy" and "21.11" from an ISO date. */
const wdLong = (date: string) => dateLong(date).split(', ')[0]
const dd_mm = (date: string) => `${date.slice(8, 10)}.${date.slice(5, 7)}`
const isLate = (w: Wedding) => deliveryStatus(w, 'photo') === 'late' || deliveryStatus(w, 'video') === 'late'
/** Bride and groom with the "&" styled; falls back to coupleName for a missing half. */
export function Names({ w, amp = '' }: { w: Wedding; amp?: string }) {
  const [a, b] = coupleName(w).split(' & ')
  return <>{a}{b && <> <i class={amp}>&amp;</i> {b}</>}</>
}

export function WeddingRow({ w, right }: { w: Wedding; right?: preact.ComponentChildren }) {
  const n = w.date ? daysUntil(w.date) : null
  const late = n != null && n < 0 && isLate(w)
  const tone = late ? ' is-late' : n != null && n >= 0 && n <= 7 ? ' soon' : ''
  const seed = [...w.id || 'x'].reduce((a, c) => a + c.charCodeAt(0), 0)
  return <button class={'item cover' + tone + (n === 0 ? ' is-today' : '') + (w.cancelled ? ' off' : '')} onClick={() => (openWedding.value = { id: w.id })}>
    <i class="bk" aria-hidden="true" style={`left:${6 + seed % 55}%;top:10px;width:46px;height:46px;background:radial-gradient(circle,rgba(210,228,255,.5),transparent 70%)`} />
    <i class="bk" aria-hidden="true" style={`left:${40 + seed % 30}%;top:54px;width:26px;height:26px;animation-delay:-1.6s;background:radial-gradient(circle,${tone === ' soon' ? 'rgba(255,225,150,.75)' : late ? 'rgba(255,170,150,.6)' : 'rgba(200,220,255,.6)'},transparent 70%)`} />
    <div class="grow">
      <div class="kick">{w.date ? `${wdLong(w.date)} · ${dd_mm(w.date)}` : 'Chưa có ngày'} · <em class={kindClass(w.kind)}>{w.kind}</em>{w.hasVideo ? ' · Có quay' : ''}</div>
      <div class="nm"><Names w={w} /></div>
      {w.cancelled && <div class="note">Đã huỷ trên lịch</div>}
    </div>
    <div class="left">{right ?? (n != null && n >= 0 && (n <= 1
      ? <span class="txt">{n === 0 ? 'Hôm nay' : 'Ngày mai'}</span>
      : <><b class={n <= 7 ? 'goldtext' : 'icetext'}>{n}</b><small>NGÀY NỮA</small></>))}</div>
  </button>
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
/** The next ceremony, with a live countdown to the crew's call time (or the start of the day). */
function Hero({ w }: { w: Wedding }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])
  const marks = dayMarks(w), crew = marks.find(m => m.crew)
  const left = Math.max(0, vnTime(w.date, crew?.t || '00:00') - now)
  const s = Math.floor(left / 1000), d = Math.floor(s / 86400)
  const shown = marks.slice(0, 3)
  return <button class="hero" onClick={() => (openWedding.value = { id: w.id })} aria-label={`Lễ gần nhất: ${coupleName(w)}, ${dateLong(w.date)}. Mở hồ sơ`}>
    <div class="scene">
      <i class="bokeh" style="left:14%;top:22%;width:34px;height:34px;background:radial-gradient(circle,rgba(210,228,255,.85),transparent 70%)" />
      <i class="bokeh" style="left:64%;top:16%;width:22px;height:22px;animation-delay:-1s;background:radial-gradient(circle,rgba(255,225,150,.8),transparent 70%)" />
      <i class="bokeh" style="left:82%;top:52%;width:40px;height:40px;animation-delay:-2s;background:radial-gradient(circle,rgba(150,190,255,.7),transparent 70%)" />
      <Glint style="left:22%;top:20%;z-index:1" /><Glint style="left:74%;top:26%;width:12px;height:12px;animation-delay:-1.1s;z-index:1" /><Glint style="left:66%;top:70%;width:13px;height:13px;animation-delay:-2.2s;z-index:1" />
      <span class="kick">{w.kind}{w.hasVideo ? ' · Có quay' : ''}</span>
      <span class="names"><Names w={w} amp="amp-gold" /></span>
      <span class="rule" />
      <span class="when">{dd_mm(w.date)}.{w.date.slice(0, 4)} · {wdLong(w.date).toUpperCase()}</span>
    </div>
    <div class="body">
      <div class="label"><span><i class="pulse" />{left ? (crew ? 'ĐẾM NGƯỢC ĐẾN GIỜ EKIP' : 'ĐẾM NGƯỢC ĐẾN NGÀY LỄ') : 'ĐANG DIỄN RA HÔM NAY'}</span>{crew && left > 0 && <em>{crew.t}</em>}</div>
      <div class="cd" role="timer" aria-live="off">
        <div class="days"><b class="goldtext">{p2(d)}</b><small>NGÀY</small></div>
        <span class="divider" aria-hidden="true" />
        <div class="hms">
          <span>{p2(Math.floor(s / 3600) % 24)}<small>GIỜ</small></span><span class="colon">:<small>&nbsp;</small></span>
          <span>{p2(Math.floor(s / 60) % 60)}<small>PHÚT</small></span><span class="colon">:<small>&nbsp;</small></span>
          <span>{p2(s % 60)}<small>GIÂY</small></span>
        </div>
      </div>
      {shown.length > 0 && <div class="marks" style={`--mk-in:${50 / shown.length}%`}>
        {shown.map(m => <div class={m.crew ? 'crew' : ''}><b>{m.t}</b><i /><span>{m.l}</span></div>)}
      </div>}
      <div class="open"><b class="goldtext">Mở hồ sơ</b><span class="arrow"><IArrow size={16} /></span></div>
    </div>
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
  const all = weddings.value
  const ws = all.filter(w => !w.cancelled)
  const chips = upcomingChips(ws, tasks, leadDays.value, newForms)
  // Bookings removed from the calendar only show up when searching.
  const found = (q ? all : ws).filter(w => matches(w, q))
  let future = found.filter(w => !w.date || daysUntil(w.date) >= 0)
  let past = found.filter(w => w.date && daysUntil(w.date) < 0).reverse()
  if (f === 'consult') { future = future.filter(w => consultDue(w, leadDays.value)); past = [] }
  if (f === 'late') { future = []; past = past.filter(w => deliveryStatus(w, 'photo') === 'late' || deliveryStatus(w, 'video') === 'late') }
  const toggle = (x: Filter) => setF(f === x ? 'all' : x)
  const next = f === 'all' && !q ? ws.find(w => w.date && daysUntil(w.date) >= 0) : undefined
  const [wd, dmy] = dateLong(todayVN()).split(', ')
  return <main class="page">
    <div class="eyebrow">{wd} · {(dmy || '').slice(0, 5).replace('/', '.')}</div>
    <h1>Sắp tới</h1>
    {calBar}
    {newForms > 0 && <button class="banner" onClick={() => (openInvites.value = true)}>{formsBanner(newForms, updatedForms)}</button>}
    {next && <Hero w={next} />}
    <div class="stats" role="group" aria-label="Lọc">
      <button class="stat" aria-pressed={f === 'consult'} onClick={() => toggle('consult')}><span class="ic"><span><ICalendar size={15} /></span></span><b>{chips.consult}</b><span class="lb">Cần hẹn tư vấn</span></button>
      <button class={'stat' + (chips.late ? ' hot' : '')} aria-pressed={f === 'late'} onClick={() => toggle('late')}><span class="ic"><span><IClock size={15} /></span></span><b>{chips.late}</b><span class="lb">Giao trễ</span></button>
      <button class="stat" onClick={() => go('tasks')}><span class="ic"><span><ICheck size={15} /></span></span><b>{chips.today}</b><span class="lb">Việc hôm nay</span></button>
    </div>
    <input class="search" type="search" placeholder="Tìm tên, số điện thoại, ngày 20/12" value={q} onInput={e => setQ((e.target as HTMLInputElement).value)} aria-label="Tìm" />
    {!weddingsReady.value ? <p class="empty">Đang tải…</p> : <>
      {future.length ? rolls(future).map(([m, ws]) => <><h2 class="roll">{m}<small>{ws.length} đám</small></h2><div class="list covers">{ws.map(w => <WeddingRow w={w} />)}</div></>)
        : f === 'all' && !q ? <p class="empty"><b>Chưa có lễ nào sắp tới</b>Bấm nút + để thêm lễ hoặc gửi phiếu cho khách điền.</p>
        : f === 'late' ? null : <p class="empty">Không có lễ nào khớp. Thử gõ tên khác, hoặc bấm lại bộ lọc để tắt.</p>}
      {past.length > 0 && (f === 'late' || showPast || q
        ? <><h2 class={f === 'late' ? 'late-h' : ''}>{f === 'late' ? 'Giao trễ' : 'Đã qua'}<small>{past.length} đám</small></h2><div class="list covers">{past.map(w => <WeddingRow w={w} right={<span class="txt">{dm(w.date)}</span>} />)}</div></>
        : <p><button class="btn ghost" onClick={() => setShowPast(true)}>Xem {past.length} lễ đã qua</button></p>)}
      {f === 'late' && !past.length && <p class="empty">Không có sản phẩm nào giao trễ.</p>}
    </>}
  </main>
}
