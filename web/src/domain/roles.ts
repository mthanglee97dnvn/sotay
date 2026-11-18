import type { Org, Role } from './types'

export const lower = (e: string) => (e || '').trim().toLowerCase()
export const MAX_PEOPLE = 20

export function roleOf(org: Org | null | undefined, email: string): Role | null {
  if (!org) return null
  const e = lower(email)
  if (lower(org.admin) === e) return 'admin'
  return org.roles?.[e] ?? null
}

/** Returns a new org with `email` set to `role` (null removes). */
export function setRoleLocal(org: Org, email: string, role: 'editor' | 'viewer' | null): Org {
  const e = lower(email)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new Error('Gmail chưa đúng, kiểm tra lại địa chỉ (vd: ten@gmail.com)')
  if (e === lower(org.admin)) throw new Error('Không đổi được quyền của admin')
  const roles = { ...org.roles }
  if (role === null) delete roles[e]
  else {
    if (!(e in roles) && Object.keys(roles).length + 1 >= MAX_PEOPLE) throw new Error('Nhóm đã đủ 20 người. Xoá bớt người cũ rồi thêm người mới')
    roles[e] = role
  }
  return { ...org, roles }
}

export function writeErrorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code
  if (code === 'permission-denied') return 'Bạn chỉ có quyền xem – thay đổi chưa được lưu'
  return 'Chưa lưu được, kiểm tra mạng rồi thử lại'
}
