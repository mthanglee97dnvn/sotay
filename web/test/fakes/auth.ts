const w = globalThis as any
let user: any = w.__USER ?? null
const subs = new Set<(u: any) => void>()
export const getAuth = () => ({ languageCode: 'vi' })
export class GoogleAuthProvider { setCustomParameters() {} }
export function onAuthStateChanged(_a: any, f: (u: any) => void) { subs.add(f); queueMicrotask(() => f(user)); return () => subs.delete(f) }
export async function signInWithPopup() { user = { email: 'admin@test.vn', displayName: 'Admin' }; subs.forEach(f => f(user)) }
export const signInWithRedirect = signInWithPopup
export async function signOut() { user = null; subs.forEach(f => f(null)) }
