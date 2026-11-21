# Consult button on the Sắp tới list — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Each upcoming wedding row on Sắp tới shows a consult button that toggles the profile's "Đã tư vấn" in place, with an undo toast.

**Architecture:** `WeddingRow` gains an optional `consult` prop; when set, the row renders as a container (`div.item.wrow`) holding the open-profile button and a separate consult button (no nested buttons). Toggling calls `saveWedding({ id, consultDone })`. `toast()` gains an optional action.

**Tech Stack:** Preact + signals, Python Playwright smoke on the mock build.

**Spec:** `docs/superpowers/specs/2026-11-22-consult-chip-design.md` (approved).

## Global Constraints
- Labels exactly: `Chưa tư vấn` (outline pill, bold) / `✓ Đã tư vấn` (plain, muted). Toast: `Đã đánh dấu đã tư vấn` / `Đã bỏ đánh dấu`, action `Hoàn tác`.
- aria-label: `Đánh dấu đã tư vấn cho <coupleName>` / `Bỏ đánh dấu đã tư vấn cho <coupleName>`.
- No button when `daysUntil(date) < 1`, no date, or `cancelled`. Viewer (`!canEdit()`): plain text, no button.
- Only on the Sắp tới upcoming list; past/late lists and sibling rows unchanged.
- Target ≥ 44px; no overflow at 320px; contrast ≥ 4.5:1 in Light and Dark; no new hue.
- Ask the owner before pushing.

## Review Focus
- Fast double tap → ends in the tapped-twice state, no stuck toast.
- Undo after the list re-sorted/filtered (e.g. under "Cần hẹn tư vấn" filter the row disappears) → undo still restores.
- Keyboard: Tab reaches both buttons in a row; Enter on the consult button does not open the profile.

---

### Task 1: Toast action + consult button in the row

**Files:** Modify `web/src/ui/toast.ts` (and the toast renderer in `web/src/ui/Shell.tsx` or wherever `toastMsg` renders), `web/src/ui/Upcoming.tsx`, `web/src/styles.css`; Test `web/test/smoke.py`.

**Interfaces:**
- `toast(text: string, err = false, action?: { label: string; run: () => void }): void` — action shows as a button in the toast; toast stays 5 s when it has an action.
- `WeddingRow({ w, right, consult }: { w: Wedding; right?: ComponentChildren; consult?: boolean })`.

- [ ] **Step 1: Failing smoke checks**
  - `consult button toggles in place`: admin, Sắp tới; row for seed `Bảo Ngọc`-style future wedding (use seed `long` at d+5 with `consultDone: True` and another future seed with `consultDone: False`): the not-consulted row has button `Đánh dấu đã tư vấn cho …`; click → store `consultDone` true, no `.sheet` opened, button label becomes `Bỏ đánh dấu…`; toast `Hoàn tác` → back to false.
  - `no consult button today/past; viewer cannot toggle`: seed `a` (today) row has no consult button; viewer `xem@test.vn` sees text `Chưa tư vấn`/`Đã tư vấn` but no button.
  - Existing look checks (contrast both themes, 320px overflow, 44px targets incl. `.consult`) extended to include the consult button.
- [ ] **Step 2:** `cd web && npm run smoke` → new checks FAIL.
- [ ] **Step 3:** Implement per Interfaces; Upcoming list passes `consult`.
- [ ] **Step 4:** `npm test && npm run smoke && npm run build && npm run size` → pass.
- [ ] **Step 5:** Commit `feat(upcoming): consult button on each row, toggles in place with undo`; screenshot Light/Dark at 390px for the owner; stop before push.
