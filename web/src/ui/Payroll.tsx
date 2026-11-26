import { useState } from 'preact/hooks'
import { signal } from '@preact/signals'
import { payEntries, payConfig, payReady, savePayEntry, deletePayEntry } from '../data/payroll'
import { visibleWeddings } from '../data/weddings'
import { coupleName } from '../domain/types'
import { money, monthOf, monthTotals, shiftMonth, statement, type PayEntry } from '../domain/payroll'
import { copyText } from './sheets'
import { toast } from './toast'
import { Sheet, go } from './Shell'
import { moreSub } from './moreSub'

const pad = (n: number) => String(n).padStart(2, '0')
const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
const ddmm = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}`
const month = signal(monthOf(today()))
const editing = signal<PayEntry | 'new' | null>(null)
const open = signal<string[]>([])

/** Chấm công (admin only): log edited sets and see each editor's money for the month. */
export function Payroll() {
  const m = month.value, [y, mo] = m.split('-')
  const rows = monthTotals(payEntries.value, m, payConfig.value)
  const total = rows.reduce((s, r) => s + r.total, 0), count = rows.reduce((s, r) => s + r.count, 0)
  const noPeople = payReady.value && !payConfig.value.people.some(p => !p.hidden)
  const toggle = (id: string) => (open.value = open.value.includes(id) ? open.value.filter(x => x !== id) : [...open.value, id])
  return <main class="page payroll">
    <h1>Chấm công</h1>
    <div class="pay-month">
      <button class="btn ghost sm" aria-label="Tháng trước" onClick={() => (month.value = shiftMonth(m, -1))}>‹</button>
      <strong>Tháng {mo}/{y}</strong>
      <button class="btn ghost sm" aria-label="Tháng sau" onClick={() => (month.value = shiftMonth(m, 1))}>›</button>
    </div>
    {noPeople
      ? <p class="muted small">Chưa có người edit. <a href="#" onClick={e => { e.preventDefault(); moreSub.value = 'payroll'; go('more') }}>Thêm người edit</a> trong Thêm → Chấm công.</p>
      : <button class="btn primary" onClick={() => (editing.value = 'new')}>Ghi công</button>}
    {rows.length ? <div class="list">
      {rows.map(r => {
        const isOpen = open.value.includes(r.personId)
        return <section class="pay-person" key={r.personId}>
          <button class="item" aria-expanded={isOpen} onClick={() => toggle(r.personId)}>
            <span class="grow"><span class="title">{r.name}</span><span class="sub"> · {r.count} bộ</span></span>
            <strong class="pay-money">{money(r.total)}</strong>
          </button>
          {isOpen && <div class="pay-entries">
            {r.entries.map(x => <div class="pay-entry" key={x.id}>
              <div class="grow"><div><b>{ddmm(x.date)}</b> {x.item}</div>{(x.weddingName || x.note) && <div class="sub">{[x.weddingName, x.note].filter(Boolean).join(' · ')}</div>}</div>
              <span class="pay-money">{money(x.price)}</span>
              <div class="pay-acts">
                <button class="btn ghost sm" onClick={() => (editing.value = x)}>Sửa</button>
                <button class="btn ghost sm danger" onClick={() => { if (confirm(`Xoá bộ ${x.item} ngày ${ddmm(x.date)} của ${r.name}?`)) deletePayEntry(x.id) }}>Xoá</button>
              </div>
            </div>)}
            <button class="btn sm" onClick={async () => (await copyText(statement(r, m))) ? toast(`Đã copy bảng của ${r.name}`) : toast('Không copy được bảng', true)}>Copy bảng</button>
          </div>}
        </section>
      })}
      <div class="item pay-total"><span class="grow"><b>Tổng</b> · {count} bộ</span><strong>{money(total)}</strong></div>
    </div> : <p class="muted">Chưa ghi công tháng này.</p>}
    <PayEntrySheet />
  </main>
}

function PayEntrySheet() {
  const cur = editing.value
  return cur ? <EditEntry key={cur === 'new' ? 'new' : cur.id} cur={cur} /> : null
}

function EditEntry({ cur }: { cur: PayEntry | 'new' }) {
  const cfg = payConfig.value
  const people = cfg.people.filter(p => !p.hidden || (cur !== 'new' && p.id === cur.personId))
  const items = cfg.items.filter(i => !i.hidden)
  const [personId, setPerson] = useState(cur !== 'new' ? cur.personId : people.length === 1 ? people[0].id : '')
  const startIdx = cur !== 'new' ? String(items.findIndex(i => i.name === cur.item)) : ''
  const [itemIdx, setItem] = useState(startIdx)
  const [date, setDate] = useState(cur !== 'new' ? cur.date : today())
  const [weddingId, setWedding] = useState(cur !== 'new' ? cur.weddingId || '' : '')
  const [note, setNote] = useState(cur !== 'new' ? cur.note || '' : '')
  const near = visibleWeddings.value.filter(w => w.date && Math.abs(Date.parse(w.date) - Date.parse(date)) <= 60 * 864e5).sort((a, b) => a.date.localeCompare(b.date))
  const close = () => (editing.value = null)
  const save = () => {
    const p = cfg.people.find(x => x.id === personId)
    if (!p) return toast('Chọn người edit', true)
    // Editing without picking another item keeps the item and price it was logged at (prices may have changed since).
    const keep = cur !== 'new' && itemIdx === startIdx
    const it = keep ? undefined : items[+itemIdx]
    if (!it && !keep) return toast('Chọn hạng mục', true)
    const w = visibleWeddings.value.find(x => x.id === weddingId)
    savePayEntry({ id: cur !== 'new' ? cur.id : undefined, createdAt: cur !== 'new' ? cur.createdAt : undefined, date, personId: p.id, person: p.name,
      item: it ? it.name : (cur as PayEntry).item, price: it ? it.price : (cur as PayEntry).price,
      weddingId: w?.id, weddingName: w ? coupleName(w) : undefined, note: note.trim() || undefined })
    if (monthOf(date) !== month.value) month.value = monthOf(date)
    open.value = open.value.includes(p.id) ? open.value : [...open.value, p.id]
    toast(cur === 'new' ? 'Đã ghi công' : 'Đã lưu'); close()
  }
  return <Sheet title={cur === 'new' ? 'Ghi công' : 'Sửa công'} onClose={close} actions={<button class="btn primary sm" onClick={save}>Lưu</button>}>
    <div class="card stack">
      <label class="field"><span>Người edit</span><select value={personId} onChange={e => setPerson((e.target as HTMLSelectElement).value)}>
        <option value="" disabled>Chọn người</option>{people.map(p => <option value={p.id}>{p.name}</option>)}</select></label>
      <label class="field"><span>Hạng mục</span><select value={itemIdx} onChange={e => setItem((e.target as HTMLSelectElement).value)}>
        <option value="" disabled>Chọn hạng mục</option>
        {cur !== 'new' && itemIdx === '-1' && <option value="-1">{cur.item} – {money(cur.price)}</option>}
        {items.map((i, k) => <option value={String(k)}>{i.name} – {money(i.price)}</option>)}</select></label>
      <label class="field"><span>Ngày</span><input type="date" value={date} onInput={e => setDate((e.target as HTMLInputElement).value || today())} /></label>
      <label class="field"><span>Đám cưới</span><select value={weddingId} onChange={e => setWedding((e.target as HTMLSelectElement).value)}>
        <option value="">Không gắn đám nào</option>
        {cur !== 'new' && cur.weddingId && !near.some(w => w.id === cur.weddingId) && <option value={cur.weddingId}>{cur.weddingName}</option>}
        {near.map(w => <option value={w.id}>{ddmm(w.date)} {coupleName(w)}</option>)}</select>
        <span class="hint">Không bắt buộc. Danh sách các đám trong vòng 2 tháng quanh ngày đã chọn.</span></label>
      <label class="field"><span>Ghi chú</span><input type="text" value={note} onInput={e => setNote((e.target as HTMLInputElement).value)} placeholder="vd: chỉnh lại theo yêu cầu khách" /></label>
    </div>
  </Sheet>
}
