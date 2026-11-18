import { useState } from 'preact/hooks'
import { isAdmin, me, signOut, leadDays, setLeadDays, orgDoc, setFramevisCal } from '../data/org'
import { DEFAULT_FRAMEVIS_CAL } from '../data/calsync'
import { weddings } from '../data/weddings'
import { tasks } from '../data/tasks'
import { Members } from './Members'
import { gcalOn, gcalStatus, enableGcal } from '../data/gcal'
import { summarize } from '../domain/summary'
import { go } from './Shell'
import type { ComponentChildren } from 'preact'

type Sub = 'menu' | 'members' | 'summary' | 'import'

export function More({ importer }: { importer?: ComponentChildren }) {
  const [sub, setSub] = useState<Sub>('menu')
  const m = me.value
  const back = (title: string, body: ComponentChildren) => <main class="page"><button class="btn ghost sm" onClick={() => setSub('menu')}>‹ Thêm</button><h1>{title}</h1>{body}</main>
  if (sub === 'members') return back('Thành viên', <Members />)
  if (sub === 'summary') return back('Tóm tắt', <Summary />)
  if (sub === 'import') return back('Nhập dữ liệu cũ', importer)
  return <main class="page">
    <h1>Thêm</h1>
    {isAdmin() && <div class="list">
      <button class="item" onClick={() => setSub('summary')}><div class="grow"><div class="title">Tóm tắt</div><div class="sub">Số lễ theo tháng, tư vấn, giao trễ</div></div></button>
      <button class="item" onClick={() => setSub('members')}><div class="grow"><div class="title">Thành viên</div><div class="sub">Thêm Gmail, cấp quyền sửa hoặc chỉ xem</div></div></button>
      {importer && <button class="item" onClick={() => setSub('import')}><div class="grow"><div class="title">Nhập dữ liệu cũ</div><div class="sub">Từ file .json xuất ở bản Sổ Tay trước</div></div></button>}
    </div>}
    {isAdmin() && <>
      <h2>Hẹn tư vấn</h2>
      <label class="card row"><span class="grow">Nhắc hẹn tư vấn trước ngày lễ</span>
        <input class="numinput" type="number" min={1} max={180} value={leadDays.value}
          onChange={e => setLeadDays(Number((e.target as HTMLInputElement).value) || 45)} aria-label="Số ngày" /> ngày</label>
    </>}
    {isAdmin() && <>
      <h2>Đồng bộ lịch Google</h2>
      <div class="card stack">
        <p class="small m0">Sổ Tay đọc lịch Framevis và lịch chính của bạn để tạo hồ sơ lễ.</p>
        <details class="adv"><summary>Nâng cao: mã lịch Framevis</summary>
          <label class="field"><span>Mã lịch Framevis</span>
            <input type="text" value={(o => (o && o !== 'loading' && o.framevisCalId) || DEFAULT_FRAMEVIS_CAL)(orgDoc.value)}
              onChange={e => setFramevisCal((e.target as HTMLInputElement).value)} />
            <span class="hint">Chỉ đổi khi Framevis đổi lịch.</span></label>
        </details>
      </div>
    </>}
    <h2>Nhắc trên Google Lịch</h2>
    <div class="card stack">
      <label class="check"><input type="checkbox" checked={gcalOn.value} onChange={e => enableGcal((e.target as HTMLInputElement).checked)} />Đưa việc của tôi lên Google Lịch để điện thoại nhắc cả khi đóng app</label>
      <p class="muted small m0">{gcalStatus.value || 'Chỉ xin quyền tạo và sửa sự kiện nhắc việc. Lần đầu Google sẽ hỏi cấp quyền.'}</p>
    </div>
    <h2>Tài khoản</h2>
    <div class="card row"><div class="grow small">{m && m !== 'loading' ? m.email : ''}</div><button class="btn sm" onClick={signOut}>Đăng xuất</button></div>
  </main>
}

function Summary() {
  const s = summarize(weddings.value, tasks.value, leadDays.value)
  const max = Math.max(1, ...s.byMonth.map(x => x.count))
  const stat = (n: number, label: string, onClick: () => void, late = false) =>
    <button class="card" style="text-align:left;cursor:pointer" onClick={onClick}><b style={`font:700 var(--fs-3xl)/1 var(--display);${late && n ? 'color:var(--late)' : ''}`}>{n}</b><div class="sub">{label}</div></button>
  return <div class="stack">
    <div class="grid2" style="grid-template-columns:1fr 1fr">
      {stat(s.consultDue, 'cần hẹn tư vấn', () => go('upcoming'))}
      {stat(s.late, 'lễ giao trễ', () => go('store'), true)}
      {stat(s.dueSoon, 'sắp tới hạn giao', () => go('store'))}
      {stat(s.openTasks, 'việc chưa xong (cả nhóm)', () => go('tasks'))}
    </div>
    <h2>Số lễ 6 tháng tới</h2>
    <div class="card stack">
      {s.byMonth.map(x => <div class="row">
        <span style="width:68px" class="small">{x.month}</span>
        <div class="grow" style="background:var(--chip);border-radius:var(--r-pill);height:12px;overflow:hidden"><div style={`width:${(x.count / max) * 100}%;height:100%;background:var(--accent);border-radius:var(--r-pill)`} /></div>
        <b style="width:28px;text-align:right">{x.count}</b>
      </div>)}
    </div>
  </div>
}
