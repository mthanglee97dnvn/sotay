// Builds www/ from src/app.html (the same app that runs inside Claude) + src/bridge.js.
// Usage: npm run build   (env FIREBASE_CONFIG='{"apiKey":...}' or a firebase-config.json file in the repo root)
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const www = join(root, 'www');
mkdirSync(www, { recursive: true });

// 1) app html + copy patches for the Firebase build
let html = readFileSync(join(root, 'src/app.html'), 'utf8');
const P = (a, b) => {
  if (!html.includes(a)) { console.error('PATCH NOT FOUND:\n' + a); process.exit(1); }
  html = html.split(a).join(b);
};
const reauthDrive = 'Phiên đăng nhập Google đã hết hạn. Bấm "Kiểm tra phiếu mới" để đăng nhập lại.';
const reauthCal = 'Phiên đăng nhập Google đã hết hạn. Bấm "Tải lại lịch Google" để đăng nhập lại.';
P(`no_mcp:'Phần này chỉ chạy khi mở app trong Claude (claude.ai hoặc app Claude).'`, `no_mcp:'Chưa đăng nhập Google. Mở lại app và đăng nhập.'`);
P(`not_granted:'Phần này chỉ chạy khi mở app trong Claude (claude.ai hoặc app Claude).'`, `not_granted:'Chưa đăng nhập Google. Mở lại app và đăng nhập.'`);
P(`needs_reauth:'Kết nối Google Drive đã hết hạn — kết nối lại trong claude.ai → Cài đặt → Connectors.'`, `needs_reauth:'${reauthDrive}'`);
P(`tool_error:'Không đọc được trang tính câu trả lời.`, `tool_error:'Không đọc được trang tính câu trả lời (hoặc tài khoản Google đang đăng nhập không có quyền xem).`);
P(`no_mcp:'Lịch Google chỉ hiện khi mở app trong Claude (claude.ai hoặc app Claude).'`, `no_mcp:'Chưa đăng nhập Google. Mở lại app và đăng nhập.'`);
P(`not_granted:'Lịch Google chỉ hiện khi mở app trong Claude.'`, `not_granted:'Chưa đăng nhập Google. Mở lại app và đăng nhập.'`);
P(`needs_reauth:'Kết nối Google Calendar đã hết hạn — kết nối lại trong claude.ai → Cài đặt → Connectors.'`, `needs_reauth:'${reauthCal}'`);
P(`• Dữ liệu tự đồng bộ giữa các máy khi anh mở app bằng cùng tài khoản Claude.`, `• Dữ liệu tự đồng bộ giữa iPhone, iPad và máy tính khi đăng nhập cùng tài khoản Google.`);
P(`• Muốn điện thoại reo cả khi đã tắt app: trong mỗi việc, bấm <b>Thêm vào Google Calendar</b> (Android) hoặc <b>Tải file lịch .ics</b> (iPhone) — lịch của máy sẽ báo đúng giờ.`,
  `<span class="only-native">• Trên app iPhone, iPad: đến giờ máy <b>tự reo chuông kể cả khi đã tắt app</b>. Nhớ cho phép Thông báo khi app hỏi (hoặc vào Cài đặt iPhone → Thông báo → Sổ Tay).</span><span class="only-web">• Trên máy tính: cần mở app thì chuông mới reo. Muốn máy tính báo cả khi tắt app, trong mỗi việc bấm <b>Thêm vào Google Calendar</b>.</span>`);
P(`Gồm việc, ghi chú, phiếu khách, người nhận việc, link bàn giao và tin nhắn mẫu. Mở app mới → Cài đặt → Nhập dữ liệu, chọn file này.`,
  `Xuất một bản sao lưu gồm việc, ghi chú, phiếu khách, người nhận việc, link bàn giao và tin nhắn mẫu.`);

const head = `
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Sổ Tay">
<meta name="theme-color" content="#2745a3">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icon-512.png">
<style>
html:not(.is-native) .only-native, html.is-native .only-web{display:none}
html.is-native #calBox{display:none!important}
html.is-native body{-webkit-user-select:none;-webkit-touch-callout:none}
html.is-native input, html.is-native textarea, html.is-native [contenteditable]{-webkit-user-select:text}
</style>
<script src="firebase-config.js?v=${Date.now()}"></script>
<script src="bridge.js?v=${Date.now()}"></script>
`;
P('</head>', head + '</head>');
writeFileSync(join(www, 'index.html'), html);

// 2) firebase config
let cfg = process.env.FIREBASE_CONFIG || '';
if (!cfg && existsSync(join(root, 'firebase-config.json'))) cfg = readFileSync(join(root, 'firebase-config.json'), 'utf8');
let parsed = null;
try { parsed = cfg ? JSON.parse(cfg) : null; } catch (e) { console.error('FIREBASE_CONFIG is not valid JSON'); process.exit(1); }
writeFileSync(join(www, 'firebase-config.js'), `window.SOTAY_FIREBASE = ${JSON.stringify(parsed)};\n`);
if (!parsed) console.warn('⚠ No Firebase config — the app will show a setup message.');

// 3) bridge bundle
await build({
  entryPoints: [join(root, 'src/bridge.js')], bundle: true, minify: true, format: 'iife',
  target: ['safari15', 'chrome100'], outfile: join(www, 'bridge.js'), legalComments: 'none', logLevel: 'warning'
});

// 4) web manifest + icons
writeFileSync(join(www, 'manifest.webmanifest'), JSON.stringify({
  name: 'Sổ Tay Nhắc Việc', short_name: 'Sổ Tay', start_url: './', display: 'standalone',
  background_color: '#f3f4f6', theme_color: '#2745a3',
  icons: [{ src: 'icon-512.png', sizes: '512x512', type: 'image/png' }, { src: 'icon-192.png', sizes: '192x192', type: 'image/png' }]
}, null, 2));
for (const f of ['icon-512.png', 'icon-192.png']) if (existsSync(join(root, 'resources', f))) copyFileSync(join(root, 'resources', f), join(www, f));
console.log('✓ www built');
