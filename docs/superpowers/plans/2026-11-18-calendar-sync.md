# Calendar Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The admin's Google Calendar bookings (the FrameVis Bookings calendar plus the primary calendar) become and stay Sổ Tay wedding profiles, with the calendar as the source of truth.

**Architecture:** The work splits into three layers.
- **Pure domain:** `domain/calparse.ts` turns one Google Calendar event into booking fields. `domain/calsync-plan.ts` decides which profiles to create, patch or mark cancelled. Both are fully unit-tested on real event samples.
- **Data:** `data/calsync.ts` runs only for the admin. It reuses the Google Identity Services (GIS) token from `data/gcal.ts`, lists events of both calendars, and writes only changed profiles in batches.
- **UI:** synced fields are read-only, the profile shows the calendar's original notes, and Sắp tới gets a status line and a "Đồng bộ lịch" button. Cancelled profiles are hidden from Sắp tới.

**Tech Stack:** Existing web/ app (Vite + Preact + TS, Firestore, GIS token, scope `calendar.events`), Vitest, Python Playwright smoke.

**Spec:** `docs/superpowers/specs/2026-11-18-calendar-sync-design.md`

## Global Constraints
- Calendars:
  - `primary`
  - FrameVis Bookings: `8be6adaa55c616c63c7a632f1689bc68254a176505b575d3178e79a03f69de2c@group.calendar.google.com`
  - The FrameVis calendar id is stored as `orgs/mthanglee.framevisCalId`, which the admin can edit. The default above is used when unset.
- Read window: start 60 days ago, end 400 days ahead (`timeMin` / `timeMax`), `singleEvents=true`.
- Only scope `https://www.googleapis.com/auth/calendar.events`. No calendarList calls.
- Skip:
  - events whose `extendedProperties.private.sotayApp` is set;
  - events whose title doesn't match the booking pattern;
  - all-day or untimed events without `start.dateTime` (use `start.date` only if dateTime is absent);
  - "Thôi Nôi…" and similar titles, which have no `/ Kênh (` part.
- Calendar fields never overwrite a non-empty app value with an empty calendar value.
- App-only fields are never touched by sync: `consultDone`, `photo`, `video`, `notes`, `channel.url`.
- Sync runs only when `role === 'admin'`: on app open, then every 30 minutes while open, plus a manual button.
- Firestore writes happen only for profiles whose synced fields' signature changed.
- All UI copy is Vietnamese.

## Review Focus
1. **A booking moved to another day in Framevis** must update the same profile's date, not create a second one. The profile id derives from calendarId + eventId (Task 2 test).
2. **The same couple in both calendars on the same day**, for example Kim Ngân, appears once (Task 2 test). Two different couples on the same day with no phone and the same first name must not merge, so names are compared in full after removing diacritics (Task 2 test).
3. **An HTML description** with `<p>`, `<br>`, `&amp;` or ` ` parses the same as plain text (Task 1 test).
4. **The calendar loads before Firestore has loaded weddings:** the sync must not create duplicates. It waits for `weddingsReady` (Task 3).
5. **An event deleted in Framevis:** its profile gets `cancelled: true` and is hidden from Sắp tới, but keeps its links in Kho sản phẩm. If it reappears later, the flag clears (Task 2 test).

---

### Task 1: Booking parser

**Files:** Create `web/src/domain/calparse.ts`. Test: `web/test/calparse.test.ts`, with fixtures copied from the real events seen on 2026-11-18 (titles and descriptions only, no attendees).

**Interfaces:**
- Produces:
  - `type CalEvt = { id: string; summary?: string; description?: string; status?: string; start?: { dateTime?: string; date?: string }; extendedProperties?: { private?: Record<string, string> } }`
  - `interface Booking { kind: Kind; date: string; bride: string; groom: string; phoneBride: string; phoneGroom: string; addrBride: string; addrGroom: string; addrRest: string; times: Partial<Record<TimeKey,string>>; hasVideo: boolean; channelKind: ChannelKind; clientName: string; clientPhone: string; bookingId: string; calNote: string; title: string }`
  - `parseBooking(e: CalEvt): Booking | null`
  - `plainText(html: string): string`

