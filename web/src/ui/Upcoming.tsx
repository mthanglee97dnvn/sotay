import { useState } from 'preact/hooks'
import { weddings, weddingsReady } from '../data/weddings'
import { leadDays } from '../data/org'
import { upcomingChips } from '../domain/wedding'
import { matches } from '../domain/search'
import { consultDue } from '../domain/consult'
import { deliveryStatus } from '../domain/delivery'
import { daysUntil, dm, weekday } from '../domain/vn-date'
import { coupleName, type Wedding, type Task } from '../domain/types'
import { kindClass } from '../domain/ceremony'
import { openWedding, openInvites } from './sheets'
import { go } from './Shell'

type Filter = 'all' | 'consult' | 'late'

export function WeddingRow({ w, right }: { w: Wedding; right?: preact.ComponentChildren }) {
  const n = w.date ? daysUntil(w.date) : null
  return <button class="item" onClick={() => (openWedding.value = { id: w.id })}>
    <div class="date">{w.date ? <><b>{w.date.slice(8, 10)}</b><span>{weekday(w.date)} · {w.date.slice(5, 7)}</span></> : <span>Chưa có ngày</span>}</div>
    <div class="grow">
      <div class="title">{coupleName(w)}</div>
      <div class="sub"><span class={'tag ' + kindClass(w.kind)}>{w.kind}</span>{w.hasVideo ? ' · Có quay' : ''}{w.cancelled && <> · <span class="late">Đã huỷ trên lịch</span></>}</div>
    </div>
    {right ?? (n != null && n >= 0 && <div class={'count' + (n === 0 ? ' today' : n <= 7 ? ' soon' : '')}>{n === 0 ? 'Hôm nay' : n === 1 ? 'Ngày mai' : `còn ${n} ngày`}</div>)}
  </button>
}

export function Upcoming({ tasks, newForms, calBar }: { tasks: Task[]; newForms: number; calBar?: preact.ComponentChildren }) {
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
  return <main class="page">
    <h1>Sắp tới</h1>
    {calBar}
    {newForms > 0 && <button class="banner" onClick={() => (openInvites.value = true)}>Bạn có {newForms} phiếu mới từ khách. Xem và đưa vào hồ sơ</button>}
    <div class="chips" role="group" aria-label="Lọc">
      <button class="chip" aria-pressed={f === 'consult'} onClick={() => toggle('consult')}>Cần hẹn tư vấn <b>{chips.consult}</b></button>
      <button class={'chip' + (chips.late ? ' late' : '')} aria-pressed={f === 'late'} onClick={() => toggle('late')}>Giao trễ <b>{chips.late}</b></button>
      <button class="chip" onClick={() => go('tasks')}>Việc hôm nay <b>{chips.today}</b></button>
    </div>
    <input class="search" type="search" placeholder="Tìm tên, số điện thoại, ngày 20/12" value={q} onInput={e => setQ((e.target as HTMLInputElement).value)} aria-label="Tìm" />
    {!weddingsReady.value ? <p class="empty">Đang tải…</p> : <>
      {future.length ? <div class="list">{future.map(w => <WeddingRow w={w} />)}</div>
        : f === 'all' && !q ? <p class="empty"><b>Chưa có lễ nào sắp tới</b>Bấm nút + để thêm lễ hoặc gửi phiếu cho khách điền.</p>
        : f === 'late' ? null : <p class="empty">Không có lễ nào khớp.</p>}
      {past.length > 0 && (f === 'late' || showPast || q
        ? <><h2>{f === 'late' ? `Giao trễ (${past.length})` : `Đã qua (${past.length})`}</h2><div class="list">{past.map(w => <WeddingRow w={w} right={<div class="count">{dm(w.date)}</div>} />)}</div></>
        : <p><button class="btn ghost" onClick={() => setShowPast(true)}>Xem {past.length} lễ đã qua</button></p>)}
      {f === 'late' && !past.length && <p class="empty">Không có sản phẩm nào giao trễ.</p>}
    </>}
  </main>
}
