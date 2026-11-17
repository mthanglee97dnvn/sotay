import preact from '@preact/preset-vite'
import { defineConfig } from 'vite'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))
const cfgFile = fileURLToPath(new URL('../firebase-config.json', import.meta.url))
const firebaseConfig = process.env.FIREBASE_CONFIG || (existsSync(cfgFile) ? readFileSync(cfgFile, 'utf8') : '{}')

export default defineConfig({
  base: '/sotay/',
  plugins: [preact()],
  define: { __FIREBASE_CONFIG__: firebaseConfig },
  build: {
    target: 'es2020',
    rollupOptions: {
      input: { index: root + 'index.html', form: root + 'form.html' },
    },
  },
  test: { environment: 'node' },
} as any)
