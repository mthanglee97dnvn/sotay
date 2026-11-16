// Sổ Tay Nhắc Việc — native/web bridge.
// The app was written against Claude's artifact runtime (window.claude.use('db'|'user'|'mcp'|'downloads')).
// This file provides the same surface on top of Firebase (Auth + Firestore) and Google REST APIs,
// plus real iOS local notifications so alarms ring even when the app is closed.
import { initializeApp } from 'firebase/app';
import {
  initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, browserPopupRedirectResolver,
  GoogleAuthProvider, signInWithCredential, signInWithPopup, reauthenticateWithPopup, onAuthStateChanged, signOut
} from 'firebase/auth';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, setDoc, deleteDoc, getDocs, getDoc, onSnapshot, query, orderBy, limit, where
} from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const NATIVE = Capacitor.isNativePlatform();
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/spreadsheets.readonly'
];
// One shared workspace for the studio. The first person to sign in becomes its owner and manages who may join.
const TEAM = 'mthanglee';
let ME = '';            // signed-in email (lower case)
const cfg = window.SOTAY_FIREBASE && window.SOTAY_FIREBASE.apiKey ? window.SOTAY_FIREBASE : null;
document.documentElement.classList.add(NATIVE ? 'is-native' : 'is-web');

/* ---------------- Firebase ---------------- */
let app = null, auth = null, fs = null;
if (cfg) {
  app = initializeApp(cfg);
  auth = initializeAuth(app, NATIVE
    ? { persistence: [indexedDBLocalPersistence, browserLocalPersistence] }
    : { persistence: [indexedDBLocalPersistence, browserLocalPersistence], popupRedirectResolver: browserPopupRedirectResolver });
  try {
    fs = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }), ignoreUndefinedProperties: true });
  } catch (e) {
    fs = initializeFirestore(app, { ignoreUndefinedProperties: true });
  }
}

/* Firestore wrapped to the small API the app uses:
   db.collection(path) / db.doc(path) / ref.doc(id) / ref.collection(name) / set / delete /
   orderBy / limit / where / get / onSnapshot(next, err) with snap.docs, d.id, d.data(), snap.metadata.fromCache */
function wrapQ(q) {
  return {
    _q: q,
    orderBy: (f, d) => wrapQ(query(q, orderBy(f, d))),
    limit: n => wrapQ(query(q, limit(n))),
    where: (a, o, v) => wrapQ(query(q, where(a, o, v))),
    get: () => getDocs(q),
    onSnapshot: (next, err) => onSnapshot(q, { includeMetadataChanges: true }, next, err)
  };
}
function wrapC(c) { return Object.assign(wrapQ(c), { doc: id => wrapD(doc(c, id)) }); }
function wrapD(d) {
  return {
    id: d.id,
    set: data => {
      // task documents live at data/users/<team>/<id>: remember who created each one
      if (d.path.split('/').length === 4 && data && !data.createdByEmail && ME) data = { ...data, createdByEmail: ME };
      return setDoc(d, data);
    },
    delete: () => deleteDoc(d),
    collection: name => wrapC(collection(d, name))
  };
}
const dbApi = { collection: p => wrapC(collection(fs, p)), doc: p => wrapD(doc(fs, p)) };

