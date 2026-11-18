import { signal, effect } from '@preact/signals'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../db'
import { ORG } from '../firebase'
import { role } from './org'
import type { Invite } from '../domain/types'

export const newInvites = signal<Invite[]>([])
const col = () => collection(db, 'invites')

let unsub: (() => void) | undefined
effect(() => {
  const r = role.value
  unsub?.(); unsub = undefined
  if (r !== 'admin' && r !== 'editor') { newInvites.value = []; return }
  unsub = onSnapshot(query(col(), where('org', '==', ORG), where('status', '==', 'submitted')),
    s => (newInvites.value = s.docs.map(d => ({ ...(d.data() as Invite), token: d.id }))), () => (newInvites.value = []))
})
