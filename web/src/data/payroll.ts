import { signal, effect } from '@preact/signals'
import { collection, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../db'
import { ORG } from '../firebase'
import { guardedWrite, role } from './org'
import { SEED_ITEMS, type PayConfig, type PayEntry } from '../domain/payroll'

/** Chấm công data; listened to only for the admin (rules refuse everyone else). */
export const payEntries = signal<PayEntry[]>([])
export const payConfig = signal<PayConfig>({ people: [], items: [] })
export const payReady = signal(false)
const col = () => collection(db, 'orgs', ORG, 'payroll')
const cfgDoc = () => doc(db, 'orgs', ORG, 'payrollConfig', 'main')

let unsubs: (() => void)[] = []
effect(() => {
  const admin = role.value === 'admin'
  unsubs.forEach(u => u()); unsubs = []
  if (!admin) { payEntries.value = []; payConfig.value = { people: [], items: [] }; payReady.value = false; return }
  unsubs.push(onSnapshot(col(), s => { payEntries.value = s.docs.map(d => ({ ...(d.data() as Omit<PayEntry, 'id'>), id: d.id })) }))
  unsubs.push(onSnapshot(cfgDoc(), s => {
    // First time ever (doc missing on the server): start with the owner's editing price list.
    if (!s.exists() && !s.metadata.fromCache) { void savePayConfig({ people: [], items: SEED_ITEMS }); return }
    const d = s.data() as Partial<PayConfig> | undefined
    payConfig.value = { people: d?.people ?? [], items: d?.items ?? [] }
    payReady.value = true
  }))
})

export function savePayEntry(e: Omit<PayEntry, 'id' | 'createdAt' | 'updatedAt'> & { id?: string; createdAt?: number }): string {
  const id = e.id || doc(col()).id
  const { id: _omit, ...data } = e
  const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined && v !== ''))
  guardedWrite(setDoc(doc(col(), id), { ...clean, createdAt: e.createdAt ?? Date.now(), updatedAt: Date.now() }))
  return id
}
export const deletePayEntry = (id: string) => guardedWrite(deleteDoc(doc(col(), id)))
export const savePayConfig = (cfg: PayConfig) => guardedWrite(setDoc(cfgDoc(), cfg))
