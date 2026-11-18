// In-memory Firestore for the mock build (vite --mode mock). Seed: window.__SEED = { 'path/to/doc': data }.
type Data = Record<string, any>
const w = globalThis as any
const store: Map<string, Data> = new Map(Object.entries(w.__SEED || {}))
const subs = new Set<() => void>()
const notify = () => queueMicrotask(() => subs.forEach(f => f()))
let n = 0
const rid = () => 'id' + Date.now().toString(36) + (n++)
w.__store = store
w.__notify = () => notify()
const deny = (path: string) => (w.__DENY || []).some((p: string) => path.startsWith(p))
const err = () => Object.assign(new Error('denied'), { code: 'permission-denied' })

export const initializeFirestore = () => ({}), getFirestore = () => ({})
export const persistentLocalCache = () => ({}), persistentMultipleTabManager = () => ({})
export const serverTimestamp = () => Date.now()
export const collection = (_db: any, ...parts: string[]) => ({ type: 'col', path: parts.join('/') })
export function doc(a: any, ...parts: string[]) {
  if (a?.type === 'col') return { type: 'doc', path: a.path + '/' + (parts[0] ?? rid()), get id() { return this.path.split('/').pop() } }
  const path = parts.join('/')
  return { type: 'doc', path, id: path.split('/').pop() }
}
export const where = (f: string, op: string, v: any) => ({ f, op, v })
export const query = (c: any, ...w: any[]) => ({ ...c, where: w })
const snapDoc = (path: string) => ({ id: path.split('/').pop(), exists: () => store.has(path), data: () => store.get(path) ? structuredClone(store.get(path)) : undefined, metadata: { fromCache: false } })
const children = (q: any) => [...store.keys()].filter(k => k.startsWith(q.path + '/') && k.split('/').length === q.path.split('/').length + 1)
  .filter(k => (q.where || []).every((c: any) => { const v = store.get(k)![c.f]; return c.op === '==' ? v === c.v : c.op === 'in' ? c.v.includes(v) : true }))
const snapCol = (q: any) => { const docs = children(q).map(snapDoc); return { docs, size: docs.length, empty: !docs.length, metadata: { fromCache: false }, forEach: (f: any) => docs.forEach(f) } }
export function onSnapshot(ref: any, next: any, error?: any) {
  const run = () => { if (deny(ref.path)) return error?.(err()); next(ref.type === 'doc' ? snapDoc(ref.path) : snapCol(ref)) }
  subs.add(run); queueMicrotask(run); return () => subs.delete(run)
}
export const getDoc = async (r: any) => snapDoc(r.path)
export const getDocs = async (q: any) => snapCol(q)
const write = async (path: string, f: () => void) => { if (deny(path)) throw err(); f(); notify() }
const DEL = { __delete: true }
export const deleteField = () => DEL
const isMap = (v: any) => v && typeof v === 'object' && !Array.isArray(v)
function deepMerge(a: Data, b: Data): Data {
  const o: Data = { ...a }
  for (const [k, v] of Object.entries(b)) {
    if (v === DEL) delete o[k]
    else if (isMap(v) && isMap(o[k])) o[k] = deepMerge(o[k], v)
    else o[k] = isMap(v) ? deepMerge({}, v) : structuredClone(v)
  }
  return o
}
export const setDoc = (r: any, d: Data, o?: any) => write(r.path, () => store.set(r.path, o?.merge ? deepMerge(store.get(r.path) || {}, d) : deepMerge({}, d)))
export const updateDoc = (r: any, d: Data) => write(r.path, () => {
  const cur = structuredClone(store.get(r.path) || {})
  for (const [k, v] of Object.entries(d)) { const ps = k.split('.'); let o = cur; ps.slice(0, -1).forEach(p => (o = o[p] ??= {})); o[ps.at(-1)!] = v }
  store.set(r.path, cur)
})
export const deleteDoc = (r: any) => write(r.path, () => store.delete(r.path))
export function writeBatch() {
  const ops: (() => Promise<void>)[] = []
  return { set: (r: any, d: Data) => ops.push(() => setDoc(r, d)), update: (r: any, d: Data) => ops.push(() => updateDoc(r, d)), delete: (r: any) => ops.push(() => deleteDoc(r)), commit: async () => { for (const o of ops) await o() } }
}

export async function runTransaction(_db: any, fn: (tx: any) => Promise<any>) {
  const ops: (() => Promise<void>)[] = []
  const tx = { get: (r: any) => getDoc(r), update: (r: any, d: Data) => { ops.push(() => updateDoc(r, d)) }, set: (r: any, d: Data) => { ops.push(() => setDoc(r, d)) } }
  const res = await fn(tx)
  for (const o of ops) await o()
  return res
}
export const getDocFromServer = getDoc
