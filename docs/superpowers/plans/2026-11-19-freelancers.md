# Thợ freelancer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A fifth tab "Thợ" listing known freelancers, with a one-tap "Hỏi lịch" that copies a ready message and opens their Messenger chat.

**Architecture:** Pure logic (message text, Messenger link, sort by job) in `web/src/domain/freelancers.ts`; a Firestore-backed signal in `web/src/data/freelancers.ts` at `orgs/mthanglee/freelancers/{id}`; a lazily loaded `web/src/ui/Freelancers.tsx` tab wired through `Shell.tsx` and `App.tsx`.

**Tech Stack:** Vite + Preact + @preact/signals + TypeScript, Firebase Firestore, Vitest, Playwright smoke (`web/test/smoke.py`), rules tests in CI emulator.

**Spec:** `docs/superpowers/specs/2026-11-19-freelancers-design.md`

## Global Constraints
- Main bundle stays under 200 KB gzip (`node scripts/size.mjs`); the tab loads lazily like Store/Tasks.
- Message copy is fixed by anh Thắng: "Hí Lô Ae, ngày {ngày} bên Thén đang cần tìm thợ{ việc}, Ae còn rảnh lịch không báo giúp Thén để nhận lịch nhé". No date → "ngày này"; no job → just "tìm thợ".
- Day format in the message: `Thứ Sáu 28/11` (weekday long, dd/mm, no year, no comma).
- Editors (admin, "Được sửa") add/edit/delete; "Chỉ xem" reads and can still press "Hỏi lịch".
- Keep the cinematic look: italic page title, kicker line, glass cards, existing `.btn`, `.field`, `Sheet`.

## Review Focus
1. Facebook links in odd shapes (`fb.com/x`, `m.facebook.com/x`, `facebook.com/profile.php?id=123`, trailing `/`, query strings, a bare username) → Messenger link still right, or fall back to opening the saved link.
2. Freelancer with no Facebook link → "Hỏi lịch" only copies the message and says so.
3. Clipboard refused (iOS without gesture) → the message is still shown so it can be copied by hand.
4. Empty list → empty state explains how to add the first thợ (editors) or that none were added yet (viewers).
5. Five nav items on a 320px phone → no wrapping, labels readable, badge positions intact.

---

### Task 1: Message, Messenger link and ordering (pure logic)

**Files:**
- Create: `web/src/domain/freelancers.ts`
- Modify: `web/src/domain/types.ts` (add `Freelancer`)
- Test: `web/test/freelancers.test.ts`

**Interfaces:**
- Produces:
  - `type Job = 'chup' | 'quay' | 'ca'` and `interface Freelancer { id: string; name: string; fb: string; does: Job; note: string; updatedAt: number }` in `types.ts`
  - `askMessage(o: { date?: string; job?: 'chup' | 'quay' }): string`
  - `messengerUrl(fb: string): string | null` (null when no usable link)
  - `openUrl(fb: string): string | null` (Messenger link, else the original http(s) link, else null)
  - `forJob(list: Freelancer[], job?: 'chup' | 'quay'): { f: Freelancer; fit: boolean }[]` (fitting first, then name order, `vi` collation)

- [ ] **Step 1: Write the failing tests**

```ts
expect(askMessage({})).toBe('Hí Lô Ae, ngày này bên Thén đang cần tìm thợ, Ae còn rảnh lịch không báo giúp Thén để nhận lịch nhé')
expect(askMessage({ date: '2026-11-28', job: 'chup' })).toBe('Hí Lô Ae, ngày Thứ Sáu 28/11 bên Thén đang cần tìm thợ chụp, Ae còn rảnh lịch không báo giúp Thén để nhận lịch nhé')
expect(askMessage({ date: '2026-11-28', job: 'quay' })).toContain('tìm thợ quay,')
expect(messengerUrl('https://www.facebook.com/minhtuan.photo')).toBe('https://m.me/minhtuan.photo')
expect(messengerUrl('fb.com/minhtuan.photo/?ref=x')).toBe('https://m.me/minhtuan.photo')
expect(messengerUrl('https://m.facebook.com/profile.php?id=1000123')).toBe('https://m.me/1000123')
expect(messengerUrl('minhtuan.photo')).toBe('https://m.me/minhtuan.photo')
expect(messengerUrl('https://www.facebook.com/groups/abc')).toBeNull()
expect(messengerUrl('')).toBeNull()
expect(openUrl('https://www.facebook.com/groups/abc')).toBe('https://www.facebook.com/groups/abc')
expect(openUrl('')).toBeNull()
// forJob: 'ca' fits both; non-fitting after fitting
expect(forJob([quayOnly, chupOnly, both], 'chup').map(x => [x.f.name, x.fit])).toEqual([['Bình', true], ['An', true], ['Cường', false]]) // names chosen so order shows fit-first then name
expect(forJob([quayOnly, chupOnly], undefined).every(x => x.fit)).toBe(true)
```

