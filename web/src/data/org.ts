import { signal, computed } from '@preact/signals'
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut as fbSignOut, type User } from 'firebase/auth'
import { doc, onSnapshot, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { app, ORG } from '../firebase'
import { db } from '../db'
import { lower, roleOf, setRoleLocal, writeErrorMessage } from '../domain/roles'
import type { Org, Role } from '../domain/types'
import { DEFAULT_LEAD_DAYS } from '../domain/consult'
import { toast } from '../ui/toast'

export { roleOf, setRoleLocal, writeErrorMessage }

export const auth = getAuth(app)
auth.languageCode = 'vi'

export const me = signal<{ email: string; name: string } | null | 'loading'>('loading')
export const orgDoc = signal<Org | null | 'loading'>('loading')
export const role = computed<Role | null | 'loading'>(() => {
  const m = me.value, o = orgDoc.value
  if (m === 'loading' || o === 'loading') return 'loading'
  if (!m) return null
  return roleOf(o, m.email)
})
export const canEdit = () => role.value === 'admin' || role.value === 'editor'
export const isAdmin = () => role.value === 'admin'
export const myEmail = () => { const m = me.value; return m && m !== 'loading' ? m.email : '' }
export const leadDays = computed(() => { const o = orgDoc.value; return (o && o !== 'loading' && o.consultLeadDays) || DEFAULT_LEAD_DAYS })
export const orgRef = () => doc(db, 'orgs', ORG)

let unsubOrg: (() => void) | undefined
onAuthStateChanged(auth, (u: User | null) => {
  unsubOrg?.()
  if (!u?.email) { me.value = null; orgDoc.value = null; return }
  me.value = { email: lower(u.email), name: u.displayName || u.email }
  orgDoc.value = 'loading'
  unsubOrg = onSnapshot(orgRef(), snap => {
    if (snap.exists()) { orgDoc.value = snap.data() as Org; return }
    if (snap.metadata.fromCache) return // wait for the server before claiming
    // Empty org: the first person to sign in becomes admin.
    const fresh: Org = { admin: lower(u.email!), roles: {}, consultLeadDays: DEFAULT_LEAD_DAYS }
    setDoc(orgRef(), { ...fresh, createdAt: serverTimestamp() }).catch(() => (orgDoc.value = null))
  }, () => (orgDoc.value = null))
})

export async function signIn() {
  const p = new GoogleAuthProvider()
  p.setCustomParameters({ prompt: 'select_account' })
  try { await signInWithPopup(auth, p) }
  catch (e) {
    const code = (e as { code?: string }).code || ''
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') return signInWithRedirect(auth, p)
    if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') toast('Chưa đăng nhập được, thử lại nhé', true)
  }
}
export const signOut = () => fbSignOut(auth)

/** Every Firestore write goes through here: no waiting while offline; a rejection shows a message (Firestore rolls the cache back). */
export function guardedWrite(p: Promise<unknown>): Promise<boolean> {
  return p.then(() => true, e => { toast(writeErrorMessage(e), true); return false })
}

export function setRole(email: string, r: 'editor' | 'viewer' | null) {
  const o = orgDoc.value
  if (!o || o === 'loading') return
  try {
    const next = setRoleLocal(o, email, r)
    guardedWrite(updateDoc(orgRef(), { roles: next.roles }))
  } catch (e) { toast((e as Error).message, true) }
}
export const setLeadDays = (n: number) => guardedWrite(updateDoc(orgRef(), { consultLeadDays: Math.max(1, Math.min(180, Math.round(n))) }))
export const setFramevisCal = (id: string) => guardedWrite(updateDoc(orgRef(), { framevisCalId: id.trim() }))
