# Hide weddings and the "Đã ẩn" list — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Swipe left (phone) or a hover trash button (computer) hides a wedding in Sổ Tay only; "Đã ẩn" in Thêm restores or permanently deletes it; calendar sync never brings it back.

**Architecture:** Profiles gain `hidden`/`hiddenAt` and `purged`. A `visibleWeddings` computed signal (all minus hidden/purged) feeds every UI list and count; sync and import keep reading all `weddings`. The calendar planner leaves hidden profiles hidden and never touches purged ones (a purged calendar profile is a data-free marker so the event is not recreated).

**Tech Stack:** Preact + @preact/signals, Firestore, vitest (planner), Python Playwright smoke (mock build).

**Spec:** `docs/superpowers/specs/2026-11-22-hide-weddings-design.md` (Vietnamese, approved).

## Global Constraints
- Nothing is written to Google Calendar or FrameVis.
- Copy: swipe action `Xoá`; hover button aria-label `Ẩn <coupleName> khỏi Sổ Tay`; toast `Đã ẩn <coupleName>` with action `Hoàn tác`; Thêm entry `Đã ẩn` with count; per row `Hiện lại`, `Xoá hẳn`; confirm text `Xoá hẳn <coupleName> (<kind> <dd/mm/yyyy>) khỏi Sổ Tay? Không khôi phục được. Lịch trên Google Lịch / Framevis không bị đổi.`
- Only editors (`canEdit()`) can hide, restore, delete; viewers see none of the controls and don't see "Đã ẩn".
- Swipe starts only after a horizontal drag of ≥ 12px that is larger than the vertical movement; reveal width 88px; release past half reveals, otherwise closes; one row open at a time; tap elsewhere or swipe back closes.
- Hover trash button visible on `:hover` and `:focus-within`; ≥ 44px; on touch devices (no hover) it is not shown.
- Light/Dark contrast ≥ 4.5:1; no horizontal page overflow at 320px; the reveal uses `--late` for the Xoá button background with `--on-warn` text.
- Ask the owner before pushing.

## Review Focus
- A purged calendar profile whose event changes title/date on the calendar → still not recreated (match on event id, incl. merged `eventIds`).
- Hiding one of a merged duplicate group, then the duplicate merge runs → the kept profile is not unhidden and the hidden one is not deleted into a visible one.
- Vertical scroll over a row on a phone → no reveal; a swipe on the consult button region still swipes.
- Undo after the list re-rendered → restores.
- Tasks linked to a hidden/purged profile still show in Việc without crashing (missing wedding lookup).

---

### Task 1: Data — hidden/purged, visible list, sync respects them

**Files:** Modify `web/src/domain/types.ts`, `web/src/data/weddings.ts`, `web/src/domain/calsync-plan.ts`, UI readers (`Upcoming.tsx`, `WeddingSheet.tsx` siblings, `Tasks.tsx` picker, `More.tsx` summary, `Invites.tsx` lists) to use `visibleWeddings`; Test `web/test/calsync-plan.test.ts`.

**Interfaces:**
- `Wedding.hidden?: boolean`, `Wedding.hiddenAt?: number`, `Wedding.purged?: boolean`.
- `export const visibleWeddings: ReadonlySignal<Wedding[]>` (in `data/weddings.ts`).
- `export function hideWedding(id: string): void` (sets `hidden: true, hiddenAt: Date.now()`), `export function unhideWedding(id: string): void` (`hidden: false`), `export function purgeWedding(w: Wedding): void` — manual profile (no `source`): delete doc; calendar profile: overwrite (no merge) with `{ purged: true, hidden: true, source: { cal, eventId, bookingId: '', title: '', eventIds? }, date: w.date, updatedAt }`.

- [ ] **Step 1: Failing planner tests**
  - `purged calendar profiles are never recreated or written`: existing `{ id: calWeddingId(FV,'e1'), purged: true, hidden: true, source:{cal:FV,eventId:'e1'} }` + event e1 → `writes` empty, `cancelled` empty, `deletes` empty.
  - `purged profile found through merged eventIds blocks its group`: purged has `source.eventIds:['e1','e2']`, events e1,e2 (same booking) → no writes, no creates.
  - `hidden profiles stay hidden`: hidden existing + changed event → write patch has no `hidden` key and the profile id is unchanged.
  - `a hidden or purged profile is never the kept one nor deleted in a duplicate merge`.
- [ ] **Step 2:** `cd web && npx vitest run test/calsync-plan.test.ts` → FAIL.
- [ ] **Step 3:** Implement; in the planner, a group touching any purged profile (by own id or `eventIds`) is skipped entirely (its ids added to `present`); hidden profiles are excluded from duplicate deletion and never chosen over a visible one.
- [ ] **Step 4:** `npm test` → pass; `npm run build`.
- [ ] **Step 5: Commit** `feat(weddings): hidden and purged profiles; sync respects them`.

### Task 2: Swipe and hover-hide on Sắp tới rows

**Files:** Create `web/src/ui/SwipeRow.tsx`; Modify `web/src/ui/Upcoming.tsx` (wrap rows in all three lists), `web/src/styles.css`; Test `web/test/smoke.py`.

**Interfaces:** `SwipeRow({ w, children }: { w: Wedding; children: ComponentChildren })` — renders the row plus a hidden `Xoá` action (88px) and the hover trash button; calls `hideWedding(w.id)` and the undo toast (`unhideWedding`).

- [ ] **Step 1: Failing smoke checks**
  - `swipe left reveals Xoá and hides`: phone context (`has_touch`), dispatch pointer/touch drag −120px on a future row → `Xoá` button visible; tap → row gone from list, store `hidden` true; toast `Hoàn tác` → row back, `hidden` false.
  - `vertical drag does not reveal`: drag (dx 8, dy 80) → no visible `Xoá`.
  - `computer: hover shows the trash button`: desktop context, hover a row → button `Ẩn … khỏi Sổ Tay` visible; click → hidden; not visible without hover/focus.
  - `viewer: no swipe, no trash`.
  - `hidden weddings leave counts and search`: after hiding the only not-consulted future wedding, `Cần hẹn tư vấn` count drops by 1; searching its name shows nothing.
- [ ] **Step 2:** `npm run smoke` → FAIL.
- [ ] **Step 3:** Implement with pointer events (`touch-action: pan-y` on the row), CSS transform for the slide, transitions off under reduced motion.
- [ ] **Step 4:** `npm test && npm run smoke && npm run build && npm run size` → pass.
- [ ] **Step 5: Commit** `feat(upcoming): swipe left or hover to hide a wedding, with undo`.

### Task 3: "Đã ẩn" in Thêm

**Files:** Create `web/src/ui/Hidden.tsx`; Modify `web/src/ui/More.tsx` (entry with count, editors only), routing to the screen as other More sub-screens do; Test `web/test/smoke.py`.

- [ ] **Step 1: Failing smoke checks**
  - `Đã ẩn lists hidden weddings, newest date first, with Hiện lại`: seed two hidden → entry shows `2`; `Hiện lại` → back in Sắp tới, `hidden` false.
  - `Xoá hẳn`: confirm dialog accepted → calendar-sourced seed becomes `{purged: true, …}` with no `bride`/`notes`; manual seed doc deleted; neither listed anywhere.
  - `viewer has no Đã ẩn entry`.
- [ ] **Step 2:** `npm run smoke` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** full gate as Task 2.
- [ ] **Step 5: Commit** `feat(more): Đã ẩn list with restore and permanent delete`; record a short phone video of swipe → hide → undo and screenshots of Đã ẩn (Light/Dark) for the owner; stop before push.