- [ ] **Step 1: Write failing tests:**
  - **Title:**
    - `"Trọn gói ngày cưới cơ bản - Tường Vy / IG (2 Quay + 2 Chụp)"` gives kind `Cưới`, hasVideo true, channelKind `instagram`, clientName `Tường Vy`.
    - `"Tiệc Báo Hỷ Nâng Cao - Nguyễn Bảo Ngọc / FB (2 Chụp)"` gives `Tiệc báo hỷ`, hasVideo false, channelKind `fb`.
    - `"Đính hôn - Thục Anh Nguyễn / ZALO ( 2 Chụp )"` gives `Đính hôn` and channelKind `zalo`.
    - `"Phóng sự cưới - Thanh Ngọc / Page (2 Chụp)"` gives channelKind `fanpage`.
    - `"Hôn Phối Phóng Sự - Tiệc Báo Hỷ - Trọn Gói Cơ Bản - Hải Yến / Page - Hôn Phối Phóng Sự - Tiệc Báo Hỷ - Hải Yến / Page (2 Chụp)"` gives `Tiệc báo hỷ` and clientName `Hải Yến`.
    - `"Thôi Nôi - Jeny My"` gives null.
    - An event with `extendedProperties.private.sotayApp = '2'` gives null.
  - **Date:** `start.dateTime "2026-11-24T06:00:00+07:00"` gives date `2026-11-24`. A 05:30 VN event stays on the same VN day.
  - **FrameVis description** (Lâm Hoàng Thắng sample):
    - bride `Thục Đoan`, groom `Hoàng Thắng` (from "TIMELINE / THỤC ĐOAN - HOÀNG THẮNG", converted to title case);
    - addrGroom `34 Tiểu La, phường Hoà Cường, Đà Nẵng`, phoneGroom `0905375721`, addrBride `03 Thanh Lương 01, Đà Nẵng`, phoneBride `0702484591`;
    - addrRest `For You Luxury tầng 2`;
    - times `{ tArrive: '07:30', tParty: '11:00' }`;
    - clientPhone `0905375721`, bookingId `bkRJVE9P3877220Q`.
  - **HTML description** (Thanh Ngọc sample, `<p>` and `<br>`):
    - groom phone `0931922399`, bride phone `0898628629`;
    - addrRest begins `For you`, times.tParty `17:00`, times.tArrive `09:00`.
  - **Plain description** (Minh Trang sample): times.tMakeup `08:00`. The value "8H Hoàn Thiện ( 7h00 Photo có mặt )" takes the first time.
  - **Fallbacks:**
    - "BÁO GIÁ 2026" only: bride = clientName from the title, groom ''.
    - FrameVis without a timeline: bride = name from "Khách: Trương Thanh Tâm & Trần Văn Quốc Nguyên" gives bride `Trương Thanh Tâm`, groom `Trần Văn Quốc Nguyên`.
  - **Time parsing:** `"7H30"` gives `07:30`, `"3h30p"` gives `03:30`, `"7:30"` gives `07:30`, `"2h-4h hoàn thiện"` gives `02:00`, an empty value gives no key.
  - **calNote:** equals `plainText(description)` trimmed, and ` ` becomes a newline.
- [ ] **Step 2:** Run `cd web && npx vitest run test/calparse.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3:** Implement.
  - **Title:** match the last occurrence of `- NAME / CHANNEL ( ... )`. The package is the text before that name segment.
  - **Kind:**
    - `norm(pkg)` containing `bao hy` gives Tiệc báo hỷ;
    - `dinh hon|an hoi|dam hoi` gives Đính hôn;
    - otherwise Cưới.
  - **Video:** `/quay/i` inside the parentheses.
  - **Channel** (normalized lowercase): `fb` gives fb, `page|fanpage` gives fanpage, `ig|insta` gives instagram, `zalo` gives zalo, anything else gives other.
  - **Description:** split by section headers `Nhà trai`, `Nhà gái`, `Nhà hàng`, matched case- and diacritic-insensitively on `norm`. Inside each section, read `- Label : value` lines:
    - `dia chi` → addr;
    - `sdt|so dien thoai` → phone (digits and spaces only, else '');
    - `ten nha hang|to chuc` → addrRest;
    - `xuat phat` → tDepart, `trinh le` → tArrive, `ruoc dau` → tRuoc, `makeup` → tMakeup, `don khach` → tWelcome, `dai tiec` → tParty.
  - **Lines outside sections:** `Nhà hàng :` → addrRest, `Sđt cô dâu` → phoneBride, `Sđt chú rể` → phoneGroom, `Giờ đãi tiệc` → tParty, `Giờ đón khách` → tWelcome.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit `feat(calsync): parse bookings from calendar events`.

### Task 2: Sync plan

**Files:** Create `web/src/domain/calsync-plan.ts`. Modify `web/src/domain/types.ts` to add the optional Wedding fields `source?: { cal: string; eventId: string; bookingId: string; title: string }`, `cancelled?: boolean`, `calNote?: string`, `syncSig?: string`. Test: `web/test/calsync-plan.test.ts`.

**Interfaces:**
- Consumes: `Booking` and `parseBooking` (Task 1); `norm` (domain/search).
- Produces:
  - `calWeddingId(cal: string, eventId: string): string`, which returns `'c' + hash`.
  - `planCalendarSync(input: { cal: string; events: CalEvt[] }[], existing: Wedding[], email: string): { writes: { id: string; patch: Partial<Wedding>; create: boolean }[]; cancelled: string[]; count: number }`

- [ ] **Step 1: Write failing tests:**
  - **New booking:** the result has `create: true`, a full profile (kind, date, names, phones, times, hasVideo, `channel.kind`), `source` set, `calNote` set, and `consultDone` false.
  - **Calendar changed:** an existing profile with a different `syncSig` gets `create: false`. The patch contains the changed synced fields and never contains `consultDone`, `photo`, `video`, `notes` or `channel.url`.
  - **Calendar unchanged:** same `syncSig` produces no write.
  - **Empty calendar value:** the profile has `phoneBride: '0909'`, the parsed phoneBride is '' → the patch has no `phoneBride`.
  - **Moved date:** same event id with a new date patches the date on the same id.
  - **Same booking in both calendars:**
    - Same date, same phone: only the FrameVis one is written. The primary one is skipped and counted once.
    - Same date, different phones, both names normalize equal (`Kimm Ngânn` vs `Kimm Ngânn`): merged.
    - Same date, different names (`Thanh Ngọc` vs `Thanh Ngân`): not merged.
  - **Gone from calendar:** a previously synced profile whose event is missing from its calendar's list, with a date inside the read window, is in `cancelled` with patch `{cancelled: true}`. A profile with `cancelled: true` that is present again gets `{cancelled: false}`.
  - **Not synced:** profiles without `source` (manual or form) are never cancelled or patched.
  - **Old events:** events older than the window are not reported as cancelled.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
  - `syncSig` is a JSON hash of the synced fields.
  - The merge key is `date + (phone digits || norm(clientName))`.
  - FrameVis is listed first in `input`, so it wins.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(calsync): plan profile updates from calendar`.

