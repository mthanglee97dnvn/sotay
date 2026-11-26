import { useState } from 'preact/hooks'
import { payConfig, savePayConfig } from '../data/payroll'
import { money, parseMoney, type PayConfig } from '../domain/payroll'

const newId = () => Math.random().toString(36).slice(2, 10)

/** Thêm → Chấm công: the editors and the editing price list (admin only). Past entries keep their own names and prices. */
export function PayrollSettings() {
  const cfg = payConfig.value
  const save = (fn: (c: PayConfig) => PayConfig) => void savePayConfig(fn(payConfig.value))
  const addPerson = () => { const n = (prompt('Tên người edit') ?? '').trim(); if (n) save(c => ({ ...c, people: [...c.people, { id: newId(), name: n }] })) }
  const addItem = () => { const n = (prompt('Tên hạng mục') ?? '').trim(); if (n) save(c => ({ ...c, items: [...c.items, { id: newId(), name: n, price: 0 }] })) }
  return <>
    <h2>Người edit</h2>
    <div class="list">
      {cfg.people.map(p => <div class="item pay-set" key={p.id} data-person={p.id}>
        <input type="text" class="grow" aria-label="Tên người edit" value={p.name} onBlur={e => { const v = (e.target as HTMLInputElement).value.trim(); if (v && v !== p.name) save(c => ({ ...c, people: c.people.map(x => x.id === p.id ? { ...x, name: v } : x) })) }} />
        <button class="btn ghost sm" onClick={() => save(c => ({ ...c, people: c.people.map(x => x.id === p.id ? { ...x, hidden: !x.hidden } : x) }))}>{p.hidden ? 'Hiện' : 'Ẩn'}</button>
      </div>)}
    </div>
    <button class="btn" onClick={addPerson}>Thêm người edit</button>
    <h2>Bảng giá chỉnh sửa</h2>
    <p class="muted small">Đổi giá chỉ áp dụng cho các bộ ghi sau đó; bộ đã ghi giữ giá cũ.</p>
    <div class="list">{cfg.items.map(i => <ItemRow key={i.id} id={i.id} />)}</div>
    <button class="btn" onClick={addItem}>Thêm hạng mục</button>
  </>
}

function ItemRow({ id }: { id: string }) {
  const i = payConfig.value.items.find(x => x.id === id)!
  const [bad, setBad] = useState(false)
  const set = (b: Partial<typeof i>) => void savePayConfig({ ...payConfig.value, items: payConfig.value.items.map(x => x.id === id ? { ...x, ...b } : x) })
  return <div class={`item pay-set${i.hidden ? ' is-hidden' : ''}`} data-item={id}>
    <input type="text" class="grow" aria-label="Tên hạng mục" value={i.name} onBlur={e => { const v = (e.target as HTMLInputElement).value.trim(); if (v && v !== i.name) set({ name: v }) }} />
    <label class="pay-price"><span class="sr-only">Giá</span><input type="text" aria-label="Giá" inputMode="numeric" value={money(i.price).replace('đ', '')} aria-invalid={bad}
      onBlur={e => { const n = parseMoney((e.target as HTMLInputElement).value); setBad(n === null); if (n !== null && n !== i.price) set({ price: n }) }} /></label>
    <button class="btn ghost sm" onClick={() => set({ hidden: !i.hidden })}>{i.hidden ? 'Hiện' : 'Ẩn'}</button>
  </div>
}
