import { signal } from '@preact/signals'

export const toastMsg = signal<{ text: string; err?: boolean } | null>(null)
let t: ReturnType<typeof setTimeout> | undefined
export function toast(text: string, err = false) {
  toastMsg.value = { text, err }
  clearTimeout(t)
  t = setTimeout(() => (toastMsg.value = null), err ? 5000 : 2600)
}
