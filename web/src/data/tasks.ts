import { signal, effect } from '@preact/signals'
import { collection, doc, onSnapshot, setDoc, deleteDoc, updateDoc } from 'firebase/firestore'
import { db } from '../db'
import { ORG } from '../firebase'
import { guardedWrite, me, myEmail } from './org'
import type { Task } from '../domain/types'

export const tasks = signal<Task[]>([])
const col = () => collection(db, 'orgs', ORG, 'tasks')

let unsub: (() => void) | undefined
effect(() => {
  const m = me.value
  unsub?.(); unsub = undefined
  if (!m || m === 'loading') { tasks.value = []; return }
  unsub = onSnapshot(col(), s => (tasks.value = s.docs.map(d => ({ title: '', body: '', due: null, done: false, weddingId: null, assigneeEmail: null, createdByEmail: '', updatedAt: 0, ...(d.data() as Partial<Task>), id: d.id }))))
})

export function saveTask(t: Partial<Task> & { id?: string }): string {
  const id = t.id || doc(col()).id
  const base = tasks.value.find(x => x.id === id)
  const full: Task = { title: '', body: '', due: null, done: false, weddingId: null, assigneeEmail: null, createdByEmail: myEmail(), ...base, ...t, id, updatedAt: Date.now() }
  const { id: _omit, ...data } = full
  guardedWrite(setDoc(doc(col(), id), data))
  return id
}
export const toggleDone = (t: Task) => guardedWrite(updateDoc(doc(col(), t.id), { done: !t.done, updatedAt: Date.now() }))
export const deleteTask = (id: string) => guardedWrite(deleteDoc(doc(col(), id)))
