import { describe, it, expect } from 'vitest'
import { readChoice, resolveTheme } from '../src/theme'

const store = (v: string | null) => ({ getItem: () => v })

describe('theme choice', () => {
  it('reads a stored light or dark choice', () => {
    expect(readChoice(store('dark'))).toBe('dark')
    expect(readChoice(store('light'))).toBe('light')
  })
  it('treats unknown or missing values as auto', () => {
    expect(readChoice(store('purple'))).toBe('auto')
    expect(readChoice(store(null))).toBe('auto')
  })
  it('treats storage that throws (private mode) as auto', () => {
    expect(readChoice({ getItem: () => { throw new Error('denied') } })).toBe('auto')
  })
  it('auto follows the device; light and dark override it', () => {
    expect(resolveTheme('auto', true)).toBe('dark')
    expect(resolveTheme('auto', false)).toBe('light')
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })
})