/* ---------------- sign-in gate ---------------- */
let signedIn = null;
const userReady = new Promise(res => { signedIn = res; });
const TOKEN_KEY = 'sotay-gtoken';
function saveToken(t) { if (t) try { localStorage.setItem(TOKEN_KEY, JSON.stringify({ t, exp: Date.now() + 50 * 60 * 1000 })); } catch (e) {} }
function readToken() { try { const x = JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null'); return x && x.exp > Date.now() ? x.t : null; } catch (e) { return null; } }
function dropToken() { try { localStorage.removeItem(TOKEN_KEY); } catch (e) {} }

function webProvider(withScopes) {
  const p = new GoogleAuthProvider();
  if (withScopes) SCOPES.forEach(s => p.addScope(s));
  if (ME) p.setCustomParameters({ login_hint: ME });
  return p;
}
async function googleSignIn() {
  if (NATIVE) {
    const r = await FirebaseAuthentication.signInWithGoogle({ scopes: SCOPES, skipNativeAuth: true });
    const c = r && r.credential;
    if (!c || !c.idToken) throw new Error('no_credential');
    saveToken(c.accessToken);
    if (!auth.currentUser) await signInWithCredential(auth, GoogleAuthProvider.credential(c.idToken, c.accessToken));
    return;
  }
  if (!auth.currentUser) { await signInWithPopup(auth, webProvider(false)); return; }   // just who you are
  const r = await reauthenticateWithPopup(auth.currentUser, webProvider(true));       // Calendar + Sheets, when needed
  const c = GoogleAuthProvider.credentialFromResult(r);
  saveToken(c && c.accessToken);
}

const GATE_CSS = `
#sotayGate{position:fixed;inset:0;z-index:9999;background:var(--bg,#f3f4f6);display:flex;align-items:center;justify-content:center;padding:24px;
  padding-top:calc(24px + env(safe-area-inset-top));font-family:"Be Vietnam Pro",system-ui,-apple-system,sans-serif;color:var(--ink,#15171c)}
#sotayGate .g{max-width:380px;width:100%;text-align:center}
#sotayGate .mk{width:64px;height:64px;color:var(--accent,#2745a3);margin:0 auto 18px}
#sotayGate h1{font-family:var(--display,inherit);font-size:28px;letter-spacing:-.02em;margin:0 0 8px}
#sotayGate p{color:var(--muted,#5a5f6a);font-size:15px;line-height:1.5;margin:0 0 24px}
#sotayGate button{width:100%;border:0;border-radius:12px;background:var(--accent,#2745a3);color:var(--on-accent,#fff);font:inherit;font-weight:600;font-size:16px;padding:14px 18px;display:flex;align-items:center;justify-content:center;gap:10px;cursor:pointer}
#sotayGate button:disabled{opacity:.6}
#sotayGate .err{color:var(--warn,#c21d2e);font-size:14px;margin-top:14px;min-height:20px}
#sotayGate .note{font-size:13px;margin-top:18px}`;
function showGate(msg, denied) {
  if (document.getElementById('sotayGate')) return;
  const st = document.createElement('style'); st.textContent = GATE_CSS; document.head.appendChild(st);
  const g = document.createElement('div'); g.id = 'sotayGate'; g.setAttribute('role', 'dialog'); g.setAttribute('aria-modal', 'true'); g.setAttribute('aria-labelledby', 'sgTitle');
  g.innerHTML = `<div class="g"><svg class="mk" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="16" cy="16" r="13"/><path d="M20.50 18.60L7.69 26.00 M16.00 21.20L3.19 13.80 M11.50 18.60L11.50 3.80 M11.50 13.40L24.31 6.00 M16.00 10.80L28.81 18.20 M20.50 13.40L20.50 28.20"/></svg>
    <h1 id="sgTitle">Sổ Tay Nhắc Việc</h1>
    <p>${msg || 'Sổ Tay dùng chung của MThanglee Studio. Đăng nhập bằng Gmail đã được mời để xem và xử lý công việc cùng cả nhóm.'}</p>
    ${denied ? '<button type="button" id="sgOut">Đăng nhập bằng Gmail khác</button>' : cfg ? '<button type="button" id="sgBtn"><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z"/><path fill="currentColor" opacity=".8" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"/><path fill="currentColor" opacity=".6" d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2L6.4 14z"/><path fill="currentColor" opacity=".9" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10C7.2 7.7 9.4 5.9 12 5.9z"/></svg>Đăng nhập bằng Google</button>' : ''}
    <div class="err" id="sgErr" role="alert"></div>
    ${denied ? '' : '<p class="note">Google sẽ hỏi quyền xem Lịch, Drive và thêm sự kiện nhắc việc vào Google Lịch của anh. App không sửa hay xoá gì khác trên tài khoản.</p>'}</div>`;
  document.body.appendChild(g);
  const o = document.getElementById('sgOut');
  if (o) { o.focus(); o.addEventListener('click', async () => { try { await signOut(auth); } catch (e) {} location.reload(); }); }
  const b = document.getElementById('sgBtn');
  if (b) {
    b.focus();
    b.addEventListener('click', async () => {
      b.disabled = true; document.getElementById('sgErr').textContent = '';
      try { await googleSignIn(); }
      catch (e) {
        const m = String(e && (e.message || e.code) || '');
        document.getElementById('sgErr').textContent = /cancel|closed-by-user|popup-closed|12501|-5/i.test(m)
          ? 'Cửa sổ đăng nhập đã đóng trước khi xong. Bấm lại nút trên và chọn Gmail của anh.'
          : /popup-blocked/i.test(m) ? 'Trình duyệt đang chặn cửa sổ đăng nhập. Cho phép cửa sổ bật lên (popup) cho trang này rồi bấm lại.'
          : /unauthorized-domain/i.test(m) ? 'Tên miền này chưa được phép đăng nhập (' + location.hostname + ').'
          : 'Không đăng nhập được: ' + m.slice(0, 120);
      }
      b.disabled = false;
    });
  }
}
let TEAM_DOC = null;
function showDenied(u) {
  hideGate();
  showGate(`Gmail <b>${(u.email || '').replace(/[<>&]/g, '')}</b> chưa được mời vào Sổ Tay của MThanglee Studio. Nhờ chủ nhóm thêm Gmail này trong Cài đặt → Thành viên nhóm, rồi tải lại trang.`, true);
}
function hideGate() { const g = document.getElementById('sotayGate'); if (g) g.remove(); }

if (auth) {
  onAuthStateChanged(auth, async u => {
    if (!u) { whenBody(() => showGate()); return; }
    ME = (u.email || '').toLowerCase();
    let ok = false, team = null;
    try {
      const ref = doc(fs, 'teams', TEAM);
      const snap = await getDoc(ref);
      if (snap.exists()) { team = snap.data(); ok = (team.members || []).map(x => String(x).toLowerCase()).includes(ME); }
      else { team = { owner: ME, members: [ME], name: 'MThanglee Studio', createdAt: Date.now() }; await setDoc(ref, team); ok = true; }
    } catch (e) { ok = false; }
    if (!ok) { whenBody(() => showDenied(u)); return; }
    TEAM_DOC = team;
    hideGate();
    try {
      localStorage.setItem('sotay-account', ME);
      if (!localStorage.getItem('sotay-devname')) localStorage.setItem('sotay-devname', JSON.stringify((u.displayName || ME.split('@')[0]).split(' ').slice(-1)[0]));
    } catch (e) {}
    signedIn(u);
  });
} else {
  whenBody(() => showGate('App chưa được cấu hình Firebase. Xem file HUONG-DAN.md, bước "Tạo Firebase".'));
}
function whenBody(fn) { if (document.body) fn(); else document.addEventListener('DOMContentLoaded', fn, { once: true }); }

const userApi = { id: async () => { await userReady; return TEAM; }, email: async () => (await userReady).email };

/* Whose alarm is this? Assigned tasks ring for the assignee; others ring for whoever created them. */
window.SOTAY_isMine = it => {
  if (!ME) return true;
  const a = String(it.assigneeEmail || '').toLowerCase();
  if (a) return a === ME;
  const c = String(it.createdByEmail || '').toLowerCase();
  return c ? c === ME : ME === String((TEAM_DOC || {}).owner || '').toLowerCase();
};

/* ---------------- Google REST (replaces the Drive / Calendar connectors) ---------------- */
function interactive() { return !!(navigator.userActivation && navigator.userActivation.isActive); }
async function token(force) {
  let t = force ? null : readToken();
  if (t) return t;
  if (!interactive()) throw { code: 'needs_reauth' };
  try { await googleSignIn(); } catch (e) { throw { code: 'needs_reauth' }; }
  t = readToken();
  if (!t) throw { code: 'needs_reauth' };
  return t;
}
async function gget(url, asText, method, body) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const t = await token(attempt > 0);
    let r;
    try {
      r = await fetch(url, { method: method || 'GET', headers: Object.assign({ Authorization: 'Bearer ' + t }, body ? { 'Content-Type': 'application/json' } : {}), body: body ? JSON.stringify(body) : undefined });
    }
    catch (e) { throw { code: 'server_unavailable' }; }
    if (r.status === 401) { dropToken(); continue; }
    if (r.status === 403) { const j = await r.json().catch(() => ({})); const m = JSON.stringify(j); if (/insufficient|scope/i.test(m)) { dropToken(); continue; } throw { code: 'tool_error', detail: m }; }
    if (r.status === 404 || r.status === 400) throw { code: 'tool_error' };
    if (r.status >= 500) throw { code: 'server_unavailable' };
    if (r.status === 204 || method === 'DELETE') return null;
    return asText ? r.text() : r.json();
  }
  throw { code: 'needs_reauth' };
}
const qs = o => Object.entries(o).filter(([, v]) => v != null && v !== '').map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&');
const rfc = s => { if (!s) return undefined; if (/[zZ]|[+-]\d\d:?\d\d$/.test(s)) return s; const d = new Date(s); return isNaN(d) ? s : d.toISOString(); };
const CAL = 'https://www.googleapis.com/calendar/v3', DRV = 'https://www.googleapis.com/drive/v3';

