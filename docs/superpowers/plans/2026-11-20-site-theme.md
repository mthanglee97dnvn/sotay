# Sổ Tay: website look, Light and Dark — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the whole Sổ Tay web app in the studio website's look, with Light and Dark themes and a theme switch; the client form is always Light.

**Architecture:** One stylesheet (`web/src/styles.css`) is rewritten: a token layer for `:root[data-theme=light]` and `:root[data-theme=dark]` copied from the website, then component rules written once against tokens. A tiny `web/src/theme.ts` owns the choice (auto/light/dark), its storage, and applying it; an inline head script applies it before first paint. The Hướng D layer (`.cine`), `Sky`, landmark photos and `domain/place.ts` are deleted.

**Tech Stack:** Vite + Preact + @preact/signals, TypeScript, vitest, Python Playwright smoke (`web/test/smoke.py` against `npm run build:mock`).

**Spec:** `docs/superpowers/specs/2026-11-20-site-theme-design.md` (Vietnamese; approved by the owner). Visual reference: the mockup artifact "Sổ Tay theo website", options A (Light) and C (Dark); copy at `/home/claude/sotay-mock/index.html` if present. Website tokens: repo `mthanglee97dnvn/mthanglee-web`, `src/site/styles/tokens.css`.

## Global Constraints

- Light tokens (verbatim from the website): `--paper #ebe6dd`, `--paper-2 #e2dcd1`, `--ink #111`, `--ink-2 #4a4640`, `--ink-3 #8f887d`, `--rule #c9c2b6`.
- Dark tokens: ground `#111`, text `#ebe6dd`, secondary text `#cfc8bc` / `#bdb6aa`, rule `rgb(235 230 221 / .16)`, raised card `#1b1a18`.
- `--ink-3 #8f887d` is decoration only (rules, faint icons), never text. Secondary text: `--ink-2` (Light) / `#cfc8bc` (Dark).
- Overdue only: earth red `#a3341f` (Light) / `#f0a08c` (Dark). No other hue anywhere; other states use type, underline, dots, opacity.
- Fonts: Archivo (wdth axis) 800 caps, `font-stretch` 112–118% for titles and couple names; Noto Serif Display italic 300 for kickers; Be Vietnam Pro for body and buttons. Drop Inter Tight and upright Noto Serif Display. Vietnamese subsets must load.
- Shapes: buttons are pills (`--r-pill: 99px`), 1px border in currentColor, primary solid (Light: ink on paper text; Dark: paper with ink text); sheets `--r-sheet: 18px`. Touch targets ≥ 44px.
- Theme choice values: `'auto' | 'light' | 'dark'`, default `'auto'` (follows `prefers-color-scheme`), stored per device in localStorage key `sotay2-theme`, wrapped in try/catch (failure → auto). Applied as `document.documentElement.dataset.theme = 'light' | 'dark'` before first paint; `meta[name=theme-color]` = `#ebe6dd` (Light) / `#111111` (Dark).
- Client form (`web/form.html`) is always Light: `<html data-theme="light">` in the HTML, no theme script, `theme-color #ebe6dd`.
- Text contrast ≥ 4.5:1 on its background in both themes.
- Gone everywhere: `#112250`, `#3c507d`, `#e0c58f`, `#1b2f63`, `#030a22`, stars/glints, gold frames, `/places/` images, `class="cine"`.
- Budgets (as measured by `npm run size`): `index.html` ≤ 200 KB gzip, `form.html` ≤ 80 KB gzip.
- Motion off under `prefers-reduced-motion`.
- No feature, data, permission or copy changes. Client copy stays "mình"/"bạn", never "anh chị".
- Do not push or deploy; the owner approves screenshots first (Task 5).

## Review Focus

- Theme stored as an unknown string or storage throws (Safari private mode) → behaves as auto, no crash.
- Device switches light/dark while the app is open on Auto → app follows without reload.
- Opening the app in Dark → no light flash before first paint (head script runs before CSS paint).
- Client form opened on a phone in dark mode → still Light.
- Long Vietnamese couple names in wide Archivo caps at 320px → wrap, never overflow horizontally.

