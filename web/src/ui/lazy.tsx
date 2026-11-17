import { useEffect, useState } from 'preact/hooks'
import type { ComponentType } from 'preact'

/** Load a screen on first use; `prefetch()` warms it after the first view is on screen. */
export function lazy<P extends object>(load: () => Promise<ComponentType<P>>) {
  let C: ComponentType<P> | null = null
  let p: Promise<ComponentType<P>> | null = null
  const get = () => (p ??= load().then(c => (C = c)))
  const L = (props: P) => {
    const [, set] = useState(0)
    useEffect(() => { if (!C) get().then(() => set(1)) }, [])
    return C ? <C {...props} /> : null
  }
  L.prefetch = get
  return L
}