const tools = {
  'Google Calendar': {
    async list_calendars() {
      const j = await gget(`${CAL}/users/me/calendarList?${qs({ maxResults: 250 })}`);
      return { payload: { calendars: j.items || [] } };
    },
    async list_events(i) {
      const j = await gget(`${CAL}/calendars/${encodeURIComponent(i.calendarId)}/events?${qs({
        timeMin: rfc(i.startTime), timeMax: rfc(i.endTime), singleEvents: true, orderBy: 'startTime',
        maxResults: Math.min(i.pageSize || 250, 2500), pageToken: i.pageToken
      })}`);
      return { payload: { events: j.items || [], nextPageToken: j.nextPageToken } };
    }
  },
  'Google Drive': {
    // Form responses live in a Google Sheet: read it with the Sheets API (read-only) and hand back CSV.
    async download_file_content(i) { return { content: [{ type: 'text', text: await sheetCsv(i.fileId) }] }; },
    async read_file_content(i) { return { content: [{ type: 'text', text: '```csv\n' + await sheetCsv(i.fileId) + '\n```' }] }; },
    async get_file_metadata(i) {
      const j = await gget(`${SHEETS}/${encodeURIComponent(i.fileId)}?${qs({ fields: 'spreadsheetId,properties.title' })}`);
      return { payload: { id: j.spreadsheetId, title: (j.properties || {}).title || '' } };
    },
    async search_files() { return { payload: { files: [] } }; }
  }
};
const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets';
async function sheetCsv(id) {
  const meta = await gget(`${SHEETS}/${encodeURIComponent(id)}?${qs({ fields: 'sheets.properties.title' })}`);
  const title = (((meta.sheets || [])[0] || {}).properties || {}).title || 'Sheet1';
  const v = await gget(`${SHEETS}/${encodeURIComponent(id)}/values/${encodeURIComponent("'" + title.replace(/'/g, "''") + "'")}?${qs({ valueRenderOption: 'FORMATTED_VALUE' })}`);
  const cell = x => { const t = x == null ? '' : String(x); return /[",\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
  return (v.values || []).map(r => r.map(cell).join(',')).join('\n');
}
const mcpApi = {
  async callTool(server, tool, input) {
    await userReady;
    const fn = tools[server] && tools[server][tool];
    if (!fn) throw { code: 'tool_error' };
    return fn(input || {});
  }
};

/* ---------------- file export (.ics, .json) ---------------- */
const downloadsApi = {
  async save({ filename, data }) {
    const text = typeof data === 'string' ? data : await data.text();
    if (NATIVE) {
      const w = await Filesystem.writeFile({ path: filename, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 });
      await Share.share({ title: filename, url: w.uri });
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: /\.ics$/.test(filename) ? 'text/calendar' : 'application/json' }));
    a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
};

/* ---------------- runtime surface ---------------- */
if (!window.claude) {
  window.claude = {
    use: async name => {
      if (!fs && (name === 'db' || name === 'user')) return null;
      return ({ db: dbApi, user: userApi, mcp: mcpApi, downloads: downloadsApi })[name] || null;
    }
  };
}

/* ---------------- iOS: real alarms through local notifications ---------------- */
if (NATIVE) {
  try { if (!localStorage.getItem('sotay-devname')) localStorage.setItem('sotay-devname', JSON.stringify(/iPad/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent)) ? 'iPad' : 'iPhone')); } catch (e) {}
  const MIN = 60000;
  const hash = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h) % 2000000000 + 1; };
  const remindAt = it => {
    if (!it || it.type !== 'task' || it.done || !it.due) return null;
    const base = it.due - (Number(it.before) || 0) * MIN;
    return (it.snooze && it.snooze > base) ? it.snooze : base;
  };
  const p2 = n => String(n).padStart(2, '0');
  const hhmm = ms => { const d = new Date(ms); return `${p2(d.getHours())}:${p2(d.getMinutes())} · ${p2(d.getDate())}/${p2(d.getMonth() + 1)}`; };
  let lastSig = '', timer = null, permOk = false;

  async function reschedule() {
    if (!permOk) return;
    let items = [];
    try { items = JSON.parse(localStorage.getItem('sotay-items') || '[]') || []; } catch (e) {}
    const now = Date.now();
    const list = items.map(it => ({ it, at: remindAt(it) }))
      .filter(x => x.at && x.at > now + 5000 && x.it.ack !== x.at)
      .sort((a, b) => a.at - b.at).slice(0, 60);
    const sig = list.map(x => x.it.id + '@' + x.at + ':' + (x.it.title || '')).join('|');
    if (sig === lastSig) return;
    lastSig = sig;
    try {
      const pend = await LocalNotifications.getPending();
      const mine = (pend.notifications || []).filter(n => !n.extra || n.extra.kind !== 'instant');
      if (mine.length) await LocalNotifications.cancel({ notifications: mine.map(n => ({ id: n.id })) });
    } catch (e) {}
    if (!list.length) return;
    try {
      await LocalNotifications.schedule({
        notifications: list.map(({ it, at }) => ({
          id: hash(it.id + '@' + at),
          title: '⏰ ' + (it.title || 'Nhắc việc'),
          body: (it.due ? 'Hạn ' + hhmm(it.due) : '') + (it.body ? '\n' + String(it.body).split('\n')[0].slice(0, 120) : ''),
          schedule: { at: new Date(at), allowWhileIdle: true },
          sound: 'chuong.caf',
          threadIdentifier: 'sotay-alarm',
          extra: { kind: 'alarm', itemId: it.id }
        }))
      });
    } catch (e) { console.warn('schedule failed', e); }
  }
  const kick = () => { clearTimeout(timer); timer = setTimeout(reschedule, 1200); };

  // Re-plan whenever the app writes its task cache.
  const origSet = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k, v) { origSet.call(this, k, v); if (this === window.localStorage && k === 'sotay-items') kick(); };

  // Web Notification API used by the app (new form / link updated) → instant local notification.
  let permState = 'default';
  class NativeNotification {
    static get permission() { return permState; }
    static async requestPermission() {
      try { const r = await LocalNotifications.requestPermissions(); permState = r.display === 'granted' ? 'granted' : 'denied'; } catch (e) { permState = 'denied'; }
      permOk = permState === 'granted'; if (permOk) kick();
      return permState;
    }
    constructor(title, opts = {}) {
      const tag = String(opts.tag || '');
      if (!/^(form-|act-)/.test(tag)) return; // task alarms are already scheduled natively
      LocalNotifications.schedule({ notifications: [{ id: hash(tag + Date.now()), title, body: opts.body || '', schedule: { at: new Date(Date.now() + 300) }, extra: { kind: 'instant' } }] }).catch(() => {});
    }
  }
  window.Notification = NativeNotification;

  (async () => {
    try {
      let r = await LocalNotifications.checkPermissions();
      if (r.display !== 'granted') r = await LocalNotifications.requestPermissions();
      permState = r.display === 'granted' ? 'granted' : (r.display === 'denied' ? 'denied' : 'default');
      permOk = permState === 'granted';
      kick();
    } catch (e) {}
  })();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') reschedule(); else kick(); });
  setInterval(kick, 5 * MIN);
}

