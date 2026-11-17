import { me, role, canEdit, myEmail, orgDoc } from '../data/org'
import { isMine } from '../domain/tasks'
import { weddings } from '../data/weddings'
import { deliveryStatus } from '../domain/delivery'
import { SignIn, NotInvited } from './Gate'
import { Shell, tab, type FabAction } from './Shell'
import { Upcoming } from './Upcoming'
import { openWedding, openInvites, openTask } from './sheets'
import { tasks } from '../data/tasks'
import '../data/gcal'
import '../data/alarms'
import { sendForm } from './sendForm'
import { newInvites } from '../data/invites'

import { lazy } from './lazy'
import { useEffect } from 'preact/hooks'

const More = lazy(() => import('./More').then(m => m.More))
const Tasks = lazy(() => import('./Tasks').then(m => m.Tasks))
const TaskSheet = lazy(() => import('./Tasks').then(m => m.TaskSheet))
const WeddingSheet = lazy(() => import('./WeddingSheet').then(m => m.WeddingSheet))
const InvitesSheet = lazy(() => import('./Invites').then(m => m.InvitesSheet))
const SendFormSheet = lazy(() => import('./Invites').then(m => m.SendFormSheet))
const Store = lazy(() => import('./Store').then(m => m.Store))
const ALL = [Store, More, Tasks, TaskSheet, WeddingSheet, InvitesSheet, SendFormSheet]

export function App() {
  useEffect(() => { const t = setTimeout(() => ALL.forEach(c => c.prefetch()), 1500); return () => clearTimeout(t) }, [])
  if (me.value === 'loading' || (me.value && role.value === 'loading')) return <main class="boot">Đang mở…</main>
  if (!me.value) return <SignIn />
  if (!role.value) return <NotInvited />
  const fab: FabAction[] = [
    { label: 'Thêm việc', run: () => (openTask.value = { draft: {} }) },
    { label: 'Gửi phiếu cho khách', run: () => (sendForm.value = {}) },
    { label: 'Thêm lễ', run: () => (openWedding.value = { draft: {} }) },
  ]
  return <Shell badges={{ upcoming: newInvites.value.length, store: weddings.value.filter(w => deliveryStatus(w, 'photo') === 'late' || deliveryStatus(w, 'video') === 'late').length }} fab={fab}>
    {tab.value === 'upcoming' && <Upcoming tasks={tasks.value.filter(t => isMine(t, myEmail(), (o => o && o !== 'loading' ? o.admin : '')(orgDoc.value)))} newForms={newInvites.value.length} />}
    {tab.value === 'more' && <More />}
    {tab.value === 'tasks' && <Tasks />}
    {tab.value === 'store' && <Store />}
    {openWedding.value && <WeddingSheet key={JSON.stringify(openWedding.value)} extra={w => canEdit() && <button class="btn" onClick={() => (sendForm.value = { wedding: w })}>Gửi phiếu cho khách điền</button>} />}
    {openTask.value && <TaskSheet key={JSON.stringify(openTask.value)} />}
    {openInvites.value && <InvitesSheet />}
    {sendForm.value && <SendFormSheet key={JSON.stringify(sendForm.value)} />}
  </Shell>
}
