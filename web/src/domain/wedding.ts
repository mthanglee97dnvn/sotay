import type { Wedding, Task } from './types'
import { norm } from './search'
import { consultDue } from './consult'
import { todayVN } from './vn-date'

export const FANPAGE_INBOX = 'https://business.facebook.com/latest/inbox/all'

export const emptyWedding = (email: string): Wedding => ({
  id: '', kind: 'Cưới', date: '', bride: '', groom: '', phoneBride: '', phoneGroom: '',
  addrBride: '', addrGroom: '', addrRest: '', times: {}, channel: { kind: 'fanpage', url: '' }, notes: '',
  hasVideo: false, consultDone: false, photo: { link: '', history: [] }, video: { link: '', history: [] },
  coupleKey: '', createdByEmail: email, updatedAt: 0,
})

/** Draft for another ceremony of the same couple. */
export function siblingDraft(w: Wedding): Partial<Wedding> {
  const { bride, groom, phoneBride, phoneGroom, channel, coupleKey, addrBride, addrGroom } = w
  return { bride, groom, phoneBride, phoneGroom, channel: { ...channel }, coupleKey: coupleKey || norm(bride + '|' + groom), addrBride, addrGroom }
}

export const withCoupleKey = (w: Wedding): Wedding =>
  w.coupleKey ? w : { ...w, coupleKey: norm(w.bride) + '|' + norm(w.groom) }

export function upcomingChips(ws: Wedding[], tasks: Task[], leadDays: number, newForms: number, now: Date = new Date()) {
  const today = todayVN(now)
  return {
    consult: ws.filter(w => consultDue(w, leadDays, now)).length,
    today: tasks.filter(t => !t.done && t.due != null && todayVN(new Date(t.due)) === today).length,
    newForms,
  }
}

export const channelUrl = (w: Wedding) => w.channel?.url || (w.channel?.kind === 'fanpage' ? FANPAGE_INBOX : '')

export const CHANNELS: [Wedding['channel']['kind'], string][] = [['fanpage', 'Fanpage'], ['fb', 'Facebook cá nhân'], ['zalo', 'Zalo'], ['instagram', 'Instagram'], ['other', 'Khác']]

/** Only the top-level fields that differ, so a save never overwrites other people's changes to untouched fields. */
export function diffPatch<T extends object>(before: T, after: T): Partial<T> {
  const p: Partial<T> = {}
  for (const k of Object.keys(after) as (keyof T)[]) if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) p[k] = after[k]
  return p
}
