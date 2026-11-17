import type { Task } from './types'
import { todayVN } from './vn-date'
import { lower } from './roles'

export function groupTasks(ts: Task[], now: Date = new Date()) {
  const today = todayVN(now)
  const g = { late: [] as Task[], today: [] as Task[], upcoming: [] as Task[], noDate: [] as Task[], done: [] as Task[] }
  for (const t of ts) {
    if (t.done) g.done.push(t)
    else if (t.due == null) g.noDate.push(t)
    else {
      const d = todayVN(new Date(t.due))
      if (d < today) g.late.push(t)
      else if (d === today) g.today.push(t)
      else g.upcoming.push(t)
    }
  }
  const byDue = (a: Task, b: Task) => (a.due ?? 0) - (b.due ?? 0)
  g.late.sort(byDue); g.today.sort(byDue); g.upcoming.sort(byDue)
  g.noDate.sort((a, b) => b.updatedAt - a.updatedAt); g.done.sort((a, b) => b.updatedAt - a.updatedAt)
  return g
}

/** Whose calendar a task's reminder belongs to: assignee, else creator, else admin. */
export function isMine(t: Task, me: string, admin: string): boolean {
  const m = lower(me)
  if (t.assigneeEmail) return lower(t.assigneeEmail) === m
  if (t.createdByEmail) return lower(t.createdByEmail) === m
  return lower(admin) === m
}
