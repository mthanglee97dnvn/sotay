// One stroked icon set (24px grid, 1.8 stroke) so every symbol reads the same.
const P = (d: string) => (p: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={p.size || 24} height={p.size || 24} fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={d} /></svg>
)
export const ICalendar = P('M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z')
export const ICheck = P('M9 11l3 3 8-8M20 12v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h11')
export const IBox = P('M3 7l9-4 9 4-9 4-9-4ZM3 7v10l9 4 9-4V7M12 11v10')
export const IMore = P('M5 12h.01M12 12h.01M19 12h.01')
export const IPlus = P('M12 5v14M5 12h14')
export const IClose = P('M6 6l12 12M18 6L6 18')
export const IBack = P('M15 5l-7 7 7 7')
export const ICopy = P('M9 9h10v10H9zM5 15V5h10')
export const IChat = P('M4 5h16v11H8l-4 4V5Z')
export const ILink = P('M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1')
export const IInbox = P('M4 13l2-8h12l2 8M4 13v6h16v-6M4 13h5l1 2h4l1-2h5')
export const ISearch = P('M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4')
export const ITrash = P('M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3')
export const IClock = P('M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2')
export const IArrow = P('M5 12h14M13 6l6 6-6 6')
