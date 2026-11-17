import { useState } from 'preact/hooks'
import { orgDoc, setRole, myEmail } from '../data/org'
import { MAX_PEOPLE } from '../domain/roles'

export function Members() {
  const o = orgDoc.value
  const [email, setEmail] = useState('')
  const [r, setR] = useState<'editor' | 'viewer'>('viewer')
  if (!o || o === 'loading') return null
  const list = Object.entries(o.roles).sort()
  return <div class="stack">
    <p class="muted small">{list.length + 1}/{MAX_PEOPLE} người. "Được sửa" thêm và sửa hồ sơ, việc, link sản phẩm. "Chỉ xem" không sửa được gì.</p>
    <div class="list">
      <div class="item" style="cursor:default"><div class="grow"><div class="title">{o.admin}</div><div class="sub">Admin{o.admin === myEmail() ? ' (bạn)' : ''}</div></div></div>
      {list.map(([e, role]) => <div class="item" style="cursor:default">
        <div class="grow"><div class="title">{e}</div></div>
        <select aria-label={'Quyền của ' + e} style="width:auto" value={role} onChange={ev => {
          const v = (ev.target as HTMLSelectElement).value
          if (v === 'remove') { if (confirm(`Xoá ${e} khỏi nhóm?`)) setRole(e, null); else (ev.target as HTMLSelectElement).value = role }
          else setRole(e, v as 'editor' | 'viewer')
        }}>
          <option value="editor">Được sửa</option><option value="viewer">Chỉ xem</option><option value="remove">Xoá khỏi nhóm</option>
        </select>
      </div>)}
    </div>
    <form class="card stack" onSubmit={e => { e.preventDefault(); setRole(email, r); setEmail('') }}>
      <label class="field"><span>Thêm Gmail</span><input type="email" required placeholder="ten@gmail.com" value={email} onInput={e => setEmail((e.target as HTMLInputElement).value)} /></label>
      <div class="row">
        <select aria-label="Quyền" value={r} onChange={e => setR((e.target as HTMLSelectElement).value as 'editor' | 'viewer')} style="width:auto"><option value="viewer">Chỉ xem</option><option value="editor">Được sửa</option></select>
        <button class="btn primary">Thêm</button>
      </div>
    </form>
  </div>
}
