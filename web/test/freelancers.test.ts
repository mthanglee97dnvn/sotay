import { describe, it, expect } from 'vitest'
import { askMessage, messengerUrl, openUrl, forJob } from '../src/domain/freelancers'
import type { Freelancer } from '../src/domain/types'

const f = (name: string, does: Freelancer['does']): Freelancer => ({ id: name, name, fb: '', does, note: '', updatedAt: 0 })

describe('askMessage', () => {
  it('uses anh Thắng’s wording, with the day and job slotted in when chosen', () => {
    expect(askMessage({})).toBe('Hí Lô Ae, ngày này bên Thén đang cần tìm thợ, Ae còn rảnh lịch không báo giúp Thén để nhận lịch nhé')
    expect(askMessage({ date: '2026-11-28', job: 'chup' })).toBe('Hí Lô Ae, ngày Thứ Bảy 28/11 bên Thén đang cần tìm thợ chụp, Ae còn rảnh lịch không báo giúp Thén để nhận lịch nhé')
    expect(askMessage({ date: '2026-11-28', job: 'quay' })).toContain('tìm thợ quay,')
    expect(askMessage({ job: 'chup' })).toContain('ngày này bên Thén đang cần tìm thợ chụp,')
  })
})

describe('messengerUrl / openUrl', () => {
  it('turns Facebook profile links of any shape into an m.me chat link', () => {
    expect(messengerUrl('https://www.facebook.com/minhtuan.photo')).toBe('https://m.me/minhtuan.photo')
    expect(messengerUrl('fb.com/minhtuan.photo/?ref=x')).toBe('https://m.me/minhtuan.photo')
    expect(messengerUrl('https://m.facebook.com/profile.php?id=1000123')).toBe('https://m.me/1000123')
    expect(messengerUrl('minhtuan.photo')).toBe('https://m.me/minhtuan.photo')
    expect(messengerUrl(' https://facebook.com/minhtuan.photo/ ')).toBe('https://m.me/minhtuan.photo')
  })
  it('gives up on links that are not a person, or empty', () => {
    expect(messengerUrl('https://www.facebook.com/groups/abc')).toBeNull()
    expect(messengerUrl('')).toBeNull()
    expect(openUrl('https://www.facebook.com/groups/abc')).toBe('https://www.facebook.com/groups/abc')
    expect(openUrl('')).toBeNull()
    expect(openUrl('minhtuan.photo')).toBe('https://m.me/minhtuan.photo')
  })
})

describe('forJob', () => {
  it('puts thợ who do the job first (cả hai fits both), then by name', () => {
    const list = [f('Cường', 'quay'), f('Bình', 'chup'), f('An', 'ca')]
    expect(forJob(list, 'chup').map(x => [x.f.name, x.fit])).toEqual([['An', true], ['Bình', true], ['Cường', false]])
    expect(forJob(list, 'quay').map(x => [x.f.name, x.fit])).toEqual([['An', true], ['Cường', true], ['Bình', false]])
    expect(forJob(list).every(x => x.fit)).toBe(true)
  })
})
