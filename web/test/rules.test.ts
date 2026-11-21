import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest'
import { initializeTestEnvironment, assertSucceeds, assertFails, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { readFileSync } from 'node:fs'
import { doc, getDoc, setDoc, updateDoc, getDocs, collection, query, where, serverTimestamp } from 'firebase/firestore'

let env: RulesTestEnvironment
const ORG = 'orgs/mthanglee'
const as = (email: string, verified = true) => env.authenticatedContext(email.toLowerCase().replace(/\W/g, '_'), { email, email_verified: verified }).firestore()
const anon = () => env.unauthenticatedContext().firestore()

beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-sotay', firestore: { rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8080 } })
})
afterAll(() => env.cleanup())
beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore()
    await setDoc(doc(db, ORG), { admin: 'boss@x.com', roles: { 'wife@x.com': 'editor', 'view@x.com': 'viewer' } })
    await setDoc(doc(db, ORG, 'weddings', 'w1'), { bride: 'Lan', groom: 'Minh' })
    await setDoc(doc(db, 'invites', 'tokOpen'), { org: 'mthanglee', weddingId: 'w1', kind: 'Cưới', status: 'open', answers: {}, seen: true, createdByEmail: 'wife@x.com' })
    await setDoc(doc(db, 'invites', 'tokApplied'), { org: 'mthanglee', weddingId: 'w1', kind: 'Cưới', status: 'applied', answers: {}, seen: true, createdByEmail: 'wife@x.com' })
  })
})

const submit = (extra: Record<string, unknown> = {}) => ({ answers: { bride: 'Lan', groom: 'Minh' }, status: 'submitted', submittedAt: serverTimestamp(), seen: false, ...extra })

describe('org roles', () => {
  it('thợ list: members read, only editors write, outsiders see nothing', async () => {
    await assertSucceeds(setDoc(doc(as('wife@x.com'), ORG, 'freelancers', 'f1'), { name: 'Tuấn', fb: '', does: 'chup', note: '' }))
    await assertSucceeds(getDoc(doc(as('view@x.com'), ORG, 'freelancers', 'f1')))
    await assertFails(setDoc(doc(as('view@x.com'), ORG, 'freelancers', 'f2'), { name: 'x' }))
    await assertFails(getDoc(doc(as('stranger@x.com'), ORG, 'freelancers', 'f1')))
  })
  it('viewer reads but cannot write weddings', async () => {
    await assertSucceeds(getDoc(doc(as('view@x.com'), ORG, 'weddings', 'w1')))
    await assertFails(setDoc(doc(as('view@x.com'), ORG, 'weddings', 'w2'), { bride: 'x' }))
  })
  it('editor writes weddings and tasks but cannot change roles', async () => {
    await assertSucceeds(setDoc(doc(as('wife@x.com'), ORG, 'weddings', 'w2'), { bride: 'x' }))
    await assertSucceeds(setDoc(doc(as('wife@x.com'), ORG, 'tasks', 't1'), { title: 'x' }))
    await assertFails(updateDoc(doc(as('wife@x.com'), ORG), { 'roles.wife@x.com': 'editor', roles: { 'wife@x.com': 'editor', 'new@x.com': 'editor' } }))
  })
  it('admin updates roles but cannot hand over admin', async () => {
    await assertSucceeds(updateDoc(doc(as('boss@x.com'), ORG), { roles: { 'wife@x.com': 'editor', 'new@x.com': 'viewer' } }))
    await assertFails(updateDoc(doc(as('boss@x.com'), ORG), { admin: 'wife@x.com' }))
  })
  it('roles map is capped at 19 (20 people with admin)', async () => {
    const roles: Record<string, string> = {}
    for (let i = 0; i < 20; i++) roles[`p${i}@x.com`] = 'viewer'
    await assertFails(updateDoc(doc(as('boss@x.com'), ORG), { roles }))
  })
  it('stranger cannot read anything', async () => {
    await assertFails(getDoc(doc(as('stranger@x.com'), ORG, 'weddings', 'w1')))
    await assertFails(getDoc(doc(as('stranger@x.com'), ORG)))
  })
  it('email case does not matter', async () => {
    await assertSucceeds(setDoc(doc(as('Wife@X.com'), ORG, 'weddings', 'w3'), { bride: 'x' }))
  })
  it('unverified email is refused', async () => {
    await assertFails(getDoc(doc(as('wife@x.com', false), ORG, 'weddings', 'w1')))
  })
  it('first sign-in claims an empty org, only as itself', async () => {
    await env.clearFirestore()
    await assertSucceeds(getDoc(doc(as('me@x.com'), ORG)))
    await assertFails(setDoc(doc(as('me@x.com'), ORG), { admin: 'other@x.com', roles: {} }))
    await assertSucceeds(setDoc(doc(as('Me@x.com'), ORG), { admin: 'me@x.com', roles: {}, consultLeadDays: 45 }))
  })
})

