import { signal } from '@preact/signals'

// Light or Dark look, chosen per device. The same read+apply runs inline in index.html <head> before first paint.
export type ThemeChoice = 'auto' | 'light' | 'dark'
const KEY = 'sotay2-theme'
const COLOR = { light: '#ebe6dd', dark: '#111111' } as const

export function readChoice(storage: Pick<Storage, 'getItem'> = localStorage): ThemeChoice {
  try {
    const v = storage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'auto'
  } catch { return 'auto' }
}

export const resolveTheme = (choice: ThemeChoice, prefersDark: boolean): 'light' | 'dark' =>
  choice === 'auto' ? (prefersDark ? 'dark' : 'light') : choice

export const themeChoice = signal<ThemeChoice>(typeof localStorage === 'undefined' ? 'auto' : readChoice())

const media = () => matchMedia('(prefers-color-scheme: dark)')

function apply() {
  const t = resolveTheme(themeChoice.value, media().matches)
  document.documentElement.dataset.theme = t
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', COLOR[t])
}

export function setTheme(choice: ThemeChoice) {
  themeChoice.value = choice
  try { localStorage.setItem(KEY, choice) } catch { /* private mode: this visit only */ }
  apply()
}

export const toggleTheme = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark')

export function watchTheme() {
  apply()
  media().addEventListener('change', () => { if (themeChoice.value === 'auto') apply() })
}
