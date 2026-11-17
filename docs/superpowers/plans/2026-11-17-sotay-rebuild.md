# Sổ Tay Nhắc Việc v2 – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A fast, simple shared web app for MThanglee Studio. It covers per-ceremony wedding profiles, a public client form, reminders, a consult countdown, a product-link store with delivery deadlines, an admin summary and real role-based access. It runs on the free Firebase plan.

**Architecture:** A Vite + Preact + TypeScript SPA in a new `web/` folder.
- Pure domain logic (dates, deadlines, form rules, message templates) lives in `web/src/domain/` and is unit-tested with Vitest.
- Firestore is accessed only through `web/src/data/`, and roles are enforced by `firestore.rules`.
- The public client form is a second entry (`web/form.html`). It reads and writes a single invite document by its unguessable token, with no login.
- **Demo hosting is GitHub Pages** (`https://mthanglee97dnvn.github.io/sotay/`), the existing pipeline. It needs no deploy secrets, and its origin is already authorized for Google sign-in. The old app moves to `/sotay/cu/` until migration is confirmed.
- The custom domain is attached to Pages later (CNAME file + DNS). The domain must then be added to Firebase Auth authorized domains and to the OAuth client's JS origins.
- *(Deviation from spec §6 "Firebase Hosting": Hosting deploys need a service-account secret, which spec §3 forbids Claude from entering. Pages keeps the popup sign-in that already works on iPhone.)*

**Tech Stack:** Vite 6, Preact 10 + @preact/signals, TypeScript strict, firebase 12 modular (auth, firestore with persistentLocalCache), Vitest, @firebase/rules-unit-testing + Firestore emulator, Playwright for the smoke test.

**Spec:** `docs/superpowers/specs/2026-11-17-sotay-rebuild-design.md`

## Global Constraints
- Free plan only (Spark): Auth + Firestore. No Cloud Functions, no Blaze, nothing needing a card.
- Google sign-in is mandatory for the app. The client form page (`form.html`) needs no login.
- Must work on iPhone/iPad Safari (including home-screen mode), Android Chrome, and desktop Chrome/Cốc Cốc.
- All UI text is Vietnamese. Client-facing messages say "anh" for the studio and "em"/"hai em" for the client, in a casual, warm tone, never "anh chị".
- Visual tokens come from `DESIGN.md`: paper background, lens blue accent, red **only** for overdue.
- Roles:
  - `admin`: exactly one, the first Gmail to sign in to an empty org.
  - `editor`: "Được sửa".
  - `viewer`: "Chỉ xem".
  - Not in the roles map: the "Bạn chưa được mời" screen.
  - Rules must block writes, not just hide buttons.
- Max 20 members.
- Delivery deadlines: photo 7–10 days, video 25–30 days after the ceremony date. Photo-only jobs have no video.
- Consult reminder lead time: 45 days before the ceremony (admin can change it).
- One profile per ceremony (per day). Ceremony kinds: `Cưới`, `Đính hôn` (includes Ăn hỏi), `Tiệc báo hỷ`.
- Do not store who shoots or films; that is in Framevis.
- Performance targets:
  - First load ≤ 150 KB gzipped JS for `index.html`.
  - Usable in < 2 s on 4G.
  - Works offline from the Firestore cache.
- Google scopes: only `https://www.googleapis.com/auth/calendar.events`, requested lazily, never at sign-in.
- Do not hardcode any personal email in code. Claude never types passwords or secrets.
- All dates are computed in `Asia/Ho_Chi_Minh` regardless of device time zone.
- Existing Firebase config: `firebase-config.json` (project `sotay-mthanglee`). Org id is `mthanglee`.

## Review Focus
1. **The client opens the invite link again after submitting.** The form shows their answers and lets them resubmit until staff have applied them. After that, it shows "Anh đã nhận thông tin, cảm ơn hai em!" (Task 6).
2. **The device is in another time zone, or the profile is viewed at 23:30.** The countdown and "today" use Vietnam dates, so they never go off by one day (Task 2).
3. **A viewer edits while offline.** The local write is rejected when the device syncs, so the UI must show "Bạn chỉ có quyền xem" and reload the server value instead of silently keeping a wrong local value (Task 4/5).
4. **Searching without diacritics.** "lan" finds "Lân", and "nguyen" finds "Nguyễn" (Task 2/5).
5. **Gmail spelled with capitals.** "Vo.Anh@Gmail.com" added by the admin must match the signed-in "vo.anh@gmail.com". Emails are lowercased everywhere, in code and in rules (Task 3/4).

