import type { Wedding } from './types'

/** Landmark photos in public/places/, picked from the ceremony's addresses. */
export type PlaceKey = 'hoian' | 'danang' | 'hue'
export const PLACE_NAME: Record<PlaceKey, string> = { hoian: 'Hội An', danang: 'Đà Nẵng', hue: 'Huế' }

// Diacritics matter: "Huế" (the city) must not match "Huệ" (e.g. Nguyễn Huệ street).
const RULES: [PlaceKey, RegExp][] = [
  ['hoian', /hội an|hoi an|hoian/],
  ['hue', /huế|thua thien hue|tp\.? ?hue|thanh pho hue/],
  ['danang', /đà nẵng|da nang|danang/],
]

/** The landmark named in the addresses (rest, then bride, then groom), or null when none matches. */
export function placeOf(w: Pick<Wedding, 'addrBride' | 'addrGroom' | 'addrRest'>): PlaceKey | null {
  for (const a of [w.addrRest, w.addrBride, w.addrGroom]) {
    const s = (a || '').normalize('NFC').toLowerCase()
    if (!s) continue
    for (const [k, re] of RULES) if (re.test(s)) return k
  }
  return null
}

/** Photo URL for a ceremony; the studio's home city when no address matches. */
export const placePhoto = (k: PlaceKey | null, square = false) => `/places/${k || 'danang'}${square ? '-sq' : ''}.webp`
