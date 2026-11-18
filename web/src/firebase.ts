import { initializeApp } from 'firebase/app'
import { firebaseOptions } from './domain/authdomain'

declare const __FIREBASE_CONFIG__: Record<string, string>

export const app = initializeApp(firebaseOptions(__FIREBASE_CONFIG__, location.hostname))
export const ORG = 'mthanglee'
