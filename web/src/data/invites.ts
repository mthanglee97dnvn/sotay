import { signal, effect } from '@preact/signals'
import { collection, doc, onSnapshot, query, where, setDoc, serverTimestamp, runTransaction } from 'firebase/firestore'
import { db } from '../db'
import { ORG } from '../firebase'
import { guardedWrite, myEmail, role, writeErrorMessage } from './org'
import { toast } from '../ui/toast'
import { saveWedding, weddings } from './weddings'
import { newToken, inviteMessage, mergeAnswers, answersSig } from '../domain/invite'
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

/** Puts the answers into the profile, then marks the invite applied, unless the client changed it meanwhile. */
export async function applyInvite(inv: Invite): Promise<boolean> {
  const w = weddings.value.find(x => x.id === inv.weddingId)
  const sig = answersSig(inv.answers)
  const ref = doc(col(), inv.token)
  try {
    const ok = await runTransaction(db, async tx => {
      const cur = await tx.get(ref)
      if (!cur.exists() || answersSig((cur.data() as Invite).answers) !== sig) return false
      tx.update(ref, { status: 'applied', seen: true, appliedAt: serverTimestamp(), appliedSig: sig })
      return true
    })
    if (!ok) { toast('Khách vừa sửa phiếu, xem lại bản mới rồi đưa vào hồ sơ', true); return false }
  } catch (e) { toast(writeErrorMessage(e), true); return false }
  // Merge only the answered fields (works even before the profile list has loaded).
  saveWedding({ id: inv.weddingId, ...mergeAnswers(w || emptyWedding(inv.createdByEmail), inv.answers) })
  return true
}