/* ---------------- Google Calendar: each person's own reminders become calendar events ----------------
   The phone's Google Calendar app then rings on time even when Sổ Tay is closed. */
const GSYNC_KEY = 'sotay-gcalsync';
const gsyncOn = () => { try { return JSON.parse(localStorage.getItem(GSYNC_KEY) || 'true') !== false; } catch (e) { return true; } };
let gsyncTimer = null, gsyncPending = false, gsyncRunning = false, gsyncStatus = '';
const shash = str => { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
function setGsyncStatus(t) { gsyncStatus = t; const el = document.getElementById('sGsyncSt'); if (el) el.textContent = t; }
function wantedEvents() {
  let items = [];
  try { items = JSON.parse(localStorage.getItem('sotay-items') || '[]') || []; } catch (e) {}
  const now = Date.now(), out = new Map();
  for (const it of items) {
    if (!it || it.type !== 'task' || it.done || !it.due || it.due < now - 3600e3) continue;
    if (!window.SOTAY_isMine(it)) continue;
    const before = Math.max(0, Math.min(40320, Number(it.before) || 0));
    const sig = shash([it.title, it.due, before, it.body || ''].join('|'));
    out.set(it.id, { it, before, sig });
  }
  return out;
}
let gsyncAgain = false;
async function gsync(interactiveOk) {
  if (!gsyncOn() || !ME) return;
  if (gsyncRunning) { gsyncAgain = true; return; }
  if (!readToken() && !(interactiveOk && interactive())) { gsyncPending = true; return; }
  gsyncRunning = true; gsyncPending = false;
  try {
    const want = wantedEvents();
    const j = await gget(`${CAL}/calendars/primary/events?${qs({ privateExtendedProperty: 'sotayApp=1', timeMin: new Date(Date.now() - 2 * 864e5).toISOString(), singleEvents: true, maxResults: 2500, showDeleted: false })}`);
    const have = new Map();
    for (const ev of (j.items || [])) { const p = (ev.extendedProperties || {}).private || {}; if (p.sotayId) have.set(p.sotayId, ev); }
    const link = location.origin + location.pathname;
    let made = 0, changed = 0, removed = 0;
    for (const [id, w] of want) {
      const ev = have.get(id);
      const body = {
        summary: '⏰ ' + (w.it.title || 'Nhắc việc'),
        description: (w.it.body ? w.it.body + '\n\n' : '') + 'Mở Sổ Tay: ' + link,
        start: { dateTime: new Date(w.it.due).toISOString() },
        end: { dateTime: new Date(w.it.due + 30 * 60e3).toISOString() },
        reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: w.before }] },
        extendedProperties: { private: { sotayApp: '1', sotayId: id, sig: w.sig } },
        transparency: 'transparent'
      };
      if (!ev) { await gget(`${CAL}/calendars/primary/events`, false, 'POST', body); made++; }
      else if (((ev.extendedProperties || {}).private || {}).sig !== w.sig) { await gget(`${CAL}/calendars/primary/events/${encodeURIComponent(ev.id)}`, false, 'PATCH', body); changed++; }
    }
    for (const [id, ev] of have) {
      if (want.has(id)) continue;
      try { await gget(`${CAL}/calendars/primary/events/${encodeURIComponent(ev.id)}`, false, 'DELETE'); removed++; } catch (e) {}
    }
    const t = new Date(), hh = String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0');
    setGsyncStatus(`Đã đồng bộ lúc ${hh}: ${want.size} việc của anh đang có trên Google Lịch` + (made + changed + removed ? ` (thêm ${made}, sửa ${changed}, xoá ${removed})` : '') + '.');
  } catch (e) {
    if (e && e.code === 'needs_reauth') { gsyncPending = true; setGsyncStatus('Cần đăng nhập Google lại. Bấm vào bất kỳ đâu trong app để tiếp tục đồng bộ.'); }
    else setGsyncStatus('Chưa đồng bộ được với Google Lịch, sẽ thử lại sau.');
  } finally {
    gsyncRunning = false;
    if (gsyncAgain) { gsyncAgain = false; setTimeout(() => gsync(false), 500); }
  }
}
function kickGsync() { clearTimeout(gsyncTimer); gsyncTimer = setTimeout(() => gsync(true), 2500); }
if (!NATIVE) {
  const origSetW = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k, v) { origSetW.call(this, k, v); if (this === window.localStorage && k === 'sotay-items') kickGsync(); };
  // A tap anywhere lets us refresh the Google sign-in when an earlier sync was waiting for it.
  document.addEventListener('pointerdown', () => { if (gsyncPending) gsync(true); }, true);
  userReady.then(() => { setTimeout(() => gsync(false), 3000); setInterval(() => gsync(false), 10 * 60e3); });
}

