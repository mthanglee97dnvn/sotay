# Form Notify Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Email the admin within about 1–2 minutes of a client submitting or updating a form, and let clients reopen and resubmit their link at any time.

**Architecture:**
- **App and rules:** an applied invite becomes editable again. A resubmission sets `status: 'submitted'` again, and the app shows it as "Khách bổ sung phiếu" because `appliedAt` is set.
- **Google Apps Script** (owned by the admin's account, minute trigger):
  - queries Firestore over REST with the admin's own OAuth token (IAM, no secrets);
  - emails each submitted invite whose answers signature differs from `notifiedSig`;
  - then patches `notifiedSig`.
- **Testable core:** the email text and missing-field logic are pure TypeScript in `web/src/domain/notify.ts`. esbuild bundles that core, plus a thin Apps Script runtime, into one `Code.gs` file.

**Tech Stack:** Vite/Preact app, Firestore rules, Vitest, Python Playwright smoke, esbuild (IIFE bundle), Google Apps Script (V8), Firestore REST v1.

**Spec:** `docs/superpowers/specs/2026-11-18-form-notify-design.md`

## Global Constraints
- **Recipient:** `leminhthang97@gmail.com`, i.e. `Session.getEffectiveUser().getEmail()`. Nothing is hardcoded in code.
- **Subjects:** `Phiếu mới: <couple> – <kind> <dd/mm/yyyy>`, or `Khách bổ sung phiếu: …` when `appliedAt` is set.
- **Body:** the answers with their Vietnamese labels, plus `Chưa có: <labels>` listing the empty non-derived fields of that kind, plus a link to `https://mthanglee97dnvn.github.io/sotay/`.
- **No duplicate email** for the same answers. Re-sending identical answers sends nothing.
- **Trigger:** every 1 minute.
- **Apps Script scopes, exactly:**
  - `https://www.googleapis.com/auth/datastore`
  - `https://www.googleapis.com/auth/script.send_mail`
  - `https://www.googleapis.com/auth/script.external_request`
  - `https://www.googleapis.com/auth/script.scriptapp`
  - `https://www.googleapis.com/auth/userinfo.email`
- **No keys or passwords** anywhere. The admin authorizes the script himself.
- **Client copy:** all text stays in mình/bạn.

## Review Focus
1. **Client resubmits while the admin is applying the previous answers:** the new answers must not be marked applied without being seen. `applyInvite` only sets `applied` if the answers it applied are still the current ones (Task 1).
2. **Script runs twice in one minute** (manual run plus trigger): no second email, because the signature check happens before sending (Task 2).
3. **An invite missing org, kind or answers** (old or broken doc): the script skips it without throwing, and the other invites are still mailed (Task 2).
4. **Firestore REST error or quota error:** the script logs it and retries next minute. It never marks an invite notified unless the email was sent (Task 2).
5. **Answers with HTML-like text** (`<b>`): the email is sent as plain text, so nothing is injected (Task 2).

---

### Task 1: Reopenable invites (rules + app)

**Files:**
- Modify: `firestore.rules`, `web/src/data/invites.ts`, `web/src/form/FormApp.tsx`, `web/src/ui/Invites.tsx`, `web/src/ui/Upcoming.tsx`
- Tests: `web/test/rules.test.ts`, `web/test/smoke.py`

**Interfaces:**
- Produces:
  - Invite fields: `appliedAt?: Timestamp`, `appliedSig?: string`, `notifiedSig?: string`.
  - `applyInvite(inv)` sets `{status: 'applied', seen: true, appliedAt: serverTimestamp(), appliedSig: sig(inv.answers)}`, guarded so it only applies if the stored answers still match `inv.answers`. It uses a transaction.
  - `answersSig(a: Record<string,string>): string` in `web/src/domain/invite.ts`. It is stable across key order and reused by Task 2.

- [ ] **Step 1: Write the failing tests.**
  - Rules: `applied invites can be resubmitted by the client`. An anonymous update of `tokApplied` with `submit()` succeeds. This replaces the old `applied invites are closed` test.
  - Rules: `client cannot set appliedAt or notifiedSig`. Including either key fails.
  - Unit (`invites.test.ts`): `answersSig({a:'1',b:'2'}) === answersSig({b:'2',a:'1'})`, and differs when a value changes.
  - Smoke, on an applied invite:
    - `form.html#APPLIED…` shows "Mình đã nhận thông tin" plus a button `Bổ sung / sửa thông tin`;
    - clicking it shows the fields prefilled;
    - submitting makes the store status `submitted`;
    - the admin page banner text contains `bổ sung`.
- [ ] **Step 2:** Run `npm test`, `npm run smoke`, and push to CI for the rules tests. Expected: the new tests FAIL.
- [ ] **Step 3: Implement.**
  - Rules: allow the anonymous update when `resource.data.status in ['open','submitted','applied']`. The affected-keys whitelist stays.
  - App:
    - Form: the applied screen gets the button.
    - Upcoming banner: `Bạn có n phiếu mới` / `n phiếu khách bổ sung` (when `appliedAt` is set).
    - InvitesSheet item label: "Khách bổ sung" for those.
- [ ] **Step 4:** Run the tests. Expected: PASS (rules in CI).
- [ ] **Step 5:** Commit `feat(invites): clients can reopen and resubmit their form`.

### Task 2: Notification core + Apps Script bundle

**Files:**
- Create:
  - `web/src/domain/notify.ts` (pure)
  - `web/scripts/apps-script/runtime.ts` (Apps Script glue)
  - `web/scripts/build-apps-script.mjs` (esbuild → `tools/apps-script/Code.gs`)
  - `tools/apps-script/appsscript.json`
- Tests: `web/test/notify.test.ts` (pure); `web/test/apps-script.test.ts` (runs `Code.gs` in `node:vm` with fake `UrlFetchApp`, `MailApp`, `ScriptApp`, `Session`, `Logger`).

**Interfaces:**
- Consumes: `fieldsFor`, `answersSig`, `coupleName`, `dmy`.
- Produces:
  - `buildEmail(inv: {kind?:string; answers?:Record<string,string>; appliedAt?:unknown}): {subject:string; body:string} | null`
  - Global functions in Code.gs:
    - `kiemTraPhieu()`: one run.
    - `caiDat()`: removes old triggers, creates a 1-minute trigger, runs once, and logs "Đã cài xong".
    - `guiThu()`: sends a sample email to the admin.

- [ ] **Step 1: Write the failing tests.**
  - `buildEmail`:
    - Subject `Phiếu mới: Linh & Thắng – Cưới 15/02/2027`, and `Khách bổ sung phiếu: …` with `appliedAt`.
    - Body lists the given answers with labels, e.g. `Giờ nhà trai có mặt tại nhà gái & trình lễ: 08:00`.
    - Body includes the line `Chưa có: Giờ makeup (trang điểm), Giờ nhà trai xuất phát đến nhà gái, …` (all empty non-derived fields of the kind, in form order). The line is omitted when nothing is missing.
    - Body contains the app link.
    - `<b>x</b>` stays literal.
    - Returns null when the answers are empty or missing.
  - **Runtime, with fakes:**
    - The runQuery response returns 2 submitted invites, one already notified with the same signature. Exactly 1 email is sent, then a PATCH sets `notifiedSig` on that doc with `updateMask.fieldPaths=notifiedSig`.
    - If the mail send throws, no PATCH happens.
    - A broken doc (no answers) is skipped while the other is sent.
    - Running twice sends no new mail.
- [ ] **Step 2:** Run `npx vitest run test/notify.test.ts test/apps-script.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - **Runtime:**
    - `POST https://firestore.googleapis.com/v1/projects/sotay-mthanglee/databases/(default)/documents:runQuery`
    - Structured query: `invites`, where `org == 'mthanglee'` AND `status == 'submitted'`.
    - Header: `Authorization: Bearer ScriptApp.getOAuthToken()`.
    - Firestore typed values (`stringValue`, `mapValue`, `timestampValue`) are decoded to plain JS.
    - `MailApp.sendEmail({to, subject, body, name: 'Sổ Tay MThanglee'})`, then `PATCH …/documents/invites/{id}?updateMask.fieldPaths=notifiedSig` with `{fields:{notifiedSig:{stringValue: sig}}}`.
    - Errors are logged with `Logger.log` and the run continues.
  - **Build:** esbuild `format: 'iife'`, `globalName: 'SoTay'`, target es2019. A footer defines the top-level `function kiemTraPhieu(){SoTay.kiemTraPhieu()}` and the same for `caiDat` and `guiThu`.
  - **appsscript.json:** `timeZone: Asia/Ho_Chi_Minh`, `runtimeVersion: V8`, and the scopes listed above.
  - Add the npm script `build:apps-script`.
- [ ] **Step 4:** Run the tests. Expected: PASS. `tools/apps-script/Code.gs` is committed.
- [ ] **Step 5:** Commit `feat(notify): Apps Script that emails new and updated forms`.

### Task 3: Guide, ship, install with the admin

**Files:** Create `tools/apps-script/HUONG-DAN.md` (Vietnamese, step by step).

- [ ] **Step 1: Write the guide.** The steps are:
  - open `script.google.com`, then **Dự án mới**, renamed "Sổ Tay – báo phiếu";
  - **Cài đặt dự án** → tick "Hiển thị tệp kê khai appsscript.json";
  - paste `appsscript.json` and `Code.gs`;
  - **Lưu**;
  - choose the function `caiDat` → **Chạy**;
  - accept the "chưa xác minh" screen (Nâng cao → Đi tới…) and **Cho phép**;
  - check the log for "Đã cài xong";
  - optional: run `guiThu`.
- [ ] **Step 2:** Merge to main. CI must pass (unit, rules, smoke). Then deploy.
- [ ] **Step 3:** Publish `firestore.rules` in the Firebase console. The admin approves the publish.
- [ ] **Step 4:** Walk the admin through the guide. Once he confirms the trigger exists, submit a test form and ask him to confirm the email arrived. Then mark the test invite applied, or delete it.
