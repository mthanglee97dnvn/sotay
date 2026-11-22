import { computed } from '@preact/signals'
import { weddings, unhideWedding, purgeWedding } from '../data/weddings'
import { coupleName, type Wedding } from '../domain/types'
import { dmy } from '../domain/vn-date'
import { toast } from './toast'

export const hiddenWeddings = computed(() =>
  weddings.value.filter(w => w.hidden && !w.purged).sort((a, b) => (b.date || '').localeCompare(a.date || '')))

function purge(w: Wedding) {
  if (!confirm(`Xoá hẳn ${coupleName(w)} (${w.kind} ${dmy(w.date)}) khỏi Sổ Tay? Không khôi phục được. Lịch trên Google Lịch / Framevis không bị đổi.`)) return
  purgeWedding(w).then(() => toast(`Đã xoá hẳn ${coupleName(w)}`))
}

export function Hidden() {
  const list = hiddenWeddings.value
  if (!list.length) return <p class="muted">Không có lịch nào đang ẩn.</p>
  return <>
    <p class="muted small">Lịch ẩn chỉ biến mất khỏi Sổ Tay. Google Lịch và Framevis vẫn giữ nguyên.</p>
    <div class="list">
      {list.map(w => <div class="item hidrow" key={w.id} data-hid={w.id}>
        <div class="grow"><div class="title">{coupleName(w)}</div><div class="sub">{w.kind} · {dmy(w.date)}</div></div>
        <button class="btn sm" onClick={() => { unhideWedding(w.id); toast(`Đã hiện lại ${coupleName(w)}`) }}>Hiện lại</button>
        <button class="btn sm ghost danger" onClick={() => purge(w)}>Xoá hẳn</button>
      </div>)}
    </div>
  </>
}