### Task 3: Run sync for the admin + UI

**Files:**
- Create: `web/src/data/calsync.ts`
- Modify:
  - `web/src/data/gcal.ts`: export `getToken(interactive: boolean): Promise<string>` and `api(token, url, method?, body?)`, reusing the existing token cache.
  - `web/src/ui/Upcoming.tsx`: status line, button, hide cancelled.
  - `web/src/ui/WeddingSheet.tsx`: read-only synced fields, calNote block.
  - `web/src/ui/More.tsx`: admin setting for the FrameVis calendar id.
  - `web/src/ui/App.tsx`: start the sync for the admin.
  - `web/test/fakes/*` if needed.
  - `web/test/smoke.py`.

**Interfaces:**
- Consumes: `planCalendarSync` (Task 2), `getToken` and `api` (gcal.ts), `weddings` and `weddingsReady` (data/weddings), `orgDoc` and `isAdmin` (data/org), `writeBatch`.
- Produces:
  - `calStatus: Signal<string>`
  - `syncCalendars(interactive?: boolean): Promise<void>`
  - `startCalendarSync(): void`, which runs on admin load and every 30 minutes.

- [ ] **Step 1: Write the failing smoke checks** in `web/test/smoke.py`. With the admin signed in, `page.route('**/calendar/v3/calendars/**')` returns two fixture events: one FrameVis event 33 days ahead and one primary-calendar duplicate of it. A GIS token is pre-seeded in localStorage.
  - **Admin sync:**
    - Sắp tới shows the couple once;
    - the chip "Cần hẹn tư vấn" counts it;
    - the status line contains "Đã đồng bộ";
    - opening the profile shows the bride name input disabled with the text "Sửa trên Framevis / Google Lịch";
    - the block "Ghi chú trên lịch" contains a line of the original note.
  - **Viewer and editor:** no calendar fetch is made and no status line is shown.
- [ ] **Step 2:** Run `npm run smoke`. Expected: the new checks FAIL.
- [ ] **Step 3: Implement.**
  - **When `syncCalendars` runs:** only if `role === 'admin'` and `weddingsReady` is true.
  - **Token:** `getToken(false)`. Without a token, set `calStatus` to "Chạm để đồng bộ lịch Google" and run interactively on the next tap (same capture-click pattern as gcal).
  - **Fetching:**
    - list events for each calendar, FrameVis first;
    - follow `nextPageToken`;
    - `maxResults` 2500;
    - window per the Global Constraints.
  - **Plan and write:** run `planCalendarSync`, then commit the writes in `writeBatch` chunks of 400 using `setDoc(..., {merge:true})` semantics. Creates get the full doc.
  - **Status:**
    - success: `Đã đồng bộ lúc hh:mm · n lễ`;
    - 403/404 on the FrameVis calendar: show `Không đọc được lịch FrameVis` and still sync primary.
  - **UI:**
    - Synced fields have `disabled` set and hint `Sửa trên Framevis / Google Lịch` when `w.source`.
    - The `calNote` block shows "Ghi chú trên lịch" as preformatted text.
    - Upcoming filters out `cancelled` profiles and adds a `Đã huỷ trên lịch` tag in search results.
    - More (admin) gets a field "Mã lịch FrameVis".
- [ ] **Step 4:** Run `npm test && npm run smoke && npm run build && node scripts/size.mjs`. Expected: all pass; index ≤ 200 KB (calsync.ts is lazy-imported for the admin).
- [ ] **Step 5:** Commit `feat(calsync): sync admin calendars into profiles`.

### Task 4: Ship and check on real data

- [ ] **Step 1:** Push, merge into main, and wait for the deploy to succeed.
- [ ] **Step 2:** The admin opens the app, taps once to allow Google, and confirms Sắp tới lists the bookings. Claude compares a sample of 3 profiles against the calendar events (date, names, times) through the Google Calendar connector.
- [ ] **Step 3:** Report the count and anything that didn't parse.
