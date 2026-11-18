import { me, role, canEdit, isAdmin, myEmail, orgDoc } from '../data/org'
import { isMine } from '../domain/tasks'
import { weddings } from '../data/weddings'
import { deliveryStatus } from '../domain/delivery'
import { SignIn, NotInvited } from './Gate'
import { Shell, tab, type FabAction } from './Shell'
import { Upcoming } from './Upcoming'
import { openWedding, openInvites, openTask } from './sheets'
import { tasks } from '../data/tasks'
import '../data/alarms'
import { sendForm } from './sendForm'
import { newInvites } from '../data/invites'

import { lazy } from './lazy'
import { useEffect } from 'preact/hooks'
import { signal, effect } from '@preact/signals'

const More = lazy(() => import('./More').then(m => m.More))
const Tasks = lazy(() => import('./Tasks').then(m => m.Tasks))
const TaskSheet = lazy(() => import('./Tasks').then(m => m.TaskSheet))
const WeddingSheet = lazy(() => import('./WeddingSheet').then(m => m.WeddingSheet))
const InvitesSheet = lazy(() => import('./Invites').then(m => m.InvitesSheet))
const SendFormSheet = lazy(() => import('./Invites').then(m => m.SendFormSheet))
const ImportOld = lazy(() => import('./ImportOld').then(m => m.ImportOld))
const Unmatched = lazy(() => import('./Unmatched').then(m => m.UnmatchedList))
const Store = lazy(() => import('./Store').then(m => m.Store))
// Calendar sync code loads only for people who turned it on (or when they open Thêm).
if (localStorage.getItem('sotay2-gcal') === '1') import('../data/gcal')
// Calendar sync: admin only, loaded on demand.
type CalMod = typeof import('../data/calsync')
let calMod: CalMod | null = null
const calReady = signal(false)
effect(() => {
  if (role.value !== 'admin' || calMod) return
  import('../data/calsync').then(m => { calMod = m; m.startCalendarSync(); calReady.value = true })
})
function CalBar() {
  if (!calReady.value || !calMod) return null
  const st = calMod.calStatus.value
  return <div class="row small muted" style="margin:-6px 0 12px">
    <span class="grow">{st || 'Lịch Google chưa đồng bộ'}</span>
    <button class="btn ghost sm" data-calsync onClick={() => calMod!.syncCalendars(true)}>Đồng bộ lịch</button>
  </div>
}
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
    {tab.value === 'upcoming' && <Upcoming calBar={<CalBar />} tasks={tasks.value.filter(t => isMine(t, myEmail(), (o => o && o !== 'loading' ? o.admin : '')(orgDoc.value)))} newForms={newInvites.value.length} />}
    {tab.value === 'more' && <More importer={isAdmin() ? <ImportOld /> : undefined} />}
    {tab.value === 'tasks' && <Tasks />}
    {tab.value === 'store' && <Store extra={canEdit() && <Unmatched />} />}
    {openWedding.value && <WeddingSheet key={JSON.stringify(openWedding.value)} extra={w => canEdit() && <button class="btn" onClick={() => (sendForm.value = { wedding: w })}>Gửi phiếu cho khách điền</button>} />}
    {openTask.value && <TaskSheet key={JSON.stringify(openTask.value)} />}
    {openInvites.value && <InvitesSheet />}
    {sendForm.value && <SendFormSheet key={JSON.stringify(sendForm.value)} />}
  </Shell>
}