---

## File Structure

```
web/
  index.html            app entry
  form.html             public client form entry
  vite.config.ts        base '/sotay/', two inputs, manifest
  public/manifest.webmanifest, icons (copy from resources/)
  src/
    styles.css          tokens from DESIGN.md + components
    firebase.ts         init app/auth/firestore (persistentLocalCache)
    domain/
      vn-date.ts        Vietnam-date helpers
      ceremony.ts       kinds, form field rules
      delivery.ts       deadline status
      consult.ts        consult due + message
      search.ts         accent-insensitive match
      migrate.ts        old export JSON -> v2 records (pure)
      types.ts          Wedding, Task, Invite, Org, Role
    data/
      org.ts            sign-in, role, members
      weddings.ts       live list + CRUD
      tasks.ts          live list + CRUD
      invites.ts        create / read / submit / apply
      gcal.ts           Google Calendar event sync (port of src/bridge.js)
    ui/
      App.tsx, Shell.tsx (bottom nav + FAB), Upcoming.tsx, WeddingSheet.tsx,
      Tasks.tsx, Store.tsx, More.tsx (Summary, Members, Settings, Import), Toast.tsx
    form/FormApp.tsx    public form UI
  test/                 *.test.ts (vitest), rules.test.ts (emulator), smoke.spec.ts (playwright)
firestore.rules         replaced: v1 team rules kept + v2 rules added
.github/workflows/build.yml   web job builds web/ → Pages root, old app → /cu/
```

## Data Model (Firestore)
All emails are lowercased.
- `orgs/mthanglee`: `{ admin: string, roles: { [email]: 'editor'|'viewer' }, consultLeadDays: number, createdAt }`
- `orgs/mthanglee/weddings/{id}`:
  ```
  {
    kind, date: 'YYYY-MM-DD', bride, groom, phoneBride, phoneGroom,
    addrBride, addrGroom, addrRest,
    times: { tMakeup?, tDepart?, tArrive?, tRuoc?, tWelcome?, tParty? },
    channel: { kind: 'fb'|'fanpage'|'zalo'|'instagram'|'other', url },
    notes, hasVideo: boolean, consultDone: boolean,
    photo: { link, history: {link, at}[], deliveredAt? },
    video: { … same shape },
    coupleKey, createdByEmail, updatedAt
  }
  ```
- `orgs/mthanglee/tasks/{id}`: `{ title, body, due: number|null, done, weddingId: string|null, assigneeEmail: string|null, createdByEmail, updatedAt }`
- `orgs/mthanglee/unmatched/{id}`: old delivery links with no matching profile `{ name, day, link, video, raw }`.
- `invites/{token}` (top level, token = 32 random base62 chars):
  ```
  {
    org: 'mthanglee', weddingId, kind,
    status: 'open'|'submitted'|'applied',
    answers: map, submittedAt, seen: boolean,
    createdByEmail, createdAt
  }
  ```

---

### Task 1: Scaffold web app + deploy pipeline

**Files:**
- Create: `web/package.json`, `web/vite.config.ts`, `web/tsconfig.json`, `web/index.html`, `web/form.html`, `web/src/styles.css`, `web/src/firebase.ts`, `web/src/ui/App.tsx`, `web/test/config.test.ts`
- Modify: `.github/workflows/build.yml` (web job)

**Interfaces:**
- Produces: `app`, `auth`, and `db` exported from `web/src/firebase.ts`. CSS custom properties from DESIGN.md: `--paper`, `--ink`, `--lens`, `--late`, and so on, using DESIGN.md's names.

