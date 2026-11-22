import { computed, signal } from '@preact/signals'
import { collection, doc, onSnapshot, setDoc, deleteDoc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../db'
import { ORG } from '../firebase'
import { guardedWrite, me, myEmail } from './org'
import { emptyWedding, withCoupleKey } from '../domain/wedding'
import { prefillOf } from '../domain/invite'
import type { Wedding } from '../domain/types'
import { effect } from '@preact/signals'

export const weddings = signal<Wedding[]>([])
/** What the app shows: everything except profiles hidden or deleted for good in Sổ Tay. Sync and import keep reading `weddings`. */
export const visibleWeddings = computed(() => weddings.value.filter(w => !w.hidden && !w.purged))
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

/** Hide a profile in Sổ Tay only (calendars are not touched). */
export const hideWedding = (id: string) => saveWedding({ id, hidden: true, hiddenAt: Date.now() })
export const unhideWedding = (id: string) => saveWedding({ id, hidden: false })
/** Delete for good in Sổ Tay. A calendar profile becomes a data-free marker so sync never brings it back. */
export function purgeWedding(w: Wedding) {
  if (!w.source) return deleteWedding(w.id)
  const { cal, eventId, eventIds } = w.source
  return guardedWrite(setDoc(doc(col(), w.id), { purged: true, hidden: true, date: w.date, source: { cal, eventId, bookingId: '', title: '', ...(eventIds ? { eventIds } : {}) }, updatedAt: Date.now() }))
}
