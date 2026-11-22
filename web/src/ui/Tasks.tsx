import { useState } from 'preact/hooks'
import { tasks, saveTask, toggleDone, deleteTask } from '../data/tasks'
import { weddings, visibleWeddings } from '../data/weddings'
import { canEdit, myEmail, orgDoc } from '../data/org'
import { groupTasks, isMine } from '../domain/tasks'
import { diffPatch } from '../domain/wedding'
import { coupleName, type Task } from '../domain/types'
import { todayVN, dm, daysUntil, vnTime, dateLong } from '../domain/vn-date'
import { IPlus } from './icons'
import { Sheet } from './Shell'
import { openTask, openWedding } from './sheets'
import { toast } from './toast'

const fmtDue = (ms: number) => {
  const d = todayVN(new Date(ms))
  const hm = new Date(ms).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })
  const n = daysUntil(d)
  return (n === 0 ? 'Hôm nay' : n === 1 ? 'Mai' : n === -1 ? 'Hôm qua' : dm(d)) + ' ' + hm
}
const admin = () => { const o = orgDoc.value; return o && o !== 'loading' ? o.admin : '' }

function TaskRow({ t, late }: { t: Task; late?: boolean }) {
  const w = t.weddingId ? weddings.value.find(x => x.id === t.weddingId) : undefined
  return <div class="item static">
    <label class="tick"><input type="checkbox" checked={t.done} disabled={!canEdit()} aria-label={'Xong: ' + t.title} onChange={() => toggleDone(t)} /></label>
    <button class="grow bare" onClick={() => (openTask.value = { id: t.id })}>
      <div class="title" style={t.done ? 'text-decoration:line-through;color:var(--muted)' : ''}>{t.title}</div>
      <div class="sub">{[t.due != null && <span class={late ? 'late' : ''}>{fmtDue(t.due)}</span>, w && coupleName(w), t.assigneeEmail && t.assigneeEmail !== myEmail() && 'Giao: ' + t.assigneeEmail.split('@')[0]].filter(Boolean).map((x, i) => <>{i > 0 && ' · '}{x}</>)}</div>
    </button>
  </div>
}

export function Tasks() {
  const [title, setTitle] = useState('')
  const [onlyMine, setOnlyMine] = useState(true)
  const [showDone, setShowDone] = useState(false)
  const list = onlyMine ? tasks.value.filter(t => isMine(t, myEmail(), admin())) : tasks.value
  const g = groupTasks(list)
  const add = (e: Event) => {
    e.preventDefault()
    if (!title.trim()) return
    saveTask({ title: title.trim() }); setTitle(''); toast('Đã thêm việc')
  }
  const sec = (label: string, ts: Task[], late = false, h = '') => ts.length > 0 && <><h2 class={late ? 'late-h' : h}>{label}<small>{ts.length} việc</small></h2><div class={'list' + (late ? ' late-list' : '')}>{ts.map(t => <TaskRow t={t} late={late} />)}</div></>
  const [wd, dmy] = dateLong(todayVN()).split(', ')
  const empty = !g.late.length && !g.today.length && !g.upcoming.length && !g.noDate.length
  return <main class="page">
    <div class="eyebrow">{wd} · {(dmy || '').slice(0, 5).replace('/', '.')}</div>
    <h1>Việc</h1>
    <p class="kicker">Của tôi &amp; cả nhóm</p>
    <div class="tabs" role="tablist">
      <button role="tab" aria-selected={onlyMine} onClick={() => setOnlyMine(true)}>Của tôi</button>
      <button role="tab" aria-selected={!onlyMine} onClick={() => setOnlyMine(false)}>Cả nhóm</button>
    </div>
    {canEdit() && <form class="quickadd" onSubmit={add}>
      <input class="grow" type="text" placeholder="Thêm việc nhanh, vd: Gọi chốt lịch Lan & Minh" value={title} onInput={e => setTitle((e.target as HTMLInputElement).value)} aria-label="Việc mới" />
      <button class="add" aria-label="Thêm"><IPlus size={18} /></button>
    </form>}
    {empty && <p class="empty"><b>Không còn việc nào</b>{canEdit() ? 'Gõ việc vào ô trên, hoặc bấm + để thêm việc có giờ nhắc.' : 'Chưa có việc nào được giao.'}</p>}
    {sec('Quá hạn', g.late, true)}
    {sec('Hôm nay', g.today, false, 'gold-h')}
    {sec('Sắp tới', g.upcoming)}
    {sec('Chưa hẹn giờ', g.noDate)}
    {g.done.length > 0 && (showDone ? sec('Đã xong', g.done.slice(0, 50)) : <p><button class="btn ghost" onClick={() => setShowDone(true)}>Xem {g.done.length} việc đã xong</button></p>)}
  </main>
}