- [ ] **Step 1:** In `web/`, run `npm create vite` (preact-ts template). Then add `firebase @preact/signals`, plus dev dependencies `vitest @firebase/rules-unit-testing firebase-tools @playwright/test`. Scripts: `dev`, `build` (`tsc --noEmit && vite build`), `test` (`vitest run`), `test:rules` (`firebase emulators:exec --only firestore "vitest run test/rules.test.ts"`), `size` (gzip size of `dist/assets/index-*.js`, fails over 150 KB).
- [ ] **Step 2:** Set `vite.config.ts` to `base: '/sotay/'` with `build.rollupOptions.input = { index: 'index.html', form: 'form.html' }`. `firebase.ts` reads config from `../firebase-config.json`, calls `initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })`, and sets `auth` language to `vi`.
- [ ] **Step 3:** Write `web/test/smoke.test.ts`. It asserts that `formatVersion()` exists, as a trivial placeholder so `vitest run` exits 0. Run `npm test`. Expected: PASS.
- [ ] **Step 4:** Update the workflow web job:
  - `cd web && npm ci && npm test && npm run build && npm run size`
  - build the old app (`npm run build` at the root) into `_site/cu/`
  - copy `web/dist/*` into `_site/`
  - upload the Pages artifact
  - keep the iOS job untouched
- [ ] **Step 5:** Run `cd web && npm run build && npm run size`. Expected: a size line under 150 KB.
- [ ] **Step 6:** Commit with `feat(web): scaffold v2 app and Pages pipeline`. Push. Open `https://mthanglee97dnvn.github.io/sotay/cu/` and confirm the old app still loads (the old app stays reachable for export).

### Task 2: Domain logic (pure, TDD)

**Files:**
- Create: `web/src/domain/{types,vn-date,ceremony,delivery,consult,search}.ts`
- Tests: `web/test/domain.test.ts`

**Interfaces (Produces):**
```ts
type Role = 'admin'|'editor'|'viewer'
type Kind = 'Cưới'|'Đính hôn'|'Tiệc báo hỷ'
todayVN(now?: Date): string                 // 'YYYY-MM-DD' in Asia/Ho_Chi_Minh
daysUntil(date: string, now?: Date): number  // calendar days, VN
fieldsFor(kind: Kind): FieldDef[]           // {k,l,type,req,hint,sec?}
deliveryStatus(w: Wedding, part: 'photo'|'video', now?: Date):
  'na'|'waiting'|'due-soon'|'late'|'done'
consultDue(w: Wedding, leadDays: number, now?: Date): boolean
consultMessage(w: Wedding, now?: Date): string
ekipReminder(w: Wedding, part: 'photo'|'video', now?: Date): string
norm(s: string): string                     // lowercase, strip diacritics, đ→d
matches(w: Wedding, q: string): boolean     // bride, groom, phones, date dd/mm
```

- [ ] **Step 1: Write failing tests** in `domain.test.ts`:
  - `todayVN(new Date('2026-11-17T17:30:00Z')) === '2026-11-18'`
  - `daysUntil('2026-12-20', new Date('2026-11-17T03:00:00Z')) === 33`
  - Field rules (spec §6 and `src/app.html:1897-1915`):
    - `fieldsFor('Đính hôn')` has no `tRuoc` and no `addrRest`.
    - `fieldsFor('Tiệc báo hỷ')` keys equal exactly `['kind','bride','groom','phoneBride','phoneGroom','date','addrRest','tWelcome','tParty']`, and `addrRest.req === true`.
    - `fieldsFor('Cưới')` includes `tRuoc` and `addrRest`.
  - Photo status for a wedding dated `2026-11-01`:
    - `waiting` at 11-05
    - `due-soon` at 11-08 (day 7)
    - `due-soon` at 11-11 (day 10)
    - `late` at 11-12
    - `done` once `photo.deliveredAt` is set
  - Video status:
    - `na` when `hasVideo` is false
    - `due-soon` at day 25
    - `late` at day 31
  - Consult due:
    - `consultDue` is true at 45 days with lead 45, false at 46, and false when `consultDone` is set.
    - It is also false for past dates.
  - `consultMessage` contains `Còn khoảng 33 ngày nữa`, contains `20/12/2026`, starts with `Chào em! Anh bên MThanglee Studio`, and does not contain `anh chị`. The template is `src/app.html:2785` with `{con}` replaced by `N ngày` (or `N tuần` when N ≥ 14, rounded) and `{ngay}` by dd/mm/yyyy.
  - `ekipReminder(w,'photo')` contains the couple names, the ceremony date and the photo deadline date (date + 10 days, dd/mm). It mentions "ảnh", and it contains no client-facing "em".
  - Search: `matches(w({bride:'Lân'}),'lan')`, `matches(w({groom:'Nguyễn Đức'}),'nguyen duc')` and `matches(w({phoneBride:'0905 123 456'}),'0905123')` are all true.
