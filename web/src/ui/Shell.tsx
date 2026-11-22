import { signal } from '@preact/signals'
import { useState, useEffect, useRef } from 'preact/hooks'
import type { ComponentChildren } from 'preact'
import { ICalendar, ICheck, IMore, IPlus, IUsers, ISun, IMoon, ITag } from './icons'
import { shownTheme, toggleTheme } from '../theme'
import { canEdit } from '../data/org'
import { toastMsg } from './toast'

export type Tab = 'upcoming' | 'tasks' | 'crew' | 'prices' | 'more'
const TABS: Tab[] = ['upcoming', 'tasks', 'crew', 'prices', 'more']
// A tab saved by an older version (the removed Kho) falls back to Sắp tới.
const savedTab = localStorage.getItem('sotay2-tab') as Tab
export const tab = signal<Tab>(TABS.includes(savedTab) ? savedTab : 'upcoming')
export const go = (t: Tab) => { tab.value = t; try { localStorage.setItem('sotay2-tab', t) } catch { /* private mode */ } scrollTo(0, 0) }



export interface FabAction { label: string; run: () => void }

export function Shell(p: { children: ComponentChildren; badges: Partial<Record<Tab, number>>; fab: FabAction[] }) {
  const [open, setOpen] = useState(false)
  const fabRef = useRef<HTMLButtonElement>(null)
  // [tab, short label, icon, full name for screen readers when the label is shortened]
  const items: [Tab, string, typeof ICalendar, string?][] = [['upcoming', 'Sắp tới', ICalendar], ['tasks', 'Việc', ICheck], ['crew', 'Thợ', IUsers], ['prices', 'Báo giá', ITag], ['more', 'Thêm', IMore]]
  return <>
    <ThemeButton />
    {p.children}
    {canEdit() && <>
      {open && <div class="fabscrim" onClick={() => setOpen(false)} />}
      <aside aria-label="Thêm mới" onKeyDown={e => { if (e.key === 'Escape' && open) { setOpen(false); fabRef.current?.focus() } }}>
        {open && <div class="fabmenu" id="fabmenu">{p.fab.map((a, i) => <button ref={i ? undefined : (b => b?.focus())} onClick={() => { setOpen(false); a.run() }}>{a.label}</button>)}</div>}
        <button ref={fabRef} class="fab" aria-label="Thêm mới" aria-expanded={open} aria-controls="fabmenu" onClick={() => setOpen(!open)}><IPlus size={26} /></button>
      </aside>
    </>}
    <nav class="nav" aria-label="Chuyển mục">
      {items.map(([t, label, I, full]) => <button aria-current={tab.value === t ? 'page' : undefined} aria-label={full} onClick={() => go(t)}>
        <span style="position:relative"><I />{!!p.badges[t] && <span class="badge navbadge info">{p.badges[t]}</span>}</span>
        {label}
      </button>)}
    </nav>
    <div role="status" aria-live="polite">{toastMsg.value && <div class={'toast' + (toastMsg.value.err ? ' err' : '')}>{toastMsg.value.text}{toastMsg.value.action && <button class="toast-act" onClick={() => { const a = toastMsg.value!.action!; toastMsg.value = null; a.run() }}>{toastMsg.value.action.label}</button>}</div>}</div>
  </>
}

const FOCUSABLE = 'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

export function Sheet(p: { title: string; onClose: () => void; children: ComponentChildren; actions?: ComponentChildren }) {
  const ref = useRef<HTMLElement>(null)
  // Move focus into the dialog, keep Tab inside it, and give focus back to what opened it.
  useEffect(() => {
    const back = document.activeElement as HTMLElement | null
    ref.current?.focus()
    return () => { if (back?.isConnected) back.focus() }
  }, [])
  const trap = (e: KeyboardEvent) => {
    if (e.key === 'Escape') return p.onClose()
    if (e.key !== 'Tab' || !ref.current) return
    const f = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
    const first = f[0], last = f[f.length - 1], a = document.activeElement
    if (e.shiftKey ? a === first || a === ref.current : a === last) { e.preventDefault(); (e.shiftKey ? last : first)?.focus() }
  }
  return <>
    <div class="scrim" onClick={p.onClose} />
    <section ref={ref} tabIndex={-1} class="sheet" role="dialog" aria-modal="true" aria-label={p.title} onKeyDown={trap}>
      <div class="sheethead"><h2>{p.title}</h2>{p.actions}<button class="btn ghost sm" onClick={p.onClose}>Đóng</button></div>
      {p.children}
    </section>
  </>
}

/** Quick Light/Dark switch, top right of every app screen; follows the theme on screen, including device changes on Tự động. */
function ThemeButton() {
  const dark = shownTheme.value === 'dark'
  return <button class="themebtn" aria-label={dark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'} onClick={toggleTheme}>{dark ? <ISun size={20} /> : <IMoon size={20} />}</button>
}
