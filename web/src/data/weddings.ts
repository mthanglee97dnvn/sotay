import { signal } from '@preact/signals'
import { collection, doc, onSnapshot, setDoc, deleteDoc, serverTimestamp, deleteField, updateDoc } from 'firebase/firestore'
import { db } from '../db'
import { ORG } from '../firebase'
import { guardedWrite, me, myEmail } from './org'
import { emptyWedding, withCoupleKey } from '../domain/wedding'
import { prefillOf } from '../domain/invite'
import type { Wedding } from '../domain/types'
import { effect } from '@preact/signals'

export const weddings = signal<Wedding[]>([])
export const weddingsReady = signal(false)
/** True once a snapshot came from the server (not only the offline cache). */
export const weddingsFresh = signal(false)
const col = () => collection(db, 'orgs', ORG, 'weddings')
export const newId = (c = col()) => doc(c).id

let unsub: (() => void) | undefined
effect(() => {
  const m = me.value
  unsub?.(); unsub = undefined
  if (!m || m === 'loading') { weddings.value = []; weddingsFresh.value = false; return }
  unsub = onSnapshot(col(), s => {
    weddings.value = s.docs.map(d => ({ ...emptyWedding(''), ...(d.data() as Partial<Wedding>), id: d.id })).sort((a, b) => (a.date || '9').localeCompare(b.date || '9'))
    weddingsReady.value = true
    if (!s.metadata.fromCache) weddingsFresh.value = true
  }, () => (weddingsReady.value = true))
})

/** New profile (no id): writes the full document. Existing: merges only the given fields, so other people's changes stay. */
export function saveWedding(w: Partial<Wedding> & { id?: string }): string {
  if (!w.id) {
    const id = newId()
    const { id: _omit, ...data } = withCoupleKey({ ...emptyWedding(myEmail()), ...w, id })
    guardedWrite(setDoc(doc(col(), id), { ...data, updatedAt: Date.now(), serverAt: serverTimestamp() }))
    return id
  }
  const { id, ...patch } = w
  const cur = weddings.value.find(x => x.id === id)
  if (cur && !cur.coupleKey && (patch.bride != null || patch.groom != null)) patch.coupleKey = withCoupleKey({ ...cur, ...patch, coupleKey: '' }).coupleKey
  guardedWrite(setDoc(doc(col(), id), { ...patch, updatedAt: Date.now(), serverAt: serverTimestamp() }, { merge: true }))
  // Keep the client form link showing the latest profile (client-facing fields only).
  const merged = cur ? { ...cur, ...patch } as Wedding : undefined
  if (merged?.formToken) updateDoc(doc(db, 'invites', merged.formToken), { prefill: prefillOf(merged) }).catch(() => { /* link deleted: nothing to refresh */ })
  return id
}
export const deleteWedding = (id: string) => guardedWrite(deleteDoc(doc(col(), id)))

import { withNewLink } from '../domain/store'
import type { Part } from '../domain/delivery'

export function setLink(id: string, part: Part, link: string) {
  const w = weddings.value.find(x => x.id === id)
  if (!w) return
  const p = withNewLink(w, part, link)
  if (Object.keys(p).length) saveWedding({ id, ...p })
}
export function markDelivered(id: string, part: Part, on: boolean) {
  const w = weddings.value.find(x => x.id === id)
  if (!w) return
  const cur = w[part]
  // With merge, a missing key would keep the old date, so remove it explicitly.
  saveWedding({ id, [part]: { ...cur, deliveredAt: on ? Date.now() : deleteField() } } as Partial<Wedding>)
}
