import { me, role, canEdit, isAdmin, myEmail, orgDoc } from '../data/org'
import { isMine } from '../domain/tasks'
import { SignIn, NotInvited } from './Gate'
import { Shell, tab, type FabAction } from './Shell'
import { Upcoming } from './Upcoming'
import { IRefresh } from './icons'
import { openWedding, openInvites, openTask, copyText } from './sheets'
import { toast } from './toast'
import { timelineNote } from '../domain/note'
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
const Prices = lazy(() => import('./Prices').then(m => m.Prices))
const Payroll = lazy(() => import('./Payroll').then(m => m.Payroll))
const WeddingSheet = lazy(() => import('./WeddingSheet').then(m => m.WeddingSheet))
const InvitesSheet = lazy(() => import('./Invites').then(m => m.InvitesSheet))
const SendFormSheet = lazy(() => import('./Invites').then(m => m.SendFormSheet))
const ImportOld = lazy(() => import('./ImportOld').then(m => m.ImportOld))
const Freelancers = lazy(() => import('./Freelancers').then(m => m.Freelancers))
const FreelancerSheet = lazy(() => import('./Freelancers').then(m => m.FreelancerSheet))
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
  // A compact pill in the masthead: short state on the pill, the full line (counts, warnings) on hover and for screen readers.
  const busy = st.startsWith('Đang')
  const bad = st.startsWith('Chưa') || st.includes('Không đọc') || st.includes('Nhiều lễ')
  const label = busy ? 'Đang đồng bộ…' : st.startsWith('Đã đồng bộ lúc') ? 'Đã đồng bộ ' + st.slice(15, 20) : st ? 'Thử đồng bộ lại' : 'Đồng bộ lịch'
  return <>
    <button class={'syncbtn' + (bad ? ' bad' : '') + (busy ? ' busy' : '')} data-calsync title={st || 'Đồng bộ lịch Google'} aria-label={st ? `${st}. Bấm để đồng bộ lại` : 'Đồng bộ lịch Google'}
      disabled={busy} onClick={() => calMod!.syncCalendars(true)}><IRefresh size={18} /></button>
    {st && <small class={'syncst' + (bad ? ' bad' : '')}>{bad ? st : label}</small>}
  </>
}
const ALL = [More, Tasks, TaskSheet, WeddingSheet, InvitesSheet, SendFormSheet, Freelancers, Prices]

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
  return <Shell badges={{ upcoming: newInvites.value.length }} fab={fab}>
    {tab.value === 'upcoming' && <Upcoming calBar={<CalBar />} tasks={tasks.value.filter(t => isMine(t, myEmail(), (o => o && o !== 'loading' ? o.admin : '')(orgDoc.value)))} newForms={newInvites.value.length} updatedForms={newInvites.value.filter(i => i.appliedAt).length} />}
    {tab.value === 'more' && <More importer={isAdmin() ? <ImportOld /> : undefined} />}
    {tab.value === 'tasks' && <Tasks />}
    {tab.value === 'prices' && <Prices />}
    {tab.value === 'payroll' && isAdmin() && <Payroll />}
    {tab.value === 'crew' && <><Freelancers /><FreelancerSheet /></>}
    {openWedding.value && <WeddingSheet key={JSON.stringify(openWedding.value)} extra={w => canEdit() && <div class="sheet-acts">
      <button class="btn" onClick={() => (sendForm.value = { wedding: w })}>Gửi phiếu cho khách điền</button>
      <button class="btn ghost" onClick={async () => (await copyText(timelineNote(w))) ? toast('Đã copy ghi chú') : toast('Không copy được ghi chú', true)}>Copy ghi chú</button>
    </div>} />}
    {openTask.value && <TaskSheet key={JSON.stringify(openTask.value)} />}
    {openInvites.value && <InvitesSheet />}
    {sendForm.value && <SendFormSheet key={JSON.stringify(sendForm.value)} />}
  </Shell>
}
