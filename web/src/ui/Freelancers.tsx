import { useState } from 'preact/hooks'
import { signal } from '@preact/signals'
import { freelancers, freelancersReady, saveFreelancer, deleteFreelancer } from '../data/freelancers'
import { canEdit } from '../data/org'
import { askMessage, openUrl, forJob } from '../domain/freelancers'
import { dateLong } from '../domain/vn-date'
import type { Freelancer, Job } from '../domain/types'
import { copyText } from './sheets'
import { toast } from './toast'
import { Sheet } from './Shell'
import { IChat } from './icons'

const DOES: Record<Job, string> = { chup: 'Chụp', quay: 'Quay', ca: 'Chụp & quay' }

/** The thợ being edited ('new' for a blank one); null when the sheet is closed. */
export const editing = signal<Freelancer | 'new' | null>(null)
/** A message that could not be copied automatically, shown for copying by hand. */
// Shown when the phone refuses the copy or blocks the chat window.
const manual = signal<{ text: string; url: string | null; copied: boolean } | null>(null)

export function Freelancers() {
  const [date, setDate] = useState('')
  const [job, setJob] = useState<'chup' | 'quay' | undefined>()
  const [q, setQ] = useState('')
  const edit = canEdit()
  const list = forJob(freelancers.value.filter(f => !q || f.name.toLowerCase().includes(q.trim().toLowerCase())), job)

  async function ask(f: Freelancer) {
    const text = askMessage({ date: date || undefined, job })
    const url = openUrl(f.fb)
    // Open the chat inside the tap itself, before any await, so mobile popup blockers allow it.
    const copying = copyText(text)
    // ('noopener' as a feature makes window.open return null, so cut the link by hand.)
    const w = url ? window.open(url, '_blank') : null
    if (w) try { w.opener = null } catch { /* cross-origin already */ }
    const opened = !url || !!w
    const copied = await copying
    if (!copied || !opened) { manual.value = { text, url: opened ? null : url, copied }; return }
    toast(url ? 'Đã chép tin, dán vào khung chat' : 'Đã chép tin. Thợ này chưa có link Facebook')
  }

  return <main class="page">
    <h1>Thợ freelancer</h1>
    <p class="kicker">Hỏi lịch nhanh</p>
    <div class="card stack">
      <label class="field"><span>Ngày cần thợ</span>
        <input type="date" value={date} onInput={e => setDate((e.target as HTMLInputElement).value)} />
        {date && <span class="hint">{dateLong(date)}</span>}
      </label>
      <div class="tabs" role="group" aria-label="Việc cần thợ">
        {(['chup', 'quay'] as const).map(j => <button aria-pressed={job === j} onClick={() => setJob(job === j ? undefined : j)}>{DOES[j]}</button>)}
      </div>
    </div>
    <input class="search" type="search" placeholder="Tìm tên thợ" aria-label="Tìm tên thợ" value={q} onInput={e => setQ((e.target as HTMLInputElement).value)} />
    {edit && <button class="btn ghost" onClick={() => (editing.value = 'new')}>+ Thêm thợ</button>}
    {!freelancersReady.value && !freelancers.value.length ? <p class="empty">Đang tải…</p>
      : list.length ? <div class="list">{list.map(({ f, fit }) => <div class={'item static' + (fit ? '' : ' dim')} key={f.id}>
        <button class="bare grow" disabled={!edit} onClick={() => (editing.value = f)}>
          <div class="title">{f.name || 'Chưa có tên'}</div>
          <div class="sub">{[DOES[f.does], f.note].filter(Boolean).join(' · ')}</div>
        </button>
        <button class="btn primary sm" onClick={() => ask(f)}><IChat size={16} />Hỏi lịch</button>
      </div>)}</div>
      : q ? <p class="empty">Không có thợ nào tên như vậy.</p>
      : <p class="empty"><b>Chưa có thợ nào</b>{edit ? 'Bấm “Thêm thợ” để lưu người đầu tiên.' : 'Danh sách thợ đang trống.'}</p>}
    {manual.value && <Sheet title="Chép tin hỏi lịch" onClose={() => (manual.value = null)}>
      {manual.value.copied ? <p class="small m0">Đã chép tin. Bấm để mở khung chat rồi dán vào:</p>
        : <><p class="small m0">Điện thoại chưa cho chép tự động. Bấm giữ để chép tin này rồi dán vào khung chat:</p>
          <pre class="msgbox">{manual.value.text}</pre></>}
      {manual.value.url && <a class="btn primary" href={manual.value.url} target="_blank" rel="noopener" onClick={() => (manual.value = null)}>Mở Messenger</a>}
    </Sheet>}
  </main>
}

export function FreelancerSheet() {
  const cur = editing.value
  // Keyed so opening another thợ starts from that thợ's saved values.
  return cur ? <EditCrew key={cur === 'new' ? 'new' : cur.id} cur={cur} /> : null
}

function EditCrew({ cur }: { cur: Freelancer | 'new' }) {
  const [f, setF] = useState<Freelancer>(cur !== 'new' ? cur : { id: '', name: '', fb: '', does: 'chup', note: '', updatedAt: 0 })
  const set = (k: keyof Freelancer) => (e: Event) => setF({ ...f, [k]: (e.target as HTMLInputElement).value })
  const close = () => (editing.value = null)
  const save = () => {
    if (!f.name.trim()) return toast('Nhập tên thợ trước khi lưu', true)
    saveFreelancer({ ...f, id: f.id || undefined, name: f.name.trim(), fb: f.fb.trim(), note: f.note.trim() })
    toast('Đã lưu thợ'); close()
  }
  const remove = () => { if (confirm(`Xoá ${f.name || 'thợ này'} khỏi danh sách thợ? Không khôi phục được.`)) { deleteFreelancer(f.id); close() } }
  return <Sheet title={cur === 'new' ? 'Thêm thợ' : 'Sửa thợ'} onClose={close}
    actions={<button class="btn primary sm" onClick={save}>Lưu</button>}>
    <div class="card stack">
      <label class="field"><span>Tên</span><input value={f.name} onInput={set('name')} placeholder="vd: Minh Tuấn" /></label>
      <label class="field"><span>Link Facebook</span><input value={f.fb} onInput={set('fb')} inputMode="url" placeholder="facebook.com/ten.cua.tho" />
        <span class="hint">Dán link trang cá nhân để bấm “Hỏi lịch” là mở thẳng Messenger.</span></label>
      <label class="field"><span>Làm</span><select value={f.does} onChange={set('does')}>
        {(Object.keys(DOES) as Job[]).map(j => <option value={j}>{DOES[j]}</option>)}</select></label>
      <label class="field"><span>Ghi chú</span><input value={f.note} onInput={set('note')} placeholder="Khu vực, giá, điểm mạnh" /></label>
    </div>
    {f.id && <button class="btn ghost danger" onClick={remove}>Xoá thợ</button>}
  </Sheet>
}
