import { coupleName, type Wedding } from './types'
import { daysUntil, dmy, dm } from './vn-date'
import { deadline, type Part } from './delivery'

export const DEFAULT_LEAD_DAYS = 45

export function consultDue(w: Wedding, leadDays: number, now: Date = new Date()): boolean {
  if (w.consultDone) return false
  const d = daysUntil(w.date, now)
  return d >= 1 && d <= leadDays
}

const countdown = (n: number) => n >= 14 ? `${Math.round(n / 7)} tuần` : `${n} ngày`
const eventWord = (w: Wedding) => w.kind === 'Đính hôn' ? 'lễ đính hôn' : w.kind === 'Tiệc báo hỷ' ? 'tiệc báo hỷ' : 'ngày cưới'

// Template from the old app (src/app.html CONSULT_MSG); first clause rephrased so the countdown leads.
export function consultMessage(w: Wedding, now: Date = new Date()): string {
  const n = Math.max(0, daysUntil(w.date, now))
  return `Chào bạn! Mình bên MThanglee Studio đây 😊 Còn khoảng ${countdown(n)} nữa là tới ${eventWord(w)} của hai bạn (${dmy(w.date)}) rồi. ` +
    `Mình muốn hẹn hai bạn một buổi tư vấn ngắn (gọi online hoặc cà phê) để cùng chốt lịch trình, những khoảnh khắc hai bạn muốn lưu giữ và các lưu ý cho ngày vui. ` +
    `Tuần này hoặc tuần sau bạn rảnh hôm nào thì nhắn mình nhé!`
}

/** Message the admin pastes into Framevis/Zalo to remind the ekip of a delivery. */
export function ekipReminder(w: Wedding, part: Part, now: Date = new Date()): string {
  const what = part === 'photo' ? 'ảnh' : 'video'
  const dl = deadline(w, part)
  const left = daysUntil(dl, now)
  const when = left < 0 ? `đã trễ ${-left} ngày` : left === 0 ? 'hạn là hôm nay' : `còn ${left} ngày`
  return `Nhắc giao ${what}: ${coupleName(w)} – ${w.kind} ${dmy(w.date)}. Hạn giao ${dm(dl)} (${when}). Xong thì gửi link vào nhóm giúp mình nhé!`
}
