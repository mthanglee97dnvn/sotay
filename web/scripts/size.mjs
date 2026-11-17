import { readdirSync, readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
const dir = new URL('../dist/assets/', import.meta.url)
const files = readdirSync(dir).filter(f => f.endsWith('.js'))
const gz = f => gzipSync(readFileSync(new URL(f, dir))).length
// Which chunks each entry loads, from the built HTML.
const entryChunks = html => {
  const s = readFileSync(new URL('../dist/' + html, import.meta.url), 'utf8')
  return [...s.matchAll(/assets\/([^"']+\.js)/g)].map(m => m[1])
}
let fail = false
for (const [html, limit] of [['index.html', 200], ['form.html', 80]]) {
  const kb = entryChunks(html).reduce((a, f) => a + gz(f), 0) / 1024
  console.log(`${html}: ${kb.toFixed(1)} KB gzip (limit ${limit} KB)`)
  if (kb > limit) fail = true
}
console.log('all chunks:', files.map(f => `${f} ${(gz(f) / 1024).toFixed(1)}KB`).join(', '))
process.exit(fail ? 1 : 0)