- [ ] **Step 2:** Run `npx vitest run test/domain.test.ts`. Expected: FAIL (modules missing).
- [ ] **Step 3:** Implement with `Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh'})` for VN dates. Field labels and hints are copied verbatim from `src/app.html:1897-1915`. Tiệc báo hỷ adds `tWelcome` ("Giờ đón khách") and `tParty` ("Giờ đãi tiệc").
- [ ] **Step 4:** Run the tests again. Expected: PASS.
- [ ] **Step 5:** Commit with `feat(domain): dates, ceremony fields, deadlines, consult, search`.

### Task 3: Firestore rules v2 + emulator tests

**Files:**
- Modify: `firestore.rules` (keep the existing `teams/**` and `data/users/**` blocks unchanged; append the v2 blocks)
- Test: `web/test/rules.test.ts`, `web/firebase.json` (emulator config pointing at `../firestore.rules`)

**Interfaces:**
- Produces the rules contract used by Tasks 4–10:
  - `orgs/{org}`:
    - read by admin or anyone in `roles`
    - create only when `request.resource.data.admin == lower(auth.email)` and `roles == {}`
    - update only by admin
    - `request.resource.data.admin` is unchanged
    - `roles.size() <= 19`
  - `orgs/{org}/{coll}/{id}` for `coll in [weddings, tasks, unmatched]`: read by admin/editor/viewer; write by admin/editor.
  - `invites/{token}`:
    - `get` by anyone; `list` only by admin/editor of `resource.data.org`
    - create by admin/editor, with `status=='open'`
    - unauthenticated update only when `resource.data.status in ['open','submitted']`
    - that update may change only the keys `answers`, `status`, `submittedAt` and `seen`, with `status=='submitted'`, `seen==false`, and `answers.size() <= 40`
    - each answer is a string ≤ 1000 chars (check the known keys `fieldsFor` lists; reject others)
    - any change by admin/editor
  - Every check requires `auth.token.email_verified == true` and uses `auth.token.email.lower()`.

- [ ] **Step 1: Write failing tests** in `rules.test.ts` with `initializeTestEnvironment`. Seed the org with `admin: 'boss@x.com'`, `roles: {'wife@x.com':'editor','view@x.com':'viewer'}`. Expected results:
  - **Viewer:** read wedding succeeds; write wedding fails.
  - **Editor:** write wedding succeeds; update org roles fails.
  - **Admin:** update roles succeeds; changing `admin` fails.
  - **Stranger:** read wedding fails.
  - Uppercase-email token `Wife@X.com` can write.
  - `email_verified:false` fails.
  - **Unauthenticated:**
    - get invite succeeds; list invites fails
    - submit an open invite with answers succeeds
    - set `weddingId` fails
    - submit an `applied` invite fails
    - a 1001-char answer fails
  - Creating the org on empty: `admin == me` with `roles == {}` succeeds; `admin == other` fails.
- [ ] **Step 2:** Run `cd web && npm run test:rules`. Expected: FAIL. If the emulator jar download is blocked by the network, record that in the task report and keep the tests. The executor then verifies them once in CI by adding a `rules` job (`setup-java@v4`, temurin 21) to the workflow.
- [ ] **Step 3:** Write the rules.
- [ ] **Step 4:** Run `npm run test:rules`. Expected: all PASS.
- [ ] **Step 5:** Commit with `feat(rules): v2 roles and public invites`.
- [ ] **Step 6:** Publishing happens in Task 11, through the Firebase console. The admin approves; Claude pastes only the rules text, which is not a secret.

