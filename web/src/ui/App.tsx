import { me, role, canEdit } from '../data/org'
import { SignIn, NotInvited } from './Gate'
import { Shell, tab, type FabAction } from './Shell'
import { More } from './More'
import { Upcoming } from './Upcoming'
import { WeddingSheet } from './WeddingSheet'
import { openWedding, openInvites } from './sheets'
import { InvitesSheet, SendFormSheet, sendForm } from './Invites'
import { newInvites } from '../data/invites'

export function App() {
  if (me.value === 'loading' || (me.value && role.value === 'loading')) return <main class="boot">Đang mở…</main>
  if (!me.value) return <SignIn />
  if (!role.value) return <NotInvited />
  const fab: FabAction[] = [
    { label: 'Thêm việc', run: () => {} },
    { label: 'Gửi phiếu cho khách', run: () => (sendForm.value = {}) },
    { label: 'Thêm lễ', run: () => (openWedding.value = { draft: {} }) },
  ]
  return <Shell badges={{ upcoming: newInvites.value.length }} fab={fab}>
    {tab.value === 'upcoming' && <Upcoming tasks={[]} newForms={newInvites.value.length} />}
    {tab.value === 'more' && <More />}
    {(tab.value === 'tasks' || tab.value === 'store') && <main class="page"><h1>…</h1></main>}
    {openWedding.value && <WeddingSheet key={JSON.stringify(openWedding.value)} extra={w => canEdit() && <button class="btn" onClick={() => (sendForm.value = { wedding: w })}>Gửi phiếu cho khách điền</button>} />}
    {openInvites.value && <InvitesSheet />}
    {sendForm.value && <SendFormSheet key={JSON.stringify(sendForm.value)} />}
  </Shell>
}
