// In-memory Firebase stand-in for local testing (aliased in place of firebase/* by test/build-test.mjs).
const STORE_KEY = '__mockfs';
const load = () => { try { return JSON.parse(sessionStorage.getItem(STORE_KEY) || '{}'); } catch (e) { return {}; } };
let store = load();
const save = () => sessionStorage.setItem(STORE_KEY, JSON.stringify(store));
const listeners = new Set();
const fire = () => setTimeout(() => listeners.forEach(l => l()), 0);

// ---- app / auth
export const initializeApp = c => ({ options: c });
export const indexedDBLocalPersistence = {}, browserLocalPersistence = {}, browserPopupRedirectResolver = {};
let cur = JSON.parse(sessionStorage.getItem('__mockuser') || 'null');
const authObs = new Set();
export const initializeAuth = () => ({ get currentUser() { return cur; } });
export class GoogleAuthProvider {
  constructor() { this.scopes = []; }
  addScope(s) { this.scopes.push(s); }
  static credential(idToken, accessToken) { return { idToken, accessToken }; }
  static credentialFromResult(r) { return r._cred; }
}
const setUser = u => { cur = u; sessionStorage.setItem('__mockuser', JSON.stringify(u)); authObs.forEach(f => f(u)); };
export async function signInWithPopup() { window.__popups = (window.__popups || 0) + 1; setUser({ uid: 'u_thang', email: 'thang@example.com' }); return { _cred: { accessToken: 'tok' + Date.now() } }; }
export async function reauthenticateWithPopup() { window.__popups = (window.__popups || 0) + 1; return { _cred: { accessToken: 'tok' + Date.now() } }; }
export async function signInWithCredential() { setUser({ uid: 'u_thang', email: 'thang@example.com' }); }
export function onAuthStateChanged(a, f) { authObs.add(f); setTimeout(() => f(cur), 30); return () => authObs.delete(f); }
export async function signOut() { setUser(null); }

// ---- firestore
export const initializeFirestore = () => ({});
export const persistentLocalCache = () => ({}), persistentMultipleTabManager = () => ({});
const join = (...p) => p.filter(Boolean).join('/');
export const collection = (base, ...p) => ({ kind: 'col', path: join(base.path, ...p) });
export const doc = (base, ...p) => { const path = join(base.path, ...p); return { kind: 'doc', path, id: path.split('/').pop() }; };
export const query = (q, ...c) => ({ ...q, cons: [...(q.cons || []), ...c] });
export const orderBy = (f, d) => ({ t: 'o', f, d }), limit = n => ({ t: 'l', n }), where = (f, op, v) => ({ t: 'w', f, op, v });
function run(q) {
  const pre = q.path + '/';
  let docs = Object.entries(store).filter(([k]) => k.startsWith(pre) && !k.slice(pre.length).includes('/'))
    .map(([k, v]) => ({ id: k.slice(pre.length), data: () => JSON.parse(JSON.stringify(v)) }));
  for (const c of q.cons || []) {
    if (c.t === 'w') docs = docs.filter(d => { const x = d.data()[c.f]; return c.op === '<' ? x < c.v : c.op === '>' ? x > c.v : x === c.v; });
    if (c.t === 'o') docs.sort((a, b) => (a.data()[c.f] > b.data()[c.f] ? 1 : -1) * (c.d === 'desc' ? -1 : 1));
    if (c.t === 'l') docs = docs.slice(0, c.n);
  }
  return docs;
}
const strip = o => JSON.parse(JSON.stringify(o, (k, v) => v === undefined ? undefined : v));
export async function setDoc(d, data) { if (window.__failWrites) throw { code: 'unavailable' }; store[d.path] = strip(data); save(); fire(); }
export async function deleteDoc(d) { delete store[d.path]; save(); fire(); }
export async function getDocs(q) { return { docs: run(q) }; }
export function onSnapshot(q, opts, next) {
  const emit = fromCache => next({ docs: run(q), metadata: { fromCache } });
  setTimeout(() => emit(true), 10); setTimeout(() => emit(false), 80);
  const l = () => emit(false); listeners.add(l);
  return () => listeners.delete(l);
}
window.__mockStore = () => store;
export async function getDoc(d) { const v = store[d.path]; return { exists: () => v !== undefined, data: () => v && JSON.parse(JSON.stringify(v)) }; }
