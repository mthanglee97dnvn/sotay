import { signal } from '@preact/signals'
/** Which sub-screen of Thêm is open (so other tabs can send the admin straight to one). */
export type MoreSub = 'menu' | 'members' | 'summary' | 'import' | 'hidden' | 'payroll'
export const moreSub = signal<MoreSub>('menu')
