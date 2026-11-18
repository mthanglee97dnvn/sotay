import { describe, it, expect } from 'vitest'
import { roleOf, setRoleLocal, writeErrorMessage } from '../src/domain/roles'

const org = { admin: 'a@x.com', roles: { 'b@x.com': 'viewer' as const } }

describe('roles', () => {
  it('roleOf is case-insensitive', () => {
    expect(roleOf(org, 'B@X.com')).toBe('viewer')
    expect(roleOf(org, 'A@x.com')).toBe('admin')
    expect(roleOf(org, 'z@x.com')).toBe(null)
    expect(roleOf(null, 'a@x.com')).toBe(null)
  })
  it('setRoleLocal lowercases, removes, and caps at 20 people', () => {
    expect(setRoleLocal(org, ' C@x.com ', 'editor').roles).toEqual({ 'b@x.com': 'viewer', 'c@x.com': 'editor' })
    expect(setRoleLocal(org, 'b@x.com', null).roles).toEqual({})
    const full = { admin: 'a@x.com', roles: Object.fromEntries(Array.from({ length: 19 }, (_, i) => [`p${i}@x.com`, 'viewer' as const])) }
    expect(() => setRoleLocal(full, 'new@x.com', 'viewer')).toThrow('Nhóm đã đủ 20 người. Xoá bớt người cũ rồi thêm người mới')
    expect(setRoleLocal(full, 'p1@x.com', 'editor').roles['p1@x.com']).toBe('editor')
  })
  it('rejects the admin email and non-emails', () => {
    expect(() => setRoleLocal(org, 'A@x.com', 'viewer')).toThrow()
    expect(() => setRoleLocal(org, 'not-an-email', 'viewer')).toThrow('Gmail chưa đúng, kiểm tra lại địa chỉ (vd: ten@gmail.com)')
  })
  it('maps permission-denied to a Vietnamese message', () => {
    expect(writeErrorMessage({ code: 'permission-denied' })).toBe('Bạn chỉ có quyền xem – thay đổi chưa được lưu')
    expect(writeErrorMessage(new Error('x'))).toContain('Chưa lưu được')
  })
})
