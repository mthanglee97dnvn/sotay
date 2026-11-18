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
