import { signal } from '@preact/signals'
import { useState, useEffect, useRef } from 'preact/hooks'
import type { ComponentChildren } from 'preact'
import { ICalendar, ICheck, IBox, IMore, IPlus } from './icons'
import { canEdit } from '../data/org'
import { toastMsg } from './toast'

export type Tab = 'upcoming' | 'tasks' | 'store' | 'more'
export const tab = signal<Tab>((localStorage.getItem('sotay2-tab') as Tab) || 'upcoming')
export const go = (t: Tab) => { tab.value = t; try { localStorage.setItem('sotay2-tab', t) } catch { /* private mode */ } scrollTo(0, 0) }


// Decorative night sky behind the app (stars, shooting stars, bokeh). Hidden from screen readers.
const STARS = [[38, 6], [120, 3], [212, 10], [300, 4], [352, 14], [74, 25], [262, 23], [30, 50], [340, 56], [180, 66], [58, 83], [310, 90]]
const METEORS = [[85, -2, 0.6, 9], [108, 14, 3.4, 10], [62, -4, 6.1, 11], [105, 42, 8.2, 9.5], [98, 66, 4.8, 12]]
function Sky() {
  return <div class="sky" aria-hidden="true">
    <i class="b" style="left:6%;top:8%;width:120px;height:120px;background:radial-gradient(circle,rgba(50,90,215,.36),transparent 70%)" />
    <i class="b" style="right:-10%;top:27%;width:200px;height:200px;background:radial-gradient(circle,rgba(25,65,190,.36),transparent 68%);animation-delay:-2.5s" />
    <i class="b" style="left:-12%;top:62%;width:220px;height:220px;background:radial-gradient(circle,rgba(30,70,190,.26),transparent 68%);animation-delay:-3s" />
    {STARS.map(([x, y], i) => <i class="s" style={`left:${x / 3.9}%;top:${y}%;animation-delay:-${(i * 0.7) % 3.4}s`} />)}
    {METEORS.map(([x, y, d, t]) => <i class="m" style={`left:${x}%;top:${y}%;animation-delay:${d}s;animation-duration:${t}s`} />)}
  </div>
}

export interface FabAction { label: string; run: () => void }

export function Shell(p: { children: ComponentChildren; badges: Partial<Record<Tab, number>>; fab: FabAction[] }) {
  const [open, setOpen] = useState(false)
  const fabRef = useRef<HTMLButtonElement>(null)
  const items: [Tab, string, typeof ICalendar][] = [['upcoming', 'Sắp tới', ICalendar], ['tasks', 'Việc', ICheck], ['store', 'Kho sản phẩm', IBox], ['more', 'Thêm', IMore]]
  return <>
    <Sky />
    {p.children}
    {canEdit() && <>
      {open && <div class="fabscrim" onClick={() => setOpen(false)} />}
      <aside aria-label="Thêm mới" onKeyDown={e => { if (e.key === 'Escape' && open) { setOpen(false); fabRef.current?.focus() } }}>
        {open && <div class="fabmenu" id="fabmenu">{p.fab.map((a, i) => <button ref={i ? undefined : (b => b?.focus())} onClick={() => { setOpen(false); a.run() }}>{a.label}</button>)}</div>}
        <button ref={fabRef} class="fab" aria-label="Thêm mới" aria-expanded={open} aria-controls="fabmenu" onClick={() => setOpen(!open)}><IPlus size={26} /></button>
      </aside>
    </>}
    <nav class="nav" aria-label="Chuyển mục">
      {items.map(([t, label, I]) => <button aria-current={tab.value === t ? 'page' : undefined} onClick={() => go(t)}>
        <span style="position:relative"><I />{!!p.badges[t] && <span class={'badge' + (t === 'store' ? '' : ' info')} style="position:absolute;top:-6px;right:-12px">{p.badges[t]}</span>}</span>
        {label}
      </button>)}
    </nav>
    <div role="status" aria-live="polite">{toastMsg.value && <div class={'toast' + (toastMsg.value.err ? ' err' : '')}>{toastMsg.value.text}</div>}</div>
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