describe('review fixes', () => {
  it('nobody can create a second org', async () => {
    await assertFails(setDoc(doc(as('me@x.com'), 'orgs/other'), { admin: 'me@x.com', roles: {} }))
  })
  it('answers must be strings and submittedAt the server time', async () => {
    await assertFails(updateDoc(doc(anon(), 'invites', 'tokOpen'), submit({ answers: { date: { evil: 1 } } })))
    await assertFails(updateDoc(doc(anon(), 'invites', 'tokOpen'), submit({ submittedAt: 'x'.repeat(5000) })))
    await assertSucceeds(updateDoc(doc(anon(), 'invites', 'tokOpen'), submit({ submittedAt: serverTimestamp() })))
  })
  it('editor can run the two-filter query the app uses', async () => {
    await assertSucceeds(getDocs(query(collection(as('wife@x.com'), 'invites'), where('org', '==', 'mthanglee'), where('status', '==', 'submitted'))))
  })
})

describe('public invites', () => {
  it('anyone can get an invite by token, nobody anonymous can list', async () => {
    await assertSucceeds(getDoc(doc(anon(), 'invites', 'tokOpen')))
    await assertFails(getDocs(collection(anon(), 'invites')))
  })
  it('editor can list invites of the org', async () => {
    await assertSucceeds(getDocs(query(collection(as('wife@x.com'), 'invites'), where('org', '==', 'mthanglee'))))
  })
  it('anonymous client submits an open invite', async () => {
    await assertSucceeds(updateDoc(doc(anon(), 'invites', 'tokOpen'), submit()))
  })
  it('anonymous client cannot retarget the invite', async () => {
    await assertFails(updateDoc(doc(anon(), 'invites', 'tokOpen'), submit({ weddingId: 'w9' })))
  })
  it('applied invites can be resubmitted by the client', async () => {
    await assertSucceeds(updateDoc(doc(anon(), 'invites', 'tokApplied'), submit()))
  })
  it('client cannot set appliedAt or notifiedSig', async () => {
    await assertFails(updateDoc(doc(anon(), 'invites', 'tokOpen'), submit({ appliedAt: serverTimestamp() })))
    await assertFails(updateDoc(doc(anon(), 'invites', 'tokOpen'), submit({ notifiedSig: 'x' })))
  })
  it('answers are size-limited and keys whitelisted', async () => {
    await assertFails(updateDoc(doc(anon(), 'invites', 'tokOpen'), submit({ answers: { bride: 'x'.repeat(1001) } })))
    await assertFails(updateDoc(doc(anon(), 'invites', 'tokOpen'), submit({ answers: { evil: 'x' } })))
  })
  it('anonymous cannot create invites; editor can, viewer cannot', async () => {
    const inv = { org: 'mthanglee', weddingId: 'w1', kind: 'Cưới', status: 'open', answers: {}, seen: true, createdByEmail: 'wife@x.com' }
    await assertFails(setDoc(doc(anon(), 'invites', 'tokNew'), inv))
    await assertFails(setDoc(doc(as('view@x.com'), 'invites', 'tokNew'), inv))
    await assertSucceeds(setDoc(doc(as('wife@x.com'), 'invites', 'tokNew'), inv))
  })
  it('I3: marking applied must name the submission it applied', async () => {
    await env.withSecurityRulesDisabled(async ctx => { await updateDoc(doc(ctx.firestore(), 'invites', 'tokOpen'), { status: 'submitted', submittedAt: new Date('2026-11-18T09:00:00Z') }) })
    await assertFails(updateDoc(doc(as('wife@x.com'), 'invites', 'tokOpen'), { status: 'applied', seen: true, appliedSubmittedAt: new Date('2026-11-18T08:00:00Z') }))
    await assertSucceeds(updateDoc(doc(as('wife@x.com'), 'invites', 'tokOpen'), { status: 'applied', seen: true, appliedSubmittedAt: new Date('2026-11-18T09:00:00Z') }))
  })
  it('editor can mark an invite applied', async () => {
    await assertSucceeds(updateDoc(doc(as('wife@x.com'), 'invites', 'tokOpen'), { status: 'applied', seen: true }))
  })
})

describe('old v1 data still guarded', () => {
  it('stranger cannot read v1 team data', async () => {
    await assertFails(getDoc(doc(as('stranger@x.com'), 'data/users/mthanglee/meta')))
  })
})

describe('prefilled form', () => {
  it('client may send the base it saw, checked like answers', async () => {
    await assertSucceeds(updateDoc(doc(anon(), 'invites', 'tokOpen'), submit({ base: { bride: 'Lan' } })))
  })
  it('base with unknown keys or long values is refused', async () => {
    await assertFails(updateDoc(doc(anon(), 'invites', 'tokOpen'), submit({ base: { notes: 'x' } })))
    await assertFails(updateDoc(doc(anon(), 'invites', 'tokOpen'), submit({ base: { bride: 'x'.repeat(1001) } })))
  })
  it('only editors write prefill', async () => {
    await assertFails(updateDoc(doc(anon(), 'invites', 'tokOpen'), { prefill: { bride: 'X' } }))
    await assertFails(updateDoc(doc(as('view@x.com'), 'invites', 'tokApplied'), { prefill: { bride: 'Lan' } }))
    await assertSucceeds(updateDoc(doc(as('wife@x.com'), 'invites', 'tokApplied'), { prefill: { bride: 'Lan' } }))
  })
})