### Task 4: Sign-in, roles, members

**Files:**
- Create: `web/src/data/org.ts`, `web/src/ui/Shell.tsx`, `web/src/ui/Toast.tsx`, members part of `web/src/ui/More.tsx`
- Test: `web/test/org.test.ts` (pure parts)

**Interfaces:**
- Produces:
  - `me: Signal<{email,name}|null>`
  - `role: Signal<Role|null|'loading'>`
  - `orgDoc: Signal<Org|null>`
  - `signIn(): Promise<void>` (popup; falls back to `signInWithRedirect` if the popup is blocked)
  - `signOut()`
  - `setRole(email, role|null)` (admin only)
  - `canEdit(): boolean`
  - `roleOf(org: Org, email: string): Role|null` (pure)
  - `toastWriteError(e)` maps `permission-denied` to "Bạn chỉ có quyền xem – thay đổi chưa được lưu"
- Write wrapper: every write in `data/*` goes through `guardedWrite(fn)` in `org.ts`. It awaits the server ack, and on rejection calls `toastWriteError` and triggers a refetch of that doc.

- [ ] **Step 1: Failing tests:**
  - `roleOf({admin:'a@x.com',roles:{'b@x.com':'viewer'}},'B@X.com') === 'viewer'`
  - `roleOf(..., 'a@x.com') === 'admin'`
  - unknown email → `null`
  - `setRoleLocal(org,'C@x.com','editor')` lowercases the key and rejects a 20th member with `Error('Tối đa 20 người')`
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. On sign-in, `onSnapshot(orgs/mthanglee)`. If the doc doesn't exist, create it with `admin = me` (first sign-in claims admin). Screens:
  - `role === null` → the "Bạn chưa được mời. Nhờ anh Thắng thêm Gmail của bạn." screen with a "Đăng xuất" button.
  - Members screen: list with a role select (Được sửa / Chỉ xem / Xoá) and an "Thêm Gmail" input.
  - Shell: bottom nav `Sắp tới · Việc · Kho sản phẩm · Thêm`, and a FAB "+" (hidden for viewers) with `Thêm lễ`, `Gửi phiếu cho khách`, `Thêm việc`.
- [ ] **Step 4:** Run the tests. Expected: PASS. Run `npm run build`. Expected: OK.
- [ ] **Step 5:** Commit with `feat(auth): sign-in, roles, members`.

### Task 5: Weddings – Sắp tới screen, profile, second ceremony, search

**Files:**
- Create: `web/src/data/weddings.ts`, `web/src/ui/Upcoming.tsx`, `web/src/ui/WeddingSheet.tsx`
- Test: `web/test/weddings.test.ts`

**Interfaces:**
- Consumes: `fieldsFor`, `daysUntil`, `consultDue`, `consultMessage`, `deliveryStatus`, `matches`, `guardedWrite`, `canEdit`
- Produces:
  - `weddings: Signal<Wedding[]>` (live, sorted by date)
  - `saveWedding(w: Partial<Wedding>&{id?}): Promise<string>`
  - `deleteWedding(id)`
  - `siblingDraft(w: Wedding): Partial<Wedding>`
  - `upcomingChips(ws, tasks, leadDays, now): {consult:number, late:number, today:number, newForms:number}` (pure)
  - `channelUrl(w): string`

- [ ] **Step 1: Failing tests:**
  - `siblingDraft(w)` copies `bride, groom, phoneBride, phoneGroom, channel, coupleKey`, and leaves out `id, date, kind, times, photo, video, consultDone`.
  - `coupleKey` is created on first save as `norm(bride+'|'+groom)`.
  - `upcomingChips` counts:
    - consult-due weddings
    - weddings with photo or video `late`
    - undone tasks due today (VN)
    - `newForms` from an injected invite count
  - `channelUrl` returns `channel.url`, or `https://business.facebook.com/latest/inbox/all` when the kind is fanpage and there is no url.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
  - **Upcoming screen:**
    - Top chips (tap filters the list).
    - A search box using `matches`.
    - The list shows future and today's ceremonies, followed by a collapsed "Đã qua" section.
    - Each row: date + weekday, couple names, kind tag, `còn N ngày`.
  - **WeddingSheet:**
    - Fields come from `fieldsFor(kind)`, with `hasVideo` as a "Có quay phim" toggle.
    - Consult block: "Soạn tin hẹn tư vấn" copies `consultMessage` and opens `channelUrl`; "Đã tư vấn" sets `consultDone`.
    - "Thêm lễ khác cho cặp này" opens a new sheet prefilled with `siblingDraft`.
    - Profiles with the same `coupleKey` are listed as "Lễ khác của cặp này".
    - Viewers get read-only fields.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit with `feat(weddings): upcoming, profile, sibling ceremony, search`.

