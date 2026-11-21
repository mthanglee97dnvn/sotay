import { signal } from '@preact/signals'

export const toastMsg = signal<{ text: string; err?: boolean; action?: { label: string; run: () => void } } | null>(null)
let t: ReturnType<typeof setTimeout> | undefined
/** Short message; an action (e.g. Hoàn tác) keeps it up longer. */
export function toast(text: string, err = false, action?: { label: string; run: () => void }) {
  toastMsg.value = { text, err, action }
  clearTimeout(t)
  t = setTimeout(() => (toastMsg.value = null), err || action ? 5000 : 2600)
}
