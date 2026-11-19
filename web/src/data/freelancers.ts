import { signal, effect } from '@preact/signals'
import { collection, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../db'
import { ORG } from '../firebase'
import { guardedWrite, me } from './org'
import type { Freelancer } from '../domain/types'

export const freelancers = signal<Freelancer[]>([])
export const freelancersReady = signal(false)
const col = () => collection(db, 'orgs', ORG, 'freelancers')

let unsub: (() => void) | undefined
effect(() => {
  const m = me.value
  unsub?.(); unsub = undefined
  if (!m || m === 'loading') { freelancers.value = []; freelancersReady.value = false; return }
  unsub = onSnapshot(col(), s => {
    freelancersReady.value = !s.metadata.fromCache || freelancersReady.value
    freelancers.value = s.docs.map(d => ({ name: '', fb: '', does: 'chup', note: '', updatedAt: 0, ...(d.data() as Partial<Freelancer>), id: d.id }))
  })
})

export function saveFreelancer(f: Partial<Freelancer> & { id?: string }): string {
  const id = f.id || doc(col()).id
  const { id: _omit, ...data } = f
  guardedWrite(setDoc(doc(col(), id), { ...data, updatedAt: Date.now() }, { merge: true }))
  return id
}
export const deleteFreelancer = (id: string) => guardedWrite(deleteDoc(doc(col(), id)))