### Task 6: Public client form + "phiếu mới"

**Files:**
- Create: `web/src/data/invites.ts`, `web/src/form/FormApp.tsx`, `web/src/form/main.tsx`
- Test: `web/test/invites.test.ts`

**Interfaces:**
- Consumes: `fieldsFor`, `saveWedding`
- Produces:
  - `createInvite(weddingId|null, kind): Promise<{token, url}>`, where url = `${location.origin}/sotay/form.html#${token}`. If `weddingId` is null, an empty wedding with `kind` is created first.
  - `inviteMessage(kind, url)`: the template from `src/app.html:1469`, extended to Tiệc báo hỷ wording.
  - `newInvites: Signal<Invite[]>`: status `submitted` and `seen == false`.
  - `applyInvite(inv): Promise<void>`: merges only the non-empty answers into the wedding, then sets status `applied` and seen true.
  - `mergeAnswers(w, answers): Partial<Wedding>` (pure)

- [ ] **Step 1: Failing tests:**
  - `mergeAnswers` keeps existing values when an answer is empty, maps keys per `fieldsFor`, and trims strings.
  - The token is 32 chars from `[0-9A-Za-z]`, generated from `crypto.getRandomValues`.
  - `inviteMessage('Tiệc báo hỷ', u)` contains `tiệc báo hỷ` and `u`, and does not contain `anh chị`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
  - **FormApp** (no auth import):
    - `getDoc(invites/token)` and render `fieldsFor(kind)`.
    - Validate required fields, then submit with `updateDoc({answers,status:'submitted',submittedAt:serverTimestamp(),seen:false})`.
    - After submit, and on reopen: if `submitted`, show the answers with "Sửa và gửi lại". If `applied`, show "Anh đã nhận thông tin, cảm ơn hai em!".
    - A missing token shows "Link không đúng, em nhắn lại anh để lấy link mới nhé".
    - `form.html` must not bundle `firebase/auth`; check with `npm run build` that the form chunk stays ≤ 80 KB gzip.
  - **In the app:**
    - On open, if `newInvites.length > 0`, show a banner "Bạn có n phiếu mới" on Sắp tới. The banner opens a list; each item shows the answers with an "Đưa vào hồ sơ" button that calls `applyInvite`.
    - The FAB "Gửi phiếu cho khách" creates an invite and copies `inviteMessage`.
- [ ] **Step 4:** Run the tests and build. Expected: PASS; form chunk ≤ 80 KB.
- [ ] **Step 5:** Commit with `feat(invites): public client form and new-form banner`.

### Task 7: Tasks + reminders + Google Calendar

**Files:**
- Create: `web/src/data/tasks.ts`, `web/src/data/gcal.ts`, `web/src/ui/Tasks.tsx`
- Test: `web/test/tasks.test.ts`, `web/test/gcal.test.ts`

**Interfaces:**
- Consumes: `guardedWrite`, `me`, `todayVN`
- Produces:
  - `tasks: Signal<Task[]>`
  - `saveTask`, `toggleDone`, `deleteTask`
  - `groupTasks(ts, now): {late, today, upcoming, noDate, done}` (pure)
  - `isMine(t, email, adminEmail)`: assignee, else creator, else admin (same rule as `src/bridge.js` `SOTAY_isMine`)
  - `eventFor(t, wedding?): gcal Event` (pure). Shape: summary = title (+ couple names), start/end = due..due+30min with `Asia/Ho_Chi_Minh`, popup reminder 0 min, `extendedProperties.private = {sotayApp:'2', sotayId:t.id, sig}`.
  - `planSync(mineTasks, existingEvents): {create, update, delete}` (pure)
  - `syncCalendar(): Promise<void>`

