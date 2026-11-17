import { useState } from 'preact/hooks'
import { isAdmin, me, signOut } from '../data/org'
import { Members } from './Members'

type Sub = 'menu' | 'members'
export function More() {
  const [sub, setSub] = useState<Sub>('menu')
  const m = me.value
  if (sub === 'members') return <main class="page"><button class="btn ghost sm" onClick={() => setSub('menu')}>‹ Thêm</button><h1>Thành viên</h1><Members /></main>
  return <main class="page">
    <h1>Thêm</h1>
    <div class="list">
      {isAdmin() && <button class="item" onClick={() => setSub('members')}><div class="grow title">Thành viên</div></button>}
    </div>
    <h2>Tài khoản</h2>
    <div class="card row"><div class="grow small">{m && m !== 'loading' ? m.email : ''}</div><button class="btn sm" onClick={signOut}>Đăng xuất</button></div>
  </main>
}
