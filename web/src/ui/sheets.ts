import { signal } from '@preact/signals'
import type { Wedding, Task } from '../domain/types'

export const openWedding = signal<{ id?: string; draft?: Partial<Wedding> } | null>(null)
export const openTask = signal<{ id?: string; draft?: Partial<Task> } | null>(null)
export const openInvites = signal(false)

export async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true } catch {
    const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
    document.body.appendChild(ta); ta.select()
    const ok = document.execCommand('copy'); ta.remove(); return ok
  }
}
