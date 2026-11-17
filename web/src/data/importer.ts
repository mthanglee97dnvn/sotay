import { signal, effect } from '@preact/signals'
import { collection, doc, onSnapshot, writeBatch, deleteDoc } from 'firebase/firestore'
import { db } from '../db'
import { ORG } from '../firebase'
import { guardedWrite, me } from './org'
import { setLink } from './weddings'
import type { MigrateResult } from '../domain/migrate'
import type { Unmatched } from '../domain/types'

export const unmatched = signal<Unmatched[]>([])
const col = (name: string) => collection(db, 'orgs', ORG, name)

let unsub: (() => void) | undefined
effect(() => {
  const m = me.value
  unsub?.(); unsub = undefined
  if (!m || m === 'loading') { unmatched.value = []; return }
  unsub = onSnapshot(col('unmatched'), s => (unmatched.value = s.docs.map(d => ({ ...(d.data() as Unmatched), id: d.id }))), () => {})
})

/** Writes an import in batches of 400. */
export async function writeImport(r: MigrateResult) {
  const ops: [string, string, object][] = [
    ...r.weddings.map(w => { const { id, ...data } = w; return ['weddings', id, data] as [string, string, object] }),
    ...r.tasks.map(t => { const { id, ...data } = t; return ['tasks', id, data] as [string, string, object] }),
    ...r.unmatched.map(u => { const { id, ...data } = u; return ['unmatched', id, data] as [string, string, object] }),
  ]
  for (let i = 0; i < ops.length; i += 400) {
    const b = writeBatch(db)
    for (const [c, id, data] of ops.slice(i, i + 400)) b.set(doc(col(c), id), data)
    if (!(await guardedWrite(b.commit()))) return false
  }
  return true
}

export function attachUnmatched(u: Unmatched, weddingId: string) {
  if (u.link) setLink(weddingId, 'photo', u.link)
  if (u.video) setLink(weddingId, 'video', u.video)
  return guardedWrite(deleteDoc(doc(col('unmatched'), u.id)))
}
export const dropUnmatched = (u: Unmatched) => guardedWrite(deleteDoc(doc(col('unmatched'), u.id)))