- [ ] **Step 1: Failing tests:**
  - `groupTasks` with VN dates (a task due at 23:50 VN on the 17th is "today" on the 17th).
  - `isMine` covers the three cases.
  - `planSync`:
    - creates for tasks without an event
    - updates when `sig` differs
    - deletes events whose task is done, deleted, or no longer mine
    - ignores events without `sotayApp`
  - `eventFor` has no attendees.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
  - `gcal.ts` ports the GIS token client from `src/bridge.js`: `initTokenClient`, then `requestAccessToken` called synchronously inside the click handler of the "Bật nhắc trên Google Lịch" button and the capture-phase handler. The token is cached in `sessionStorage` with its expiry.
  - The scope is **only** `calendar.events`. The Web OAuth client id is the one in `src/bridge.js` (`WEB_CLIENT_ID`).
  - Sync runs while the app is open: on change, debounced 3 s, with a re-run flag if a change arrives mid-sync.
  - While the app is open, local reminders use a `setTimeout` toast + `Notification` (if granted) at `due`.
  - Tasks screen: groups, quick add (title + optional date/time + optional wedding link), assignee select from members.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit with `feat(tasks): tasks, reminders, Google Calendar events`.

### Task 8: Kho sản phẩm

**Files:**
- Create: `web/src/ui/Store.tsx`; add `setLink(id, part, link)`, `markDelivered(id, part, on)` to `web/src/data/weddings.ts`
- Test: extend `web/test/weddings.test.ts`

**Interfaces:**
- Consumes: `deliveryStatus`, `ekipReminder`, `matches`
- Produces:
  - `withNewLink(w, part, link, now): Partial<Wedding>` (pure): pushes the old link into `history`, then sets the new one.
  - `storeBuckets(ws, now): {late, dueSoon, waiting, done}` (pure)

- [ ] **Step 1: Failing tests:**
  - `withNewLink` keeps the previous link in `history` with its timestamp, and does not duplicate it when the link is unchanged.
  - `storeBuckets` places items by the worst of the photo/video statuses, and past weddings only. Overdue sorts the oldest first.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement the screen:
  - Tabs `Cần giao` (late + due-soon + waiting) and `Đã giao`, plus search.
  - Each card: couple, date, photo/video rows with status text (`Còn 2 ngày tới hạn`, `Trễ 3 ngày` in `--late` red), a link field, "Mở", "Đã giao" and "Sao chép tin nhắc" (`ekipReminder`), and "Link cũ (n)" expandable.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit with `feat(store): product link store with deadlines`.

### Task 9: Tóm tắt (admin only) + Settings

**Files:**
- Modify: `web/src/ui/More.tsx`
- Create: `web/src/domain/summary.ts`
- Test: `web/test/summary.test.ts`

**Interfaces:**
- Produces: `summarize(ws, tasks, leadDays, now): {byMonth: {month:'MM/YYYY', count}[], consultDue, late, dueSoon, openTasks}`

- [ ] **Step 1: Failing test:** with 3 weddings across Nov/Dec 2026, `byMonth` returns the next 6 months including zero months; the counts match the Task 2 helpers.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
  - The "Thêm" screen: `Tóm tắt` and `Thành viên` appear only when `role==='admin'`.
  - `Cài đặt` (admin): consult lead days.
  - `Cài đặt` (all users): Google Calendar on/off and sign-out.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit with `feat(summary): admin summary and settings`.

### Task 10: Import old data

**Files:**
- Create: `web/src/domain/migrate.ts`; import UI in `More.tsx` (admin only, "Nhập dữ liệu cũ (.json)")
- Test: `web/test/migrate.test.ts` with fixture `web/test/fixtures/old-export.json`, a hand-made sample in the old export shape