/* ---------------- settings: account + import ---------------- */
function mountAccount() {
  const box = document.getElementById('sDataBox');
  if (!box || document.getElementById('sAcct')) return;
  const acc = document.createElement('div');
  acc.id = 'sAcct';
  acc.innerHTML = `<div class="lbl">Tài khoản</div>
    <div class="hrow" style="flex-wrap:wrap"><span id="sAcctEmail" class="t-muted"></span><span class="grow"></span><button class="btn sm ghost danger" id="sSignOut" type="button">Đăng xuất</button></div>`;
  box.parentNode.insertBefore(acc, box);
  userReady.then(u => { document.getElementById('sAcctEmail').textContent = u.email || ''; });
  // Google Calendar sync toggle (web)
  if (!NATIVE) {
    const gs = document.createElement('div');
    gs.innerHTML = `<div class="lbl">Nhắc việc khi đã đóng web</div>
      <label class="hrow" style="gap:10px;cursor:pointer"><input type="checkbox" id="sGsync" ${gsyncOn() ? 'checked' : ''}> <span>Tự thêm việc của tôi vào Google Lịch để điện thoại báo đúng giờ</span></label>
      <div class="help mt-1" id="sGsyncSt">${gsyncStatus || 'Chỉ thêm việc được giao cho anh, hoặc việc anh tự tạo mà chưa giao cho ai. Nhớ bật thông báo của app Google Lịch trên điện thoại.'}</div>`;
    box.parentNode.insertBefore(gs, box);
    document.getElementById('sGsync').addEventListener('change', e => {
      try { localStorage.setItem(GSYNC_KEY, JSON.stringify(!!e.target.checked)); } catch (x) {}
      if (e.target.checked) gsync(true); else setGsyncStatus('Đã tắt. Sự kiện cũ trên Google Lịch giữ nguyên.');
    });
  }
  // Team members (owner manages)
  const mem = document.createElement('div');
  mem.id = 'sTeam';
  box.parentNode.insertBefore(mem, box);
  const esc2 = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const alertMsg = t => { const m = document.getElementById('sTeamMsg'); if (m) m.textContent = t; };
  const drawTeam = () => {
    const t = TEAM_DOC || { members: [] }, owner = ME === String(t.owner || '').toLowerCase();
    mem.innerHTML = `<div class="lbl">Thành viên nhóm (${(t.members || []).length})</div>
      <div>${(t.members || []).map(m => `<div class="hrow" style="justify-content:space-between;padding:4px 0"><span>${esc2(m)}${m === t.owner ? ' <span class="t-muted">· chủ nhóm</span>' : ''}${m === ME ? ' <span class="t-muted">· tôi</span>' : ''}</span>${owner && m !== t.owner ? `<button class="btn sm ghost danger" type="button" data-rm="${esc2(m)}" aria-label="Xoá ${esc2(m)} khỏi nhóm">Xoá</button>` : ''}</div>`).join('')}</div>
      ${owner ? `<div class="hstack mt-2"><input id="sTeamAdd" type="email" placeholder="gmail@gmail.com" aria-label="Gmail thành viên mới" class="grow"><button class="btn" type="button" id="sTeamAddBtn">Mời</button></div>
      <div class="help mt-1" id="sTeamMsg">Người được mời mở web, đăng nhập đúng Gmail này là vào được.</div>` : '<div class="help mt-1">Chỉ chủ nhóm thêm hoặc xoá thành viên.</div>'}`;
  };
  const saveTeam = async members => {
    const t = { ...(TEAM_DOC || {}), members, updatedAt: Date.now() };
    await setDoc(doc(fs, 'teams', TEAM), t); TEAM_DOC = t; drawTeam();
  };
  mem.addEventListener('click', async e => {
    const rm = e.target.closest('[data-rm]');
    if (rm) {
      if (rm.dataset.armed !== '1') { rm.dataset.armed = '1'; rm.textContent = 'Bấm lần nữa để xoá'; return; }
      try { await saveTeam((TEAM_DOC.members || []).filter(m => m !== rm.dataset.rm)); } catch (x) { alertMsg('Không xoá được. Thử lại.'); }
      return;
    }
    if (e.target.id === 'sTeamAddBtn') {
      const v = (document.getElementById('sTeamAdd').value || '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return alertMsg('Gmail chưa đúng, vd: ten@gmail.com');
      if ((TEAM_DOC.members || []).includes(v)) return alertMsg('Gmail này đã có trong nhóm.');
      try { await saveTeam([...(TEAM_DOC.members || []), v]); alertMsg('Đã mời ' + v + '. Gửi họ link web để đăng nhập.'); } catch (x) { alertMsg('Không mời được. Thử lại.'); }
    }
  });
  userReady.then(drawTeam);
  let armed = false;
  document.getElementById('sSignOut').addEventListener('click', async e => {
    if (!armed) { armed = true; e.target.textContent = 'Bấm lần nữa để đăng xuất'; return; }
    try { if (NATIVE) await FirebaseAuthentication.signOut(); } catch (x) {}
    await signOut(auth);
    Object.keys(localStorage).filter(k => k.startsWith('sotay-')).forEach(k => localStorage.removeItem(k));
    location.reload();
  });

  const lbl = box.querySelector('.lbl'); if (lbl) lbl.textContent = 'Sao lưu và chuyển dữ liệu';
  const imp = document.createElement('div');
  imp.className = 'mt-2';
  imp.innerHTML = `<label class="btn" for="sImportFile" style="cursor:pointer">Nhập dữ liệu từ file .json</label>
    <input type="file" id="sImportFile" accept="application/json,.json" class="sr-only" style="position:absolute;width:1px;height:1px;opacity:0">
    <div class="help mt-1" id="sImportMsg">Chọn file đã xuất từ bản Sổ Tay trong Claude. Việc và phiếu đang có sẽ được giữ, file chỉ thêm vào.</div>`;
  box.appendChild(imp);
  document.getElementById('sImportFile').addEventListener('change', async e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const msg = document.getElementById('sImportMsg');
    try {
      const j = JSON.parse(await f.text());
      if (!j || j.app !== 'sotay-nhac-viec' || !j.data) throw new Error('bad');
      const d = j.data, now = Date.now();
      const cur = JSON.parse(localStorage.getItem('sotay-items') || '[]') || [];
      const byId = new Map(cur.map(i => [i.id, i]));
      (d['sotay-items'] || []).forEach(i => { if (i && i.id && !byId.has(i.id)) byId.set(i.id, { ...i, _dirty: true, updatedAt: now }); });
      localStorage.setItem('sotay-items', JSON.stringify([...byId.values()]));
      const mergeArr = (k, idf) => {
        const a = JSON.parse(localStorage.getItem(k) || '[]') || [], have = new Set(a.map(idf));
        (d[k] || []).forEach(x => { if (x && !have.has(idf(x))) a.push(x); });
        localStorage.setItem(k, JSON.stringify(a));
      };
      mergeArr('sotay-people', x => x.email);
      mergeArr('sotay-forms', x => x.id);
      mergeArr('sotay-appresp', x => x._id);
      const dv = JSON.parse(localStorage.getItem('sotay-deliv') || '{}') || {};
      Object.entries(d['sotay-deliv'] || {}).forEach(([k, v]) => { if (!dv[k] || (dv[k].updatedAt || 0) < (v.updatedAt || 0)) dv[k] = v; });
      localStorage.setItem('sotay-deliv', JSON.stringify(dv));
      ['sotay-settings', 'sotay-consult', 'sotay-delivcfg', 'sotay-gcal', 'sotay-fintro-off', 'sotay-resp-seen']
        .forEach(k => { if (d[k] != null && localStorage.getItem(k) == null) localStorage.setItem(k, JSON.stringify(d[k])); });
      msg.textContent = 'Đã nhập. App đang tải lại để đồng bộ…';
      setTimeout(() => location.reload(), 800);
    } catch (x) { msg.textContent = 'File không đúng. Chọn file sotay-du-lieu-….json đã xuất từ bản cũ.'; }
  });
}
whenBody(() => { mountAccount(); new MutationObserver(mountAccount).observe(document.body, { childList: true, subtree: false }); });
