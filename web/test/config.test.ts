import { describe, it, expect } from 'vitest'
import cfg from '../vite.config'

describe('vite config', () => {
  it('serves from the domain root (sotay.mthangleestudio.com) with app and public form entries', () => {
    const c = (typeof cfg === 'function' ? (cfg as any)({ mode: 'test', command: 'build' }) : cfg) as any
    expect(c.base).toBe('/')
    const inp = c.build.rollupOptions.input
    expect(Object.keys(inp).sort()).toEqual(['form', 'index'])
  })
})

describe('bundle size', () => {
  it('replaces the regex engine Firestore only needs for pipeline queries (unused here)', async () => {
    const c = (cfg as any)({ mode: 'production', command: 'build' })
    expect(c.resolve.alias.re2js).toMatch(/stubs\/re2js\.ts$/)
    const { RE2JS } = await import('../src/stubs/re2js')
    expect(() => RE2JS.compile('x')).toThrow(/không dùng/)
  })
})