**Interfaces:**
- Consumes: the old export format from `src/app.html:1146-1151`: `{app:'sotay-nhac-viec', version:1, data:{'sotay-items':Item[], 'sotay-deliv':{[key]:{link,video,day,at,hist,…}}, 'sotay-resp':{[formId]:{rows}}, 'sotay-consult':{lead}}}`. Read the field use in `src/app.html` (items around `openEditor`, delivery at 2330-2370, responses at 1640-1680) to fill the fixture faithfully.
- Produces:
  - `migrate(exportJson, existing: Wedding[], email): {weddings: Wedding[], tasks: Task[], unmatched: Unmatched[], report: {weddings, tasks, linked, unmatched, skipped}}` (pure)
  - `id` is deterministic: a hash of the source key. Importing the same file twice creates no duplicates.

- [ ] **Step 1: Failing tests:**
  - Every non-deleted item becomes a Task with `weddingId:null`, keeping `title`, `body`, `due`, `done` and `assigneeEmail`.
  - Each form response row becomes a Wedding (kind, date, names, phones, addresses, times).
  - Each delivery record links to the wedding whose `norm(names)` is contained in `norm(key)` and whose date equals `day`. It sets `photo.link` / `video.link` and moves `hist` into `history`; otherwise it goes to `unmatched`.
  - Running `migrate` twice over its own output yields `report.weddings === 0`.
  - Rejects JSON whose `app !== 'sotay-nhac-viec'` with `Error('File không phải dữ liệu Sổ Tay')`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
  - Batched writes (≤ 400 per batch) after an on-screen preview showing the report counts and an "Nhập" button.
  - A "Chưa ghép" list in Kho sản phẩm. Each unmatched item has a "Ghép vào hồ sơ…" picker, which calls `setLink` and deletes the unmatched item.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit with `feat(import): migrate old exports`.

### Task 11: PWA, performance, smoke test, publish

**Files:**
- Create: `web/public/manifest.webmanifest`, `web/test/smoke.spec.ts` (Playwright, Firebase calls stubbed via `page.route` like `test/mock-firebase.js`), `web/README.md` (Vietnamese: custom-domain steps)

- [ ] **Step 1:** Write the smoke test. At iPhone 14 viewport, with a mocked signed-in editor:
  - Sắp tới renders chips.
  - Open a wedding, add a ceremony for the same couple, and see it under "Lễ khác của cặp này".
  - Kho sản phẩm shows a late item in red.
  - The viewer role has no FAB.
  - `form.html#tok` renders the Tiệc báo hỷ field set and submits.
  - No console errors.
- [ ] **Step 2:** Run `npx playwright test`. Expected: PASS. Run `npm run size`. Expected: under 150 KB.
- [ ] **Step 3:** Add the manifest (name "Sổ Tay Nhắc Việc", `display: standalone`, theme from `--paper`, icons from `resources/`), add `apple-touch-icon`, and take screenshots of the 4 tabs (light + dark, 390 px and 1280 px). Review them against DESIGN.md and fix issues in one batch.
- [ ] **Step 4:** Commit and push. Confirm the Pages deploy succeeds.
- [ ] **Step 5:** With the admin watching in the built-in browser, open Firebase console → Firestore → Rules, paste `firestore.rules`, and have the admin click **Publish**. Then sign in on `https://mthanglee97dnvn.github.io/sotay/` and confirm the org is created with admin = the signed-in Gmail.
- [ ] **Step 6:** Hand off. The admin exports from the old app (`/sotay/cu/` and the Claude version) via "Xuất dữ liệu" and imports in v2. Send the iPhone link.

---

## Self-review notes
- Spec coverage:
  - §2.1 → Tasks 2 and 5
  - §2.2 → Task 6
  - §2.3 → Task 7
  - §2.4 → Tasks 2 and 5
  - §2.5 → Task 8
  - §2.6 → Task 9
  - roles → Tasks 3 and 4
  - non-goals respected: no ekip, no Calendar tab, no Sheets
  - anti-goals → lazy scopes in Task 7, size budget in Tasks 1 and 11, rules in Task 3, import in Task 10
- Spec §5 decisions (one profile per ceremony, new-form banner) → Tasks 5 and 6.
- Hosting deviation stated in Architecture.