const toLocal = (ms: number | null) => ms == null ? '' : todayVN(new Date(ms)) + 'T' + new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })
const fromLocal = (s: string) => s ? vnTime(s.slice(0, 10), s.slice(11, 16)) : null

export function TaskSheet() {
  const o = openTask.value!
  const stored = o.id ? tasks.value.find(t => t.id === o.id) : undefined
  const [d, setD] = useState<Partial<Task>>({ title: '', body: '', due: null, weddingId: null, assigneeEmail: null, ...stored, ...o.draft })
  const [base] = useState(d)
  const edit = canEdit()
  const org = orgDoc.value
  const people = org && org !== 'loading' ? [org.admin, ...Object.entries(org.roles).filter(([, r]) => r === 'editor').map(([e]) => e)] : []
  const today = todayVN()
  const ws = visibleWeddings.value.filter(w => !w.date || w.date >= today || w.id === d.weddingId)
  const save = () => {
    if (!d.title?.trim()) { toast('Nhập tên việc', true); return }
    const next = { ...d, title: d.title.trim() }
    saveTask(o.id ? { id: o.id, ...diffPatch(base, next) } : next); openTask.value = null; toast('Đã lưu việc')
  }
  const w = d.weddingId ? weddings.value.find(x => x.id === d.weddingId) : undefined
  return <Sheet title={o.id ? 'Việc' : 'Thêm việc'} onClose={() => (openTask.value = null)} actions={edit && <button class="btn primary sm" onClick={save}>Lưu</button>}>
    <div class="card grid2">
      <label class="field full"><span>Việc cần làm *</span><input type="text" disabled={!edit} value={d.title} onInput={e => setD({ ...d, title: (e.target as HTMLInputElement).value })} /></label>
      <label class="field"><span>Nhắc lúc</span><input type="datetime-local" disabled={!edit} value={toLocal(d.due ?? null)} onInput={e => setD({ ...d, due: fromLocal((e.target as HTMLInputElement).value) })} /></label>
      <label class="field"><span>Giao cho</span>
        <select disabled={!edit} value={d.assigneeEmail || ''} onChange={e => setD({ ...d, assigneeEmail: (e.target as HTMLSelectElement).value || null })}>
          <option value="">Người tạo việc</option>{people.map(p => <option value={p}>{p}</option>)}</select></label>
      <label class="field full"><span>Thuộc lễ</span>
        <select disabled={!edit} value={d.weddingId || ''} onChange={e => setD({ ...d, weddingId: (e.target as HTMLSelectElement).value || null })}>
          <option value="">Việc chung</option>{ws.map(w => <option value={w.id}>{coupleName(w)} – {w.kind} {w.date ? dm(w.date) : ''}</option>)}</select></label>
      <label class="field full"><span>Ghi chú</span><textarea disabled={!edit} value={d.body} onInput={e => setD({ ...d, body: (e.target as HTMLTextAreaElement).value })} /></label>
    </div>
    <div class="row wrap" style="margin-top:12px">
      {w && <button class="btn" onClick={() => { openTask.value = null; openWedding.value = { id: w.id } }}>Mở hồ sơ {coupleName(w)}</button>}
      {o.id && edit && <button class="btn ghost danger" onClick={() => { if (confirm('Xoá việc này? Không khôi phục được.')) { deleteTask(o.id!); openTask.value = null } }}>Xoá việc</button>}
    </div>
  </Sheet>
}
