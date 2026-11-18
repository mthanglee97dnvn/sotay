import { me, signIn, signOut } from '../data/org'
import { Sky, Logo } from './Sky'

export function SignIn() {
  return <><Sky /><main class="gate"><Logo />
    <h1>Sổ Tay Nhắc Việc</h1>
    <p class="muted">MThanglee Studio. Đăng nhập bằng Gmail để xem lịch cưới, việc cần làm và kho sản phẩm.</p>
    <button class="btn primary" onClick={signIn}>Đăng nhập bằng Google</button>
  </main></>
}

export function NotInvited() {
  const m = me.value
  return <><Sky /><main class="gate"><Logo />
    <h1>Bạn chưa được mời</h1>
    <p class="muted">Gmail <b>{m && m !== 'loading' ? m.email : ''}</b> chưa có trong nhóm. Nhờ anh Thắng thêm Gmail này rồi mở lại app.</p>
    <button class="btn" onClick={signOut}>Đăng xuất</button>
  </main></>
}
