import { useState } from 'preact/hooks'
import { unmatched, attachUnmatched, dropUnmatched } from '../data/importer'
import { weddings } from '../data/weddings'
import { matches } from '../domain/search'
import { coupleName, type Unmatched } from '../domain/types'
import { dmy, todayVN } from '../domain/vn-date'
import { toast } from './toast'

export function UnmatchedList() {
  const list = unmatched.value
  const [open, setOpen] = useState(false)
  if (!list.length) return null
  return <div class="card stack" style="margin-bottom:12px">
    <button class="row bare" onClick={() => setOpen(!open)}>
      <b class="grow">Chưa ghép ({list.length})</b><span class="muted small">{open ? 'Thu gọn' : 'Link cũ chưa biết của lễ nào'}</span>
    </button>
    {open && list.map(u => <Row key={u.id} u={u} />)}
  </div>
}

function Row({ u }: { u: Unmatched }) {
  const [q, setQ] = useState(u.name)
  const today = todayVN()
  const hits = q.trim() ? weddings.value.filter(w => w.date <= today && matches(w, q)).slice(0, 5) : []
  return <div class="stack sep">
    <div class="small">{u.name || 'Không rõ tên'}{u.link && <> · <a href={u.link} target="_blank" rel="noopener">link ảnh</a></>}{u.video && <> · <a href={u.video} target="_blank" rel="noopener">link video</a></>}</div>
    <input type="search" placeholder="Ghép vào hồ sơ… gõ tên khách" value={q} onInput={e => setQ((e.target as HTMLInputElement).value)} aria-label="Tìm hồ sơ để ghép" />
    {hits.map(w => <button class="btn sm" style="justify-content:flex-start" onClick={() => attachUnmatched(u, w.id).then(ok => ok && toast('Đã ghép link vào ' + coupleName(w)))}>{coupleName(w)} – {w.kind} {dmy(w.date)}</button>)}
    <button class="btn ghost sm danger" style="align-self:flex-start" onClick={() => confirm('Bỏ link này khỏi danh sách chưa ghép? Không khôi phục được.') && dropUnmatched(u)}>Bỏ link này</button>
  </div>
}
