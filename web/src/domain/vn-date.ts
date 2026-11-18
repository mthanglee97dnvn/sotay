const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' })
const DAY = 86400000

/** Today's date in Vietnam as YYYY-MM-DD, whatever the device time zone. */
export const todayVN = (now: Date = new Date()): string => fmt.format(now)

const utc = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10))

/** Calendar days from Vietnam-today to `date` (negative if past). */
export const daysUntil = (date: string, now: Date = new Date()): number =>
  Math.round((utc(date) - utc(todayVN(now))) / DAY)

export const addDays = (date: string, n: number): string => new Date(utc(date) + n * DAY).toISOString().slice(0, 10)

export const dmy = (date: string) => date ? `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}` : ''
export const dm = (date: string) => dmy(date).slice(0, 5)

const WD = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
export const weekday = (date: string) => WD[new Date(utc(date)).getUTCDay()]

const WD_LONG = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
/** "Thứ Ba, 17/11/2026": shown under date boxes, since browsers may display them as mm/dd. */
export const dateLong = (date: string) => date ? `${WD_LONG[new Date(utc(date)).getUTCDay()]}, ${dmy(date)}` : ''

/** Epoch ms of a Vietnam wall-clock time. */
export const vnTime = (date: string, hhmm = '00:00') => new Date(`${date}T${hhmm}:00+07:00`).getTime()
