# Client form prefilled from the profile — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One link per profile; the client form opens prefilled with the profile's current client-facing data, and applying a resubmission only takes what the client added or changed.

**Architecture:** Each invite doc gains `prefill` (a copy of the profile's client-facing fields, written by editors whenever the profile is saved) and, on client submit, `base` (the prefill the client saw). The profile stores its link as `formToken`. Applying uses `changedAnswers(answers, base)` so stale prefilled values never overwrite newer profile edits. The client never reads the wedding doc.

**Tech Stack:** Vite + Preact + Firebase (Firestore rules), vitest, Firestore emulator rules tests (`npm run test:rules`), Python Playwright smoke against the mock build.

**Spec:** `docs/superpowers/specs/2026-11-21-form-prefill-design.md` (Vietnamese, approved).

## Global Constraints

- Client-facing keys (the only ones in `prefill`/`base`): `kind`, `bride`, `groom`, `phoneBride`, `phoneGroom`, `date`, `addrBride`, `addrGroom`, `addrRest`, `tMakeup`, `tDepart`, `tArrive`, `tRuoc`, `tWelcome`, `tParty`. Never `notes`, consult, delivery, channel, crew, source or anything else on the profile. `note` (client's own note) is never prefilled from the profile.
- Firestore: anyone with the token may only `get` an invite (unchanged). Client submit may change only `answers`, `status`, `submittedAt`, `seen`, `base`; `base` passes the same `answersOk` check as `answers` (known keys, strings ≤ 1000). Only `canEdit` users write `prefill`.
- Empty client answers never erase profile data (`mergeAnswers` behaviour stays).
- Client copy: "mình" / "bạn" / "hai bạn", never "anh chị".
- Client form stays always Light; no other form UI changes.
- Do not push or deploy; ask the owner first.

## Review Focus

- Owner edits a field after the client opened the form, client resubmits without touching it → owner's edit stays.
- Client clears a prefilled field and submits → profile keeps the old value.
- Legacy invite with no `prefill`/`base` (already sent links) → behaves exactly as today.
- Profile with a pending (submitted, not applied) client answer is edited by the owner → the client reopening sees their own pending answers, not lost.
- Profile edited by a viewer-role user is impossible; an editor save on a profile whose invite was deleted → save still succeeds, no error toast.

---

### Task 1: Domain — prefill, changed answers, "again" message

**Files:**
- Modify: `web/src/domain/invite.ts`, `web/src/domain/types.ts` (`Invite.prefill?: Record<string,string>`, `Invite.base?: Record<string,string>`, `Wedding.formToken?: string`)
- Test: `web/test/invites.test.ts`

**Interfaces:**
- Produces:
  - `export const CLIENT_KEYS: readonly string[]` — the 15 keys in Global Constraints.
  - `export function prefillOf(w: Wedding): Record<string, string>` — non-empty trimmed values only; times from `w.times`.
  - `export function changedAnswers(answers: Record<string, string>, base: Record<string, string> | undefined): Record<string, string>` — keeps keys whose trimmed answer is non-empty and differs from `(base ?? {})[k]` trimmed; `note` kept whenever non-empty and different.
  - `inviteMessage(kind: Kind, url: string, again = false): string` — `again` wording: `Chào bạn! Mình gửi lại phiếu thông tin ${word(kind)}, mình đã điền sẵn những gì đã có, bạn xem lại và bổ sung giúp mình phần còn thiếu nhé 🥰\n${url}`.

- [ ] **Step 1: Write failing tests** in `web/test/invites.test.ts`:
  - `prefillOf` on a wedding with `bride:'Lan', groom:'', phoneGroom:'0905', notes:'nội bộ', times:{tRuoc:'09:30'}, kind:'Cưới', date:'2026-12-20'` → exactly `{kind:'Cưới', bride:'Lan', phoneGroom:'0905', date:'2026-12-20', tRuoc:'09:30'}` (no `notes`, no `groom`).
  - `changedAnswers({bride:'Lan', groom:'Minh', addrRest:' '}, {bride:'Lan'})` → `{groom:'Minh'}`.
  - `changedAnswers({tRuoc:'09:30'}, {tRuoc:'10:00'})` → `{tRuoc:'09:30'}` (client really changed it).
  - `changedAnswers({bride:'Lan'}, undefined)` → `{bride:'Lan'}` (legacy invite).
  - `inviteMessage('Cưới','u',true)` contains `điền sẵn` and `bổ sung` and not `anh chị`.
- [ ] **Step 2:** `cd web && npx vitest run test/invites.test.ts` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** same command → PASS; `npm test` → all pass.
- [ ] **Step 5: Commit** `feat(invite): prefill from profile and changed-only answers`.

### Task 2: Firestore rules — `base` on submit, `prefill` for editors

**Files:**
- Modify: `firestore.rules` (client branch: add `'base'` to `affectedKeys().hasOnly`, require `answersOk(request.resource.data.base)` when present)
- Test: `web/test/rules.test.ts`

- [ ] **Step 1: Failing tests:**
  - anon submit with `base: {bride:'Lan'}` → succeeds.
  - anon submit with `base: {notes:'x'}` → fails; with `base: {bride: 'x'.repeat(1001)}` → fails.
  - anon `updateDoc(tokOpen, {prefill:{bride:'X'}})` → fails.
  - editor (`wife@x.com`) `updateDoc(tokApplied, {prefill:{bride:'Lan'}})` → succeeds; viewer → fails.
- [ ] **Step 2:** `cd web && npm run test:rules` → the `base` success test FAILS (others may already pass; note which).
- [ ] **Step 3:** Edit rules.
- [ ] **Step 4:** `npm run test:rules` → all pass.
- [ ] **Step 5: Commit** `feat(rules): client may send base; prefill stays editor-only`.

### Task 3: Data — one link per profile, keep prefill fresh, apply only changes

**Files:**
- Modify: `web/src/data/invite-actions.ts`, `web/src/data/weddings.ts`
- Test: `web/test/weddings.test.ts` (or the test file that already covers `saveWedding`/`applyInvite` with fakes), `web/test/smoke.py`

**Interfaces:**
- Consumes: Task 1 `prefillOf`, `changedAnswers`, `inviteMessage(…, again)`.
- Produces: `export async function linkForWedding(w: Wedding): Promise<{ token: string; url: string; message: string }>` in `invite-actions.ts`:
  - token = `w.formToken`, else the newest invite with `org==ORG && weddingId==w.id` (by `createdAt`), else a new invite (status `open`, `answers:{}`);
  - writes `prefill: prefillOf(w)` to that invite and `formToken` to the profile (if missing);
  - message uses `again = Object.keys(prefillOf(w)).length > 1` (more than `kind`).
- `createInvite` also writes `prefill` when given an existing wedding.
- `saveWedding`: after writing a profile whose merged state has `formToken`, `updateDoc(invites/{formToken}, { prefill: prefillOf(merged) })` through `guardedWrite`, swallowing not-found silently (no toast).
- `applyInvite`: merge `changedAnswers(inv.answers, inv.base)` instead of `inv.answers`.

- [ ] **Step 1: Failing tests:**
  - unit: applying an invite with `answers:{bride:'Lan', tRuoc:'10:00'}` and `base:{bride:'Lan', tRuoc:'10:00'}` onto a profile whose `tRuoc` is now `'11:00'` leaves `tRuoc '11:00'`.
  - smoke `form link: one link per profile, prefilled with the latest profile`: admin opens profile `a`, taps "Gửi phiếu cho khách điền", copies; taps again → same URL (`window.__store` has one invite for `a` with `prefill.bride` = profile bride); edit `addrRest` in the profile to `Nhà hàng Mới`, save; open the URL in a fresh page → `Địa chỉ nhà hàng` field shows `Nhà hàng Mới`; profile `notes` text appears nowhere on the form.
- [ ] **Step 2:** `npx vitest run <file>`; `npm run smoke` → new ones FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `npm test && npm run smoke` → all pass.
- [ ] **Step 5: Commit** `feat(invite): one link per profile, prefill kept fresh, apply only changes`.

### Task 4: Form — show prefill, send base

**Files:**
- Modify: `web/src/form/FormApp.tsx`, `web/src/ui/Invites.tsx` (`SendFormSheet` uses `linkForWedding` for an existing profile; the select for kind only when creating a new profile)
- Test: `web/test/smoke.py`

- [ ] **Step 1: Failing smoke checks:**
  - `form opens prefilled`: seed invite with `prefill:{bride:'Ngân', addrRest:'Sảnh A', tRuoc:'09:30'}`, status `applied`, `answers:{note:'Mang hoa'}` → tap "Sửa hoặc bổ sung thông tin" → fields show `Ngân`, `Sảnh A`, `09:30`, note shows `Mang hoa`.
  - `form keeps pending answers`: status `submitted`, `prefill:{bride:'Ngân'}`, `answers:{bride:'Ngân Hà'}` → bride field `Ngân Hà`.
  - `form sends base`: fill the missing required fields, submit → stored invite has `base` equal to the seeded `prefill` and `answers` containing the new values.
- [ ] **Step 2:** `npm run smoke` → FAIL.
- [ ] **Step 3:** Initial state = `{kind, ...prefill, ...(status==='submitted' ? answers : { note: answers.note })}`; submit adds `base: prefill` filtered to `CLIENT_KEYS`.
- [ ] **Step 4:** `npm test && npm run smoke && npm run build && npm run size` → pass.
- [ ] **Step 5: Commit** `feat(form): open prefilled from the profile, send what the client saw`.

### Task 5: Docs and owner check

- [ ] **Step 1:** Update `PRODUCT.md`/`DESIGN.md` where they describe the client form link (one link per profile, prefilled, changed-only apply). Full gate: `npm test && npm run test:rules && npm run smoke && npm run build && npm run size`.
- [ ] **Step 2:** Screenshot at 390px: the profile's send sheet, and the form opened prefilled. Send to the owner; **stop for approval** before pushing.
