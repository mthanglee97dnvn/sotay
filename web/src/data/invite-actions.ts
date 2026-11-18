import { collection, doc, setDoc, updateDoc, serverTimestamp, getDocFromServer } from 'firebase/firestore'
import { db } from '../db'
import { ORG } from '../firebase'
import { guardedWrite, myEmail, writeErrorMessage } from './org'
import { toast } from '../ui/toast'
import { saveWedding, weddings } from './weddings'
import { newToken, inviteMessage, mergeAnswers, answersSig } from '../domain/invite'
import type { Invite, Kind } from '../domain/types'
import { emptyWedding } from '../domain/wedding'

// Actions on invites, loaded only with the invite screens (keeps the main bundle small).
const col = () => collection(db, 'invites')

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
    // Re-read from the server: if the client changed the answers meanwhile, don't mark them applied.
    const cur = await getDocFromServer(ref)
    if (!cur.exists() || answersSig((cur.data() as Invite).answers) !== sig) { toast('Khách vừa sửa phiếu, xem lại bản mới rồi đưa vào hồ sơ', true); return false }
    await updateDoc(ref, { status: 'applied', seen: true, appliedAt: serverTimestamp(), appliedSig: sig })
  } catch (e) { toast(writeErrorMessage(e), true); return false }
  // Merge only the answered fields (works even before the profile list has loaded).
  saveWedding({ id: inv.weddingId, ...mergeAnswers(w || emptyWedding(inv.createdByEmail), inv.answers) })
  return true
}
