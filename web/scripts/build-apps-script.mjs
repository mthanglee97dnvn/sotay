// Bundles the notification script for Google Apps Script into tools/apps-script/Code.gs.
import { rolldown } from 'rolldown'
import { writeFileSync } from 'node:fs'

const bundle = await rolldown({ input: new URL('./apps-script/runtime.ts', import.meta.url).pathname, platform: 'neutral' })
const { output } = await bundle.generate({ format: 'iife', name: 'SoTay' })
const header = '// Sổ Tay MThanglee – báo phiếu mới qua email. Tạo tự động bởi web/scripts/build-apps-script.mjs, đừng sửa tay.\n'
const footer = '\nfunction kiemTraPhieu() { SoTay.kiemTraPhieu() }\nfunction caiDat() { SoTay.caiDat() }\nfunction guiThu() { SoTay.guiThu() }\n'
writeFileSync(new URL('../../tools/apps-script/Code.gs', import.meta.url), header + output[0].code + footer)
console.log('tools/apps-script/Code.gs written')
