import type { Wedding, Task } from './types'
import { consultDue } from './consult'
import { worst } from './store'
import { todayVN } from './vn-date'

export function summarize(ws: Wedding[], tasks: Task[], leadDays: number, now: Date = new Date()) {
  const t = todayVN(now)
  let y = +t.slice(0, 4), m = +t.slice(5, 7)
  const byMonth: { month: string; count: number }[] = []
  for (let i = 0; i < 6; i++) {
    const key = `${y}-${String(m).padStart(2, '0')}`
    byMonth.push({ month: `${key.slice(5)}/${y}`, count: ws.filter(w => w.date.startsWith(key)).length })
    if (++m > 12) { m = 1; y++ }
  }
  const past = ws.filter(w => w.date && w.date < t)
  return {
    byMonth,
    consultDue: ws.filter(w => consultDue(w, leadDays, now)).length,
    late: past.filter(w => worst(w, now) === 'late').length,
    dueSoon: past.filter(w => worst(w, now) === 'due-soon').length,
    openTasks: tasks.filter(x => !x.done).length,
  }
}
