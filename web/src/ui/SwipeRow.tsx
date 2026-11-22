import { signal } from '@preact/signals'
import { useRef, useEffect } from 'preact/hooks'
import type { ComponentChildren } from 'preact'
import type { Wedding } from '../domain/types'
import { hideWedding, unhideWedding } from '../data/weddings'
import { canEdit } from '../data/org'
import { coupleName } from '../domain/types'
import { toast } from './toast'
import { ITrash } from './icons'

const REVEAL = 88
/** The one row whose Xoá action is open (one at a time). */
const openId = signal<string | null>(null)

function hide(w: Wedding) {
  openId.value = null
  hideWedding(w.id)
  toast(`Đã ẩn ${coupleName(w)}`, false, { label: 'Hoàn tác', run: () => unhideWedding(w.id) })
}

/**
 * A Sắp tới row that can be hidden in Sổ Tay: swipe left on a phone to reveal Xoá,
 * or hover/focus on a computer to show a trash button. Calendars are never touched.
 */
export function SwipeRow({ w, children }: { w: Wedding; children: ComponentChildren }) {
  const front = useRef<HTMLDivElement>(null)
  const open = openId.value === w.id
  const g = useRef({ x: 0, y: 0, dx: 0, on: false, swiped: false, id: -1 })
  // Close when tapping anywhere else.
  useEffect(() => {
    if (!open) return
    const off = (e: PointerEvent) => { if (!(e.target as Element).closest?.(`[data-wid="${w.id}"]`)) openId.value = null }
    document.addEventListener('pointerdown', off, true)
    return () => document.removeEventListener('pointerdown', off, true)
  }, [open])
  if (!canEdit()) return <div class="swipe" data-wid={w.id}>{children}</div>
  const set = (px: number, anim: boolean) => { const el = front.current; if (el) { el.style.transition = anim ? '' : 'none'; el.style.transform = px ? `translateX(${px}px)` : '' } }
  const down = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') return
    g.current = { x: e.clientX, y: e.clientY, dx: 0, on: false, swiped: false, id: e.pointerId }
  }
  const move = (e: PointerEvent) => {
    const s = g.current
    if (s.id !== e.pointerId) return
    const dx = e.clientX - s.x, dy = e.clientY - s.y
    // Only a clear sideways drag swipes; vertical movement stays a scroll.
    if (!s.on) { if (Math.abs(dx) >= 12 && Math.abs(dx) > Math.abs(dy)) { s.on = true; front.current?.setPointerCapture?.(e.pointerId) } else return }
    s.dx = dx; s.swiped = true
    set(Math.max(-REVEAL - 24, Math.min(0, dx + (open ? -REVEAL : 0))), false)
  }
  const up = (e: PointerEvent) => {
    const s = g.current
    if (s.id !== e.pointerId) return
    s.id = -1
    if (!s.on) return
    const pos = s.dx + (open ? -REVEAL : 0)
    openId.value = pos < -REVEAL / 2 ? w.id : (open ? null : openId.value)
    set(0, true)
  }
  return <div class={'swipe' + (open ? ' open' : '')} data-wid={w.id}>
    <div class="swipe-act" aria-hidden={!open}><button class="swipe-del" tabIndex={open ? 0 : -1} onClick={() => hide(w)}>Xoá</button></div>
    <div class="swipe-front" ref={front} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
      onClickCapture={e => { if (g.current.swiped) { g.current.swiped = false; e.stopPropagation(); e.preventDefault() } else if (open) { openId.value = null; e.stopPropagation(); e.preventDefault() } }}>
      {children}
    </div>
    <button class="hidebtn" aria-label={`Ẩn ${coupleName(w)} khỏi Sổ Tay`} onClick={() => hide(w)}><ITrash size={18} /></button>
  </div>
}