---

### Task 1: Theme engine and switch

**Files:**
- Create: `web/src/theme.ts`
- Create: `web/test/theme.test.ts`
- Modify: `web/index.html` (inline head script before stylesheets; `meta theme-color`)
- Modify: `web/src/main.tsx` (call `watchTheme()` once)

**Interfaces:**
- Produces:
  - `export type ThemeChoice = 'auto' | 'light' | 'dark'`
  - `export const themeChoice: Signal<ThemeChoice>` (initialised from `readChoice()`)
  - `export function readChoice(storage?: Pick<Storage,'getItem'>): ThemeChoice` — unknown/missing/throwing → `'auto'`
  - `export function resolveTheme(choice: ThemeChoice, prefersDark: boolean): 'light' | 'dark'`
  - `export function setTheme(choice: ThemeChoice): void` — stores (try/catch), updates the signal, applies
  - `export function toggleTheme(): void` — sets the opposite of what is currently shown (`light`↔`dark`)
  - `export function watchTheme(): void` — applies now and re-applies on `matchMedia('(prefers-color-scheme: dark)')` change while choice is auto
  - Applying = set `document.documentElement.dataset.theme` and `meta[name=theme-color]` content per Global Constraints.

- [ ] **Step 1: Write failing tests** in `web/test/theme.test.ts`:
  - `readChoice({getItem: () => 'dark'}) === 'dark'`; `'light'` likewise; `'purple'` → `'auto'`; `null` → `'auto'`; a getItem that throws → `'auto'`.
  - `resolveTheme('auto', true) === 'dark'`, `resolveTheme('auto', false) === 'light'`, `resolveTheme('light', true) === 'light'`, `resolveTheme('dark', false) === 'dark'`.
- [ ] **Step 2:** `cd web && npx vitest run test/theme.test.ts` → FAIL (module missing).
- [ ] **Step 3:** Implement `web/src/theme.ts`. Add to `web/index.html` `<head>`, before any stylesheet, an inline script that does the same read+resolve+apply with no imports (duplicate the ~5 lines; it must not throw). Remove `class="cine"` from `index.html`'s `<html>`. Call `watchTheme()` in `main.tsx`.
- [ ] **Step 4:** `npx vitest run test/theme.test.ts` → PASS; `npm test` → all pass.
- [ ] **Step 5: Commit** `feat(theme): auto/light/dark choice, applied before first paint`.

### Task 2: Tokens, fonts, logo; remove Hướng D, Sky and landmark photos

**Files:**
- Modify: `web/src/styles.css` (replace token layer; delete the whole `.cine` layer and `prefers-color-scheme` token block; base element styles)
- Modify: `web/index.html`, `web/form.html` (Google Fonts link: Archivo wdth,wght; Be Vietnam Pro 400/500/600/700; Noto Serif Display ital 300; `form.html` gets `<html lang="vi" data-theme="light">`, `theme-color #ebe6dd`)
- Modify: `web/public/manifest.webmanifest` (`background_color`/`theme_color` `#ebe6dd`)
- Create: `web/src/ui/Logo.tsx` (`export function Logo(): JSX.Element` — `<img>` of `/brand/logo-ink.webp` in Light, `/brand/logo-white.webp` in Dark, via CSS swap on `[data-theme]`, alt "MThanglee Studio")
- Create: `web/public/brand/logo-ink.webp`, `web/public/brand/logo-white.webp` (copy from website repo `public/brand/`)
- Delete: `web/src/ui/Sky.tsx`, `web/src/domain/place.ts`, `web/test/place.test.ts`, `web/public/places/`, `web/public/logo.webp` if unused after
- Modify: `web/src/ui/Shell.tsx`, `Gate.tsx`, `Upcoming.tsx`, `WeddingSheet.tsx`, `web/src/form/FormApp.tsx` (drop `Sky`, `Glint`, `placePhoto`/`placeOf`/`PLACE_NAME` and landmark backgrounds; use the new `Logo`)
- Test: `web/test/smoke.py`

