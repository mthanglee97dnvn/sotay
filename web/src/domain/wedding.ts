import type { Wedding, Task } from './types'
import { norm } from './search'
import { consultDue } from './consult'
import { deliveryStatus } from './delivery'
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
    late: ws.filter(w => deliveryStatus(w, 'photo', now) === 'late' || deliveryStatus(w, 'video', now) === 'late').length,
    today: tasks.filter(t => !t.done && t.due != null && todayVN(new Date(t.due)) === today).length,
    newForms,
  }
}

export const channelUrl = (w: Wedding) => w.channel?.url || (w.channel?.kind === 'fanpage' ? FANPAGE_INBOX : '')

export const CHANNELS: [Wedding['channel']['kind'], string][] = [['fanpage', 'Fanpage'], ['fb', 'Facebook cá nhân'], ['zalo', 'Zalo'], ['instagram', 'Instagram'], ['other', 'Khác']]