- [ ] **Step 2: Run** `cd web && npx vitest run test/freelancers.test.ts` — Expected: FAIL (module missing)
- [ ] **Step 3: Implement** in `web/src/domain/freelancers.ts`. Day text from `dateLong` in `vn-date.ts` (drop the year and the comma). Reserved Facebook paths that are not people (`groups`, `pages`, `events`, `watch`, `share`, `photo`, `story.php`) return null from `messengerUrl`.
- [ ] **Step 4: Run** the same command — Expected: PASS
- [ ] **Step 5: Commit** `feat(thợ): hỏi lịch message, Messenger link, job ordering`

### Task 2: Store freelancers and allow them in the rules

**Files:**
- Create: `web/src/data/freelancers.ts`
- Modify: `firestore.rules` (add `'freelancers'` to both `coll in [...]` lists)
- Test: `web/test/rules.test.ts` (new cases)

**Interfaces:**
- Consumes: `Freelancer` (Task 1); `db`, `ORG`, `me`, `guardedWrite` as used by `data/tasks.ts`
- Produces: `freelancers: Signal<Freelancer[]>`, `freelancersReady: Signal<boolean>`, `saveFreelancer(f: Partial<Freelancer> & { id?: string }): string`, `deleteFreelancer(id: string): void` (same pattern as `data/tasks.ts`)

- [ ] **Step 1: Write the failing rules tests** — `viewer can read freelancers`, `viewer cannot write freelancers` (assertFails), `editor can write freelancers` (assertSucceeds), `outsider cannot read freelancers`.
- [ ] **Step 2: Run** — rules tests run only in the CI emulator; push the branch and Expected: the new cases FAIL in "Kiểm tra luật phân quyền".
- [ ] **Step 3: Implement** the rules change and `data/freelancers.ts`.
- [ ] **Step 4: Verify** CI rules job PASS; `npx tsc --noEmit -p .` clean.
- [ ] **Step 5: Commit** `feat(thợ): Firestore list and rules`

### Task 3: The "Thợ" tab

**Files:**
- Create: `web/src/ui/Freelancers.tsx` (exports `Freelancers` and `FreelancerSheet`)
- Modify: `web/src/ui/Shell.tsx` (Tab type gets `'crew'`; nav item `['crew', 'Thợ', IUsers]` between store and more), `web/src/ui/icons.tsx` (`IUsers`), `web/src/ui/App.tsx` (lazy load and render when `tab.value === 'crew'`), `web/src/styles.css` (five nav items fit)
- Test: `web/test/smoke.py` (new checks)

**Interfaces:**
- Consumes: Task 1 functions, Task 2 data API, `copyText`, `toast`, `Sheet`, `canEdit()`.

Screen: italic `h1` "Thợ freelancer", kicker "Hỏi lịch nhanh"; a card with a date field (label "Ngày cần thợ", shows `dateLong` under it) and a two-button segment "Chụp" / "Quay" (tap again to clear); search box "Tìm tên thợ"; `.list` of rows: name, line "Chụp · {note}" (does: chup→Chụp, quay→Quay, ca→Chụp & quay), button "Hỏi lịch" (primary). Rows that don't fit the chosen job get class `dim`. Editors see "+ Thêm thợ" and tap a name to open `FreelancerSheet` (fields: Tên, Link Facebook, Làm (select Chụp / Quay / Chụp & quay), Ghi chú; buttons Lưu, Xoá with confirm "Xoá {tên} khỏi danh sách thợ? Không khôi phục được."). Empty state: editors "Chưa có thợ nào. Bấm “Thêm thợ” để lưu người đầu tiên."; viewers "Chưa có thợ nào trong danh sách."

"Hỏi lịch": copy `askMessage(...)`; if `openUrl(fb)` → `window.open(url, '_blank')` and toast "Đã chép tin, dán vào khung chat"; no link → toast "Đã chép tin. Thợ này chưa có link Facebook". If copy fails, open a small sheet showing the message text in `.msgbox` so it can be copied by hand.

- [ ] **Step 1: Write failing smoke checks** in `test/smoke.py`:
  - `thợ: tab shows between Kho sản phẩm and Thêm` (nav button names in order include "Thợ" right after "Kho sản phẩm")
  - `thợ: editor adds a thợ and it appears in the list`
  - `thợ: Hỏi lịch copies the message with the chosen date and opens m.me` (stub `navigator.clipboard.writeText` and `window.open` via init script; assert text equals the Task 1 example for 2026-11-28 + Chụp and url `https://m.me/minhtuan.photo`)
  - `thợ: viewer sees the list without Thêm thợ`
  - `thợ: five nav items fit at 320px` (no nav button wider than its label overflows; `scrollWidth <= innerWidth`)
- [ ] **Step 2: Run** `cd web && npm run build:mock && timeout 280 npm run smoke` — Expected: the new checks FAIL
- [ ] **Step 3: Implement** the tab, sheet, Shell/App wiring and CSS.
- [ ] **Step 4: Run** unit tests, `npx tsc --noEmit -p .`, `npm run build && node scripts/size.mjs`, smoke — Expected: all PASS, index ≤ 200 KB
- [ ] **Step 5: Commit** `feat(thợ): tab Thợ freelancer with Hỏi lịch`
