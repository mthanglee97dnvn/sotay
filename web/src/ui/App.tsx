import { me, role } from '../data/org'
import { SignIn, NotInvited } from './Gate'
import { Shell, tab, type FabAction } from './Shell'
import { More } from './More'
import { Upcoming } from './Upcoming'
import { WeddingSheet } from './WeddingSheet'
import { openWedding } from './sheets'

export function App() {
  if (me.value === 'loading' || (me.value && role.value === 'loading')) return <main class="boot">Đang mở…</main>
  if (!me.value) return <SignIn />
  if (!role.value) return <NotInvited />
  const fab: FabAction[] = [
    { label: 'Thêm lễ', run: () => (openWedding.value = { draft: {} }) },
  ]
  return <Shell badges={{}} fab={fab}>
    {tab.value === 'upcoming' && <Upcoming tasks={[]} newForms={0} />}
    {tab.value === 'more' && <More />}
    {(tab.value === 'tasks' || tab.value === 'store') && <main class="page"><h1>…</h1></main>}
    {openWedding.value && <WeddingSheet key={JSON.stringify(openWedding.value)} />}
  </Shell>
}
