// Builds www-test/ with Firebase replaced by test/mock-firebase.js (no network needed).
import { build } from 'esbuild';
import { cpSync, writeFileSync, mkdirSync } from 'node:fs';
const mock = new URL('./mock-firebase.js', import.meta.url).pathname;
mkdirSync('www-test', { recursive: true });
cpSync('www', 'www-test', { recursive: true });
writeFileSync('www-test/firebase-config.js', 'window.SOTAY_FIREBASE = {"apiKey":"test","projectId":"test"};\n');
await build({
  entryPoints: ['src/bridge.js'], bundle: true, format: 'iife', outfile: 'www-test/bridge.js', logLevel: 'warning',
  alias: { 'firebase/app': mock, 'firebase/auth': mock, 'firebase/firestore': mock, '@capacitor-firebase/authentication': new URL('./mock-cfa.js', import.meta.url).pathname }
});
console.log('✓ www-test built');
