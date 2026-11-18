import { signal } from '@preact/signals'
import { useState } from 'preact/hooks'
import type { ComponentChildren } from 'preact'
import { ICalendar, ICheck, IBox, IMore, IPlus } from './icons'
import { canEdit } from '../data/org'
import { toastMsg } from './toast'

export type Tab = 'upcoming' | 'tasks' | 'store' | 'more'
export const tab = signal<Tab>((localStorage.getItem('sotay2-tab') as Tab) || 'upcoming')
export const go = (t: Tab) => { tab.value = t; try { localStorage.setItem('sotay2-tab', t) } catch { /* private mode */ } scrollTo(0, 0) }

export interface FabAction { label: string; run: () => void }

export function Shell(p: { children: ComponentChildren; badges: Partial<Record<Tab, number>>; fab: FabAction[] }) {
  const [open, setOpen] = useState(false)
  const items: [Tab, string, typeof ICalendar][] = [['upcoming', 'Sắp tới', ICalendar], ['tasks', 'Việc', ICheck], ['store', 'Kho sản phẩm', IBox], ['more', 'Thêm', IMore]]
  return <>
    {p.children}
    {canEdit() && <>
      {open && <div class="fabscrim" onClick={() => setOpen(false)} />}
      {open && <div class="fabmenu" role="menu">{p.fab.map(a => <button role="menuitem" onClick={() => { setOpen(false); a.run() }}>{a.label}</button>)}</div>}
      <button class="fab" aria-label="Thêm mới" aria-expanded={open} onClick={() => setOpen(!open)}><IPlus size={28} /></button>
    </>}
    <nav class="nav" aria-label="Chuyển mục">
      {items.map(([t, label, I]) => <button aria-current={tab.value === t ? 'page' : undefined} onClick={() => go(t)}>
        <span style="position:relative"><I />{!!p.badges[t] && <span class="badge" style="position:absolute;top:-6px;right:-12px">{p.badges[t]}</span>}</span>
        {label}
      </button>)}
    </nav>
    {toastMsg.value && <div class={'toast' + (toastMsg.value.err ? ' err' : '')} role="status">{toastMsg.value.text}</div>}
  </>
}

export function Sheet(p: { title: string; onClose: () => void; children: ComponentChildren; actions?: ComponentChildren }) {
  return <>
    <div class="scrim" onClick={p.onClose} />
    <section class="sheet" role="dialog" aria-modal="true" aria-label={p.title} onKeyDown={e => e.key === 'Escape' && p.onClose()}>
      <div class="sheethead"><h2>{p.title}</h2>{p.actions}<button class="btn ghost sm" onClick={p.onClose}>Đóng</button></div>
      {p.children}
    </section>
  </>
}
