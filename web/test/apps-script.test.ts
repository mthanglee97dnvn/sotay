import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import vm from 'node:vm'

const root = new URL('../', import.meta.url).pathname
let code = ''
beforeAll(() => {
  execSync('node scripts/build-apps-script.mjs', { cwd: root, stdio: 'pipe' })
  code = readFileSync(new URL('../../tools/apps-script/Code.gs', import.meta.url), 'utf8')
})

const sv = (s: string) => ({ stringValue: s })
const inviteDoc = (id: string, answers: Record<string, string> | null, extra: Record<string, unknown> = {}) => ({
  document: {
    name: `projects/sotay-mthanglee/databases/(default)/documents/invites/${id}`,
    fields: {
      org: sv('mthanglee'), kind: sv('Cưới'), status: sv('submitted'),
      ...(answers ? { answers: { mapValue: { fields: Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, sv(v)])) } } } : {}),
      ...extra,
    },
  },
})

function sandbox(docs: unknown[], opts: { mailThrows?: boolean } = {}) {
  const mails: { subject: string }[] = [], patches: { url: string; body: any }[] = [], logs: string[] = []
  const store = { docs }
  const ctx: any = {
    ScriptApp: { getOAuthToken: () => 'tok', getProjectTriggers: () => [], newTrigger: () => ({ timeBased: () => ({ everyMinutes: () => ({ create: () => ({}) }) }) }), deleteTrigger: () => {} },
    Session: { getEffectiveUser: () => ({ getEmail: () => 'admin@x.com' }) },
    Logger: { log: (m: string) => logs.push(String(m)) },
    MailApp: { sendEmail: (m: any) => { if (opts.mailThrows) throw new Error('quota'); mails.push(m) } },
    UrlFetchApp: {
      fetch: (url: string, o: any) => {
        if (url.endsWith(':runQuery')) return { getResponseCode: () => 200, getContentText: () => JSON.stringify(store.docs) }
        patches.push({ url, body: JSON.parse(o.payload) })
        // reflect the patch so a second run sees it
        const id = decodeURIComponent(url.split('/invites/')[1].split('?')[0])
        const d: any = (store.docs as any[]).find(x => x.document?.name.endsWith('/' + id))
        if (d) d.document.fields.notifiedSig = JSON.parse(o.payload).fields.notifiedSig
        return { getResponseCode: () => 200, getContentText: () => '{}' }
      },
    },
  }
  vm.createContext(ctx)
  vm.runInContext(code, ctx)
  return { ctx, mails, patches, logs }
}

describe('Apps Script runtime', () => {
  it('mails each new submission once and marks it notified', () => {
    const a = { bride: 'Linh', groom: 'Thắng', date: '2027-02-15' }
    const s = sandbox([inviteDoc('t1', a), inviteDoc('t2', { bride: 'X' })])
    s.ctx.kiemTraPhieu()
    expect(s.mails.map(m => m.subject)).toEqual(['Phiếu mới: Linh & Thắng – Cưới 15/02/2027', 'Phiếu mới: X – Cưới'])
    expect(s.patches).toHaveLength(2)
    expect(s.patches[0].url).toContain('/invites/t1?updateMask.fieldPaths=notifiedSig')
    s.ctx.kiemTraPhieu()
    expect(s.mails).toHaveLength(2)
  })
  it('does not mark notified when the email fails', () => {
    const s = sandbox([inviteDoc('t1', { bride: 'Linh' })], { mailThrows: true })
    s.ctx.kiemTraPhieu()
    expect(s.patches).toEqual([])
  })
  it('skips a broken invite and still mails the others', () => {
    const s = sandbox([inviteDoc('bad', null), inviteDoc('ok', { bride: 'Linh' })])
    s.ctx.kiemTraPhieu()
    expect(s.mails).toHaveLength(1)
  })
  it('says it is an update when the invite was applied before', () => {
    const s = sandbox([inviteDoc('t1', { bride: 'Linh' }, { appliedAt: { timestampValue: '2026-11-18T09:00:00Z' } })])
    s.ctx.kiemTraPhieu()
    expect(s.mails[0].subject.startsWith('Khách bổ sung phiếu:')).toBe(true)
  })
  it('exposes caiDat and guiThu', () => {
    const s = sandbox([])
    expect(typeof s.ctx.caiDat).toBe('function')
    expect(typeof s.ctx.guiThu).toBe('function')
  })
})
