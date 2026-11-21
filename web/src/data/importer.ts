import { signal, effect } from '@preact/signals'
import { collection, doc, onSnapshot, writeBatch } from 'firebase/firestore'
import { db } from '../db'
import { ORG } from '../firebase'
import { guardedWrite, me } from './org'
import type { MigrateResult } from '../domain/migrate'
import type { Unmatched } from '../domain/types'

/** Old links the import could not match to a profile; kept so importing the same file again skips them. */
export const unmatchedAll = signal<(Unmatched & { handled?: boolean })[]>([])
const col = (name: string) => collection(db, 'orgs', ORG, name)

let unsub: (() => void) | undefined
effect(() => {
  const m = me.value
  unsub?.(); unsub = undefined
  if (!m || m === 'loading') { unmatchedAll.value = []; return }
  unsub = onSnapshot(col('unmatched'), s => (unmatchedAll.value = s.docs.map(d => ({ ...(d.data() as Unmatched), id: d.id }))), () => {})
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
