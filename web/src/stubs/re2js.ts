// Firestore bundles the RE2JS regex engine (~35 KB gzip) for pipeline regex functions.
// Sổ Tay never runs regex queries, so the app ships this stub instead (see vite.config.ts).
export const RE2JS = {
  compile(): never { throw new Error('Sổ Tay không dùng truy vấn regex của Firestore') },
}