**Interfaces:**
- Produces token names later tasks use: `--paper --paper-2 --ink --ink-2 --ink-3 --rule --card --late --on-solid --solid --r-pill --r-sheet --wide --serif --body --fs-*` (Dark values swap under `:root[data-theme=dark]`; `--solid`/`--on-solid` = primary button colours). Keep the existing `--sp-*` spacing scale.

- [ ] **Step 1: Write failing smoke checks** in `web/test/smoke.py`:
  - `no Hướng D colours`: on the editor page for each tab (Sắp tới, Việc, Kho, Thợ, Thêm) and an open profile sheet, in both `data-theme` values (set via `localStorage sotay2-theme` in the init script), no element's computed `color`, `background-color`, `border-*-color` or `background-image` contains `rgb(17, 34, 80)`, `rgb(60, 80, 125)`, `rgb(224, 197, 143)`, `rgb(27, 47, 99)`, `rgb(3, 10, 34)` or `/places/`.
  - `client form is always Light`: form page opened with `color_scheme='dark'` → `html[data-theme] == 'light'`, body background `rgb(235, 230, 221)`, `meta[name=theme-color]` `#ebe6dd`.
  - `fonts`: `document.fonts.check('800 20px Archivo')` and `'italic 300 20px "Noto Serif Display"'` after `document.fonts.ready` (the smoke box may lack network: if so route `fonts.googleapis.com` to a stub and assert only the computed `font-family` lists start with Archivo / Noto Serif Display / Be Vietnam Pro on title, kicker, body).
- [ ] **Step 2:** `cd web && npm run smoke` → the new checks FAIL.
- [ ] **Step 3:** Implement per Files. Base rules: `body` paper/ink, Be Vietnam Pro 16px/1.55; `h1` Archivo 800 caps stretch 118%; `.kicker` serif italic 300; `.btn` pill per Global Constraints; focus ring 2px currentColor offset 3px.
- [ ] **Step 4:** `npm run smoke` → all pass (including every pre-existing check); `npm test`; `npm run build && npm run size` within budgets.
- [ ] **Step 5: Commit** `feat(style): website tokens and fonts; remove Hướng D, sky and landmark photos`.

### Task 3: Restyle every screen

**Files:**
- Modify: `web/src/styles.css` (component rules), `web/src/ui/Upcoming.tsx`, `WeddingSheet.tsx`, `Tasks.tsx`, `Store.tsx`, `Freelancers.tsx`, `More.tsx`, `Members.tsx`, `Unmatched.tsx`, `Invites.tsx`, `ImportOld.tsx`, `Gate.tsx`, `Shell.tsx`, `web/src/form/FormApp.tsx` — markup only where the layout needs a hook; no behaviour changes.
- Test: `web/test/smoke.py`

**Interfaces:**
- Consumes: Task 2 tokens; Task 1 nothing yet.

- [ ] **Step 1: Write failing smoke checks:**
  - `contrast in both themes`: for each tab + open profile sheet + client form, every visible element with own text: contrast(computed color, nearest opaque ancestor background) ≥ 4.5 (≥ 3 for text ≥ 24px or ≥ 18.66px bold). Run in Light and Dark.
  - `Sắp tới layout`: the nearest wedding block shows the day count in Archivo (`font-family` starts with Archivo) and has no `background-image`; month headers read `Tháng MM/YYYY`; rows ≤ 7 days away mark the countdown with an underline (`text-decoration-line` or `border-bottom` set) instead of colour.
  - `no horizontal overflow at 320px`: each tab, profile sheet and client form, `document.documentElement.scrollWidth <= 320`, with a seeded couple named `Nguyễn Thị Thanh Hương & Trần Đình Quang Huy`.
  - `targets`: every visible button/link in the tab bar, FAB, sheet header ≥ 44×44.
