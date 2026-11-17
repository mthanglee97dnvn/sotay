import { signal } from '@preact/signals'
import type { Wedding } from '../domain/types'

/** Kind picker + "copy message" sheet for a new client form. */
export const sendForm = signal<{ wedding?: Wedding } | null>(null)
