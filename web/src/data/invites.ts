import { signal, effect } from '@preact/signals'
import { collection, doc, onSnapshot, query, where, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../db'
import { ORG } from '../firebase'
import { guardedWrite, myEmail, role } from './org'
import { saveWedding, weddings } from './weddings'
import { newToken, inviteMessage, mergeAnswers } from '../domain/invite'
import type { Invite, Kind } from '../domain/types'
import { emptyWedding } from '../domain/wedding'

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

export const formUrl = (token: string) => `${location.origin}${import.meta.env.BASE_URL}form.html#${token}`

/** Creates an invite (and an empty profile when none is given). Returns the message to send. */
export function createInvite(weddingId: string | null, kind: Kind): { token: string; url: string; message: string; weddingId: string } {
  const wid = weddingId || saveWedding({ kind })
  const token = newToken()
  guardedWrite(setDoc(doc(col(), token), { org: ORG, weddingId: wid, kind, status: 'open', answers: {}, seen: true, createdByEmail: myEmail(), createdAt: serverTimestamp() }))
  const url = formUrl(token)
  return { token, url, message: inviteMessage(kind, url), weddingId: wid }
}

export function applyInvite(inv: Invite) {
  const w = weddings.value.find(x => x.id === inv.weddingId)
  saveWedding({ id: inv.weddingId, ...(w ? {} : { kind: inv.kind }), ...mergeAnswers(w || emptyWedding(inv.createdByEmail), inv.answers) })
  return guardedWrite(updateDoc(doc(col(), inv.token), { status: 'applied', seen: true }))
}
