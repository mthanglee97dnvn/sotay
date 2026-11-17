import { effect } from '@preact/signals'
import { tasks } from './tasks'
import { myEmail, orgDoc } from './org'
import { isMine } from '../domain/tasks'
import { toast } from '../ui/toast'

// While the app is open: a toast (and a system notification if allowed) at each of my tasks' due time.
const timers = new Map<string, ReturnType<typeof setTimeout>>()
effect(() => {
  const o = orgDoc.value
  const admin = o && o !== 'loading' ? o.admin : ''
  const now = Date.now()
  timers.forEach(clearTimeout); timers.clear()
  for (const t of tasks.value) {
    if (t.done || t.due == null || t.due <= now || t.due - now > 12 * 3600e3 || !isMine(t, myEmail(), admin)) continue
    timers.set(t.id, setTimeout(() => {
      toast('Đến giờ: ' + t.title)
      if ('Notification' in window && Notification.permission === 'granted') { try { new Notification('Sổ Tay Nhắc Việc', { body: t.title, tag: t.id }) } catch { /* iOS without home-screen app */ } }
    }, t.due - now))
  }
})
