# Chấm công (editor pay log) — design

## Why
The owner pays his photo editors at month end, per set (bộ) edited, using his editing price list. He wants to log each set as it's done and have the app add up each person's money for the month.

## Goals
- A new bottom-nav tab **Chấm công**, between Báo giá and Thêm.
- **Ghi công** adds one entry. Fields:
  - person: dropdown from the editor list
  - item: dropdown from the editing price list, with its price
  - date: defaults to today
  - wedding: optional, from Sổ Tay's weddings
  - note: optional
- One set = one person (owner). Each entry pays the item's price to that person.
- **Month view** (‹ month ›):
  - One row per person with the number of sets and the total money, plus a month total.
  - Tapping a person expands their entries for the month (date, item, wedding, price). Each entry can be edited or deleted (with confirm).
  - **Copy bảng** per person copies a plain-text statement to send them for checking.
- **Settings** (under Thêm → Chấm công):
  - Editor names: add, rename, hide (not delete; past entries keep the name).
  - Price items: name and price; add, edit, hide.
  - Seeded with the owner's 9 items (below).

## Non-goals
- No payment tracking ("đã trả"), no export file, no editor log-ins or self-reporting, no split sets.

## Anti-goals
- Pay data visible to editors/viewers of the app. Changing a price later must not change past months: each entry stores the price at the time.

## Decisions
- Approach 1 (owner): its own tab in Sổ Tay. Rejected:
  - logging inside each wedding profile: no place for outdoor or off-app sets
  - Google Sheets: outside the app
- Admin only (Claude's proposal, stated to the owner, not objected to): the tab, the settings and the data are visible to and writable by the admin only. Security rules enforce this.
- Seed price list (from the owner's image):
  - Chỉnh sửa ảnh đính hôn phóng sự: 400.000đ/bộ/2 máy
  - Chỉnh sửa ảnh đính hôn truyền thống: 250.000đ/bộ
  - Chỉnh sửa ảnh cưới phóng sự cơ bản: 600.000đ/bộ/2 máy
  - Chỉnh sửa ảnh cưới phóng sự cơ bản: 800.000đ/bộ/3 máy
  - Chỉnh sửa ảnh tiệc báo hỷ phóng sự: 400.000đ/bộ
  - Chỉnh sửa ảnh tiệc báo hỷ truyền thống: 250.000đ/bộ
  - Chỉnh sửa ảnh hôn phối phóng sự: 400.000đ/bộ
  - Chỉnh sửa ảnh outdoor cơ bản: 600.000đ/bộ/2 máy
  - Chỉnh sửa ảnh outdoor cơ bản: 900.000đ/bộ/3 máy
- Editor list starts empty; the owner adds names.

## Data (Claude's call)
- `orgs/mthanglee/payroll/{id}`: `{ date: 'YYYY-MM-DD', person: string, item: string, price: number, weddingId?: string, weddingName?: string, note?: string, createdAt, updatedAt }`. The month is derived from the date.
- `orgs/mthanglee/payrollConfig/main`:
  - `{ people: { id, name, hidden? }[], items: { id, name, price, hidden? }[] }`
  - Entries store the person's and item's names and the price, not their ids, so later renames and price changes don't rewrite history.
- Rules: both paths are readable and writable only when the signed-in user is the org's admin. Entry values are validated: price is an int between 0 and 100,000,000, and the strings are bounded.
- **Deploy note:** the rules change must be published in the Firebase console together with the push (lesson of 23/11).

## Constraints
- Money is shown as `600.000đ` (vi-VN grouping).
- The nav gets 6 items for the admin (5 for others). Labels must still fit at 360px.
- Sổ Tay stays ≤ 200KB gzip; the tab is lazy-loaded like the others.
- Light and dark themes.

## Left to the builder
- The exact layout, within the app's existing list, sheet and button styles.
