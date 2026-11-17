import { me, role } from '../data/org'
import { SignIn, NotInvited } from './Gate'
import { Shell, tab } from './Shell'
import { More } from './More'

export function App() {
  if (me.value === 'loading' || (me.value && role.value === 'loading')) return <main class="boot">Đang mở…</main>
  if (!me.value) return <SignIn />
  if (!role.value) return <NotInvited />
  return <Shell badges={{}} fab={[]}>
    {tab.value === 'more' ? <More /> : <main class="page"><h1>Sổ Tay</h1></main>}
  </Shell>
}
