export type Role = 'admin' | 'editor' | 'viewer'
export type Kind = 'Cưới' | 'Đính hôn' | 'Tiệc báo hỷ'
export const KINDS: Kind[] = ['Cưới', 'Đính hôn', 'Tiệc báo hỷ']
export type ChannelKind = 'fanpage' | 'fb' | 'zalo' | 'instagram' | 'other'
export type TimeKey = 'tMakeup' | 'tDepart' | 'tArrive' | 'tRuoc' | 'tWelcome' | 'tParty'

export interface Product { link: string; history: { link: string; at: number }[]; deliveredAt?: number }

export interface Wedding {
  id: string
  kind: Kind
  date: string // YYYY-MM-DD
  bride: string
  groom: string
  phoneBride: string
  phoneGroom: string
  addrBride: string
  addrGroom: string
  addrRest: string
  times: Partial<Record<TimeKey, string>>
  channel: { kind: ChannelKind; url: string }
  notes: string
  hasVideo: boolean
  consultDone: boolean
  photo: Product
  video: Product
  coupleKey: string
  createdByEmail: string
  updatedAt: number
  /** Set when the profile comes from a Google Calendar booking. */
  source?: { cal: string; eventId: string; bookingId: string; title: string }
  cancelled?: boolean
  calNote?: string
  syncSig?: string
  /** Fields the calendar filled; locked in the app and cleared if removed from the calendar. */
  calFields?: string[]
}

export interface Task {
  id: string
  title: string
  body: string
  due: number | null
  done: boolean
  weddingId: string | null
  assigneeEmail: string | null
  createdByEmail: string
  updatedAt: number
}

export interface Org {
  admin: string
  roles: Record<string, 'editor' | 'viewer'>
  consultLeadDays?: number
  framevisCalId?: string
  createdAt?: number
}

export type InviteStatus = 'open' | 'submitted' | 'applied'
export interface Invite {
  token: string
  org: string
  weddingId: string
  kind: Kind
  status: InviteStatus
  answers: Record<string, string>
  submittedAt?: unknown
  seen: boolean
  createdByEmail: string
  createdAt?: unknown
  appliedAt?: unknown
  appliedSig?: string
  notifiedSig?: string
}

export interface Unmatched { id: string; name: string; day: string; link: string; video: string; raw?: unknown }

export const coupleName = (w: Pick<Wedding, 'bride' | 'groom'>) =>
  [w.bride, w.groom].map(s => (s || '').trim()).filter(Boolean).join(' & ') || 'Chưa có tên'

/** A freelancer the studio can ask when the ekip is fully booked. */
export type Job = 'chup' | 'quay' | 'ca'
export interface Freelancer { id: string; name: string; fb: string; does: Job; note: string; updatedAt: number }