- [ ] **Step 2:** `npm run smoke` → new checks FAIL.
- [ ] **Step 3:** Restyle to the mockup's language: Sắp tới per spec ("Bố cục Sắp tới"); profile sheet header = kicker (ceremony kind) + couple name caps + date line, no photo; lists as ruled rows, cards as thin-bordered (Light) / `--card` (Dark) boxes; tab bar paper with ink text (Light) / `#111` with paper text (Dark), current tab solid icon; FAB round `--solid`; chips and badges pill outline; overdue items use `--late` dot/text only; sheets/dialogs `--r-sheet`, scrim `rgb(17 17 17 / .6)`. Keep the existing tab set as is.
- [ ] **Step 4:** `npm run smoke` all pass; `npm test`; `npm run build && npm run size`.
- [ ] **Step 5: Commit** `feat(style): every screen in the website look`.

### Task 4: Theme switch in the header and in Thêm

**Files:**
- Modify: `web/src/ui/Shell.tsx` (header button), `web/src/ui/More.tsx` (section "Giao diện"), `web/src/ui/icons.tsx` (`ISun`, `IMoon` in the existing icon style)
- Modify: `web/src/styles.css`
- Test: `web/test/smoke.py`

**Interfaces:**
- Consumes: Task 1 `themeChoice`, `setTheme`, `toggleTheme`, `resolveTheme`.
- Header button: `aria-label` = `"Chuyển sang giao diện tối"` when Light is shown, `"Chuyển sang giao diện sáng"` when Dark is shown; shows moon in Light, sun in Dark; calls `toggleTheme()`.
- Thêm section: heading `Giao diện`; a radio group (`role=radiogroup`, `aria-label="Giao diện"`) with options `Tự động`, `Sáng`, `Tối` mapped to `auto`/`light`/`dark`; helper text under Tự động: `Theo cài đặt sáng/tối của máy`. Visible to every signed-in role (viewer included).

- [ ] **Step 1: Write failing smoke checks:**
  - `theme: header button switches and is remembered`: start `auto` with `color_scheme='light'` → `data-theme=light`; tap the header button → `dark`, `localStorage.sotay2-theme == 'dark'`; reload → still `dark` and `meta theme-color #111111` present at `DOMContentLoaded`.
  - `theme: Thêm has Tự động / Sáng / Tối`: choose Sáng under `color_scheme='dark'` → `light`; choose Tự động → `dark`; emulate `color_scheme='light'` without reload → `light`.
  - `theme: bad stored value`: init `localStorage sotay2-theme = 'x'` → app renders, `data-theme` follows the device, no page errors.
  - `theme: viewer can switch too` (viewer user).
- [ ] **Step 2:** `npm run smoke` → FAIL.
- [ ] **Step 3:** Implement per Interfaces.
- [ ] **Step 4:** `npm run smoke`, `npm test`, `npm run build && npm run size` all pass.
- [ ] **Step 5: Commit** `feat(theme): switch in the header and in Thêm`.

### Task 5: Document, show the owner, ship

**Files:**
- Modify: `DESIGN.md` (replace Hướng D and the old colour/type tables with: website tokens "lấy từ website mthanglee-web", Light/Dark values, fonts, shapes, the theme switch and storage key, client form always Light, overdue-only red, decoration-only `--ink-3`)
- Modify: `PRODUCT.md` only if it names the old look.

- [ ] **Step 1:** Update DESIGN.md; `cd web && npm test && npm run smoke && npm run build && npm run size` → all pass.
- [ ] **Step 2:** Screenshot at 390×844 from the mock build: Sắp tới, a profile sheet, Việc, Kho, Thợ, Thêm (with the Giao diện section), Gate, client form — Light and Dark (form Light only). Look at every shot; fix and re-shoot anything off. Send them to the owner and **stop until he approves**.
- [ ] **Step 3 (after approval):** commit, push, wait for CI and the deploy to succeed, open the live app in the built-in browser and confirm `data-theme` switches and no Hướng D colour is present.
