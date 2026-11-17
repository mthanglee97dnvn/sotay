import { useState } from 'preact/hooks'
import { weddings, setLink, markDelivered } from '../data/weddings'
import { canEdit } from '../data/org'
import { storeBuckets } from '../domain/store'
import { deliveryStatus, daysLeft, deadline, type Part } from '../domain/delivery'
import { ekipReminder } from '../domain/consult'
import { matches } from '../domain/search'
import { dm, dmy } from '../domain/vn-date'
import { coupleName, type Wedding } from '../domain/types'
import { copyText, openWedding } from './sheets'
import { toast } from './toast'
import { ICopy, ILink } from './icons'
import type { ComponentChildren } from 'preact'

export function Store({ extra }: { extra?: ComponentChildren }) {
  const [tab, setTab] = useState<'todo' | 'done'>('todo')
  const [q, setQ] = useState('')
  const b = storeBuckets(weddings.value.filter(w => matches(w, q)))
  const todo = [...b.late, ...b.dueSoon, ...b.waiting]
  return <main class="page">
    <h1>Kho sản phẩm</h1>
    <div class="tabs" role="tablist">
      <button role="tab" aria-selected={tab === 'todo'} onClick={() => setTab('todo')}>Cần giao ({todo.length})</button>
      <button role="tab" aria-selected={tab === 'done'} onClick={() => setTab('done')}>Đã giao ({b.done.length})</button>
    </div>
    <input class="search" type="search" placeholder="Tìm tên khách để lấy link" value={q} onInput={e => setQ((e.target as HTMLInputElement).value)} aria-label="Tìm" />
    {extra}
    {tab === 'todo' && (todo.length ? <div class="stack">{todo.map(w => <Card w={w} />)}</div>
      : <p class="empty"><b>Đã giao hết</b>Lễ nào xong sẽ tự vào đây với hạn giao ảnh 7–10 ngày, video 25–30 ngày.</p>)}
    {tab === 'done' && (b.done.length ? <div class="stack">{b.done.slice(0, q ? 200 : 60).map(w => <Card w={w} />)}</div>
      : <p class="empty">Chưa có lễ nào giao xong.</p>)}
  </main>
}

function Card({ w }: { w: Wedding }) {
  return <div class="card stack">
    <button class="row" style="border:0;background:none;padding:0;text-align:left;cursor:pointer;width:100%" onClick={() => (openWedding.value = { id: w.id })}>
      <div class="grow"><div class="title">{coupleName(w)}</div><div class="sub">{w.kind} {dmy(w.date)}</div></div>
    </button>
    <PartRow w={w} part="photo" />
    {w.hasVideo && <PartRow w={w} part="video" />}
  </div>
}

function PartRow({ w, part }: { w: Wedding; part: Part }) {
  const p = w[part]
  const st = deliveryStatus(w, part)
  const left = daysLeft(w, part)
  const [val, setVal] = useState(p.link)
  const [showHist, setShowHist] = useState(false)
  const label = part === 'photo' ? 'Ảnh' : 'Video'
  const stText = st === 'done' ? 'Đã giao' : st === 'late' ? `Trễ ${-left} ngày` : left === 0 ? 'Hạn hôm nay' : `Còn ${left} ngày tới hạn ${dm(deadline(w, part))}`
  const cls = st === 'done' ? 'done' : st === 'late' ? 'late' : st === 'due-soon' ? 'soon' : 'wait'
  const edit = canEdit()
  return <div style="border-top:1px solid var(--line);padding-top:10px" class="stack">
    <div class="row"><b class="grow">{label}</b><span class={'st ' + cls}>{stText}</span></div>
    <div class="row">
      <input class="grow" type="url" placeholder={`Dán link ${label.toLowerCase()} (Google Photos / Drive)`} value={val} disabled={!edit}
        onInput={e => setVal((e.target as HTMLInputElement).value)}
        onBlur={() => { if (val.trim() !== p.link) { setLink(w.id, part, val); toast(p.link ? 'Đã thay link, link cũ vẫn được giữ' : 'Đã lưu link') } }} aria-label={'Link ' + label} />
      {p.link && <a class="btn sm" href={p.link} target="_blank" rel="noopener" aria-label={'Mở link ' + label}><ILink size={18} /></a>}
    </div>
    <div class="row wrap">
      {edit && st !== 'done' && <button class="btn sm" disabled={!p.link} onClick={() => { markDelivered(w.id, part, true); toast(`Đã đánh dấu giao ${label.toLowerCase()}`) }}>Đã giao</button>}
      {edit && st === 'done' && <button class="btn ghost sm" onClick={() => markDelivered(w.id, part, false)}>Bỏ đã giao</button>}
      {st !== 'done' && <button class="btn sm" onClick={() => copyText(ekipReminder(w, part)).then(() => toast('Đã chép tin nhắc – dán vào Framevis hoặc Zalo'))}><ICopy size={18} />Sao chép tin nhắc</button>}
      {p.link && <button class="btn ghost sm" onClick={() => copyText(p.link).then(() => toast('Đã chép link'))}>Chép link</button>}
      {p.history.length > 0 && <button class="btn ghost sm" onClick={() => setShowHist(!showHist)}>Link cũ ({p.history.length})</button>}
    </div>
    {showHist && <ul class="small" style="margin:0;padding-left:18px">{[...p.history].reverse().map(h => <li><a href={h.link} target="_blank" rel="noopener">{h.link}</a> <span class="muted">thay ngày {dmy(new Date(h.at).toISOString().slice(0, 10))}</span></li>)}</ul>}
  </div>
}
