import { collection, doc, setDoc, updateDoc, serverTimestamp, getDocFromServer, getDocs, query, where } from 'firebase/firestore'
import { db } from '../db'
import { ORG } from '../firebase'
import { guardedWrite, myEmail, writeErrorMessage } from './org'
import { toast } from '../ui/toast'
import { saveWedding, weddings } from './weddings'
import { newToken, inviteMessage, mergeAnswers, answersSig, prefillOf, changedAnswers } from '../domain/invite'
import type { Invite, Kind, Wedding } from '../domain/types'
import { emptyWedding } from '../domain/wedding'

// Actions on invites, loaded only with the invite screens (keeps the main bundle small).
const col = () => collection(db, 'invites')

export const formUrl = (token: string) => `${location.origin}${import.meta.env.BASE_URL}form.html#${token}`

/** Creates an invite (and an empty profile when none is given). Returns the message to send. */
export function createInvite(weddingId: string | null, kind: Kind): { token: string; url: string; message: string; weddingId: string } {
  const token = newToken()
  const wid = weddingId || saveWedding({ kind, formToken: token })
  const w = weddingId ? weddings.value.find(x => x.id === weddingId) : undefined
  guardedWrite(setDoc(doc(col(), token), { org: ORG, weddingId: wid, kind, status: 'open', answers: {}, prefill: w ? prefillOf(w) : { kind }, seen: true, createdByEmail: myEmail(), createdAt: serverTimestamp() }))
  if (w) saveWedding({ id: w.id, formToken: token })
  const url = formUrl(token)
  return { token, url, message: inviteMessage(kind, url), weddingId: wid }
}

/** Puts the answers into the profile, then marks the invite applied, unless the client changed it meanwhile. */
export async function applyInvite(inv: Invite): Promise<boolean> {
  const w = weddings.value.find(x => x.id === inv.weddingId)
  const sig = answersSig(inv.answers)
  const ref = doc(col(), inv.token)
  let base: Record<string, string> | undefined
  try {
    // Re-read from the server: if the client changed the answers meanwhile, don't mark them applied.
    const cur = await getDocFromServer(ref)
    if (!cur.exists() || answersSig((cur.data() as Invite).answers) !== sig) { toast('Khách vừa sửa phiếu, xem lại bản mới rồi đưa vào hồ sơ', true); return false }
    base = (cur.data() as Invite).base
    await updateDoc(ref, { status: 'applied', seen: true, appliedAt: serverTimestamp(), appliedSig: sig, appliedSubmittedAt: (cur.data() as any).submittedAt ?? null })
  } catch (e) { toast(writeErrorMessage(e), true); return false }
  // Only what the client added or changed compared with the prefill they saw: newer profile edits stay.
  // Works even before the profile list has loaded. The invite becomes the profile's one link if it has none.
  const start = w || emptyWedding(inv.createdByEmail)
  const patch = mergeAnswers(start, changedAnswers(inv.answers, base))
  saveWedding({ id: inv.weddingId, ...patch, ...(w?.formToken ? {} : { formToken: inv.token }) })
  // saveWedding refreshes the link's prefill only when the profile is loaded; otherwise do it here.
  if (!w) guardedWrite(updateDoc(ref, { prefill: prefillOf({ ...start, ...patch } as Wedding) }))
  return true
}

/** The profile's one client-form link: reuses it (or the newest older one), refreshes its prefill, returns the message to send. */
export async function linkForWedding(draft: Wedding): Promise<{ token: string; url: string; message: string }> {
  // Always the saved profile: unsaved edits in the open sheet must not reach the client.
  const w = weddings.value.find(x => x.id === draft.id) ?? draft
  let token = w.formToken
  if (!token) {
    try {
      const s = await getDocs(query(col(), where('org', '==', ORG), where('weddingId', '==', w.id)))
      const newest = s.docs.map(d => ({ id: d.id, at: (d.data() as { createdAt?: { toMillis?: () => number } | number }).createdAt }))
        .sort((a, b) => ms(b.at) - ms(a.at))[0]
      token = newest?.id
    } catch { /* offline: make a new link */ }
  }
  const prefill = prefillOf(w)
  if (token) guardedWrite(updateDoc(doc(col(), token), { prefill }))
  else {
    token = newToken()
    guardedWrite(setDoc(doc(col(), token), { org: ORG, weddingId: w.id, kind: w.kind, status: 'open', answers: {}, prefill, seen: true, createdByEmail: myEmail(), createdAt: serverTimestamp() }))
  }
  if (w.formToken !== token) saveWedding({ id: w.id, formToken: token })
  const url = formUrl(token)
  return { token, url, message: inviteMessage(w.kind, url, Object.keys(prefill).length > 1) }
}
const ms = (t: unknown) => typeof t === 'number' ? t : (t as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0
