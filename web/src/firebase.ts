import { initializeApp } from 'firebase/app'

declare const __FIREBASE_CONFIG__: Record<string, string>

export const app = initializeApp(__FIREBASE_CONFIG__)
export const ORG = 'mthanglee'
