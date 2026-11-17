import { signal } from '@preact/signals'
import { collection, doc, onSnapshot, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../db'
import { ORG } from '../firebase'
import { guardedWrite, me, myEmail } from './org'
import { emptyWedding, withCoupleKey } from '../domain/wedding'
import type { Wedding } from '../domain/types'
import { effect } from '@preact/signals'

export const weddings = signal<Wedding[]>([])
export const weddingsReady = signal(false)
const col = () => collection(db, 'orgs', ORG, 'weddings')
export const newId = (c = col()) => doc(c).id

let unsub: (() => void) | undefined
effect(() => {
  const m = me.value
  unsub?.(); unsub = undefined
  if (!m || m === 'loading') { weddings.value = []; return }
  unsub = onSnapshot(col(), s => {
    weddings.value = s.docs.map(d => ({ ...emptyWedding(''), ...(d.data() as Partial<Wedding>), id: d.id })).sort((a, b) => (a.date || '9').localeCompare(b.date || '9'))
    weddingsReady.value = true
  }, () => (weddingsReady.value = true))
})

/** Saves a wedding (creates when there is no id). Returns the id at once; the write syncs in the background. */
export function saveWedding(w: Partial<Wedding> & { id?: string }): string {
  const id = w.id || newId()
  const base = weddings.value.find(x => x.id === id) || emptyWedding(myEmail())
  const full = withCoupleKey({ ...base, ...w, id })
  const { id: _omit, ...data } = full
  guardedWrite(setDoc(doc(col(), id), { ...data, updatedAt: Date.now(), serverAt: serverTimestamp() }))
  return id
}
export const deleteWedding = (id: string) => guardedWrite(deleteDoc(doc(col(), id)))
