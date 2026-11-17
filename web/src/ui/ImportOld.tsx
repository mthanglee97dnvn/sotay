import { useState } from 'preact/hooks'
import { weddings } from '../data/weddings'
import { tasks } from '../data/tasks'
import { myEmail } from '../data/org'
import { migrate, type MigrateResult } from '../domain/migrate'
import { writeImport, unmatchedAll } from '../data/importer'
import { cleanOldCalendar } from '../data/gcal'
import { toast } from './toast'

export function ImportOld() {
  const [res, setRes] = useState<MigrateResult | null>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const pick = async (f: File | undefined) => {
    setErr(''); setRes(null); setDone(false)
    if (!f) return
    try { setRes(migrate(JSON.parse(await f.text()), { weddings: weddings.value, taskIds: tasks.value.map(t => t.id), unmatchedIds: unmatchedAll.value.map(u => u.id) }, myEmail())) }
    catch (e) { setErr(e instanceof SyntaxError ? 'File không đọc được. Chọn đúng file .json đã xuất từ bản cũ.' : (e as Error).message) }
  }
  const go = async () => { setBusy(true); const ok = await writeImport(res!); setBusy(false); if (ok) { setDone(true); toast('Đã nhập dữ liệu cũ') } }
  return <div class="stack">
    <div class="card stack">
      <b>1. Xuất dữ liệu từ bản cũ</b>
      <p class="muted small" style="margin:0">Mở bản cũ (trong Claude, hoặc web ở địa chỉ <a href="../cu/" target="_blank" rel="noopener">/sotay/cu/</a>) → Cài đặt → "Xuất dữ liệu (file .json)". Làm cho từng bản anh từng dùng.</p>
      <b>2. Chọn file vừa xuất</b>
      <input type="file" accept="application/json,.json" onChange={e => pick((e.target as HTMLInputElement).files?.[0])} />
      {err && <p class="late small" role="alert" style="margin:0">{err}</p>}
    </div>
    {res && !done && <div class="card stack">
      <b>Sẽ nhập</b>
      <ul class="small" style="margin:0;padding-left:18px">
        <li>{res.report.weddings} hồ sơ lễ mới (từ phiếu khách và lịch chụp cũ)</li>
        <li>{res.report.tasks} việc / ghi chú (thành việc chung)</li>
        <li>{res.report.linked} link sản phẩm đã ghép đúng hồ sơ</li>
        <li>{res.report.unmatched} link chưa biết của lễ nào, sẽ nằm ở mục "Chưa ghép" trong Kho sản phẩm</li>
      </ul>
      <p class="muted small" style="margin:0">Nhập lại cùng file sẽ không tạo bản trùng.</p>
      <button class="btn primary" disabled={busy || !(res.weddings.length + res.tasks.length + res.unmatched.length)} onClick={go}>{busy ? 'Đang nhập…' : 'Nhập'}</button>
    </div>}
    {done && <p class="card">Xong. Kiểm tra Sắp tới, Việc và Kho sản phẩm. Có thể nhập tiếp file của bản khác.</p>}
    <div class="card stack">
      <b>Dọn nhắc của bản cũ trên Google Lịch</b>
      <p class="muted small" style="margin:0">Sau khi chuyển hẳn sang bản này, bấm để xoá các sự kiện nhắc mà bản cũ đã tạo trên Google Lịch của bạn, tránh bị nhắc hai lần.</p>
      <button class="btn" onClick={() => { if (confirm('Xoá các nhắc việc do bản cũ tạo trên Google Lịch của bạn?')) cleanOldCalendar().then(n => toast(n < 0 ? 'Cần cấp quyền Google Lịch – bấm lại' : `Đã xoá ${n} nhắc cũ`)) }}>Dọn nhắc cũ</button>
    </div>
  </div>
}
