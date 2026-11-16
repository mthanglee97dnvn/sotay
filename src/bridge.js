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
  collection, doc, setDoc, deleteDoc, getDocs, onSnapshot, query, orderBy, limit, where
} from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const NATIVE = Capacitor.isNativePlatform();
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/drive.readonly'
];
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
    set: data => setDoc(d, data),
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

function webProvider() {
  const p = new GoogleAuthProvider();
  SCOPES.forEach(s => p.addScope(s));
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
  const r = auth.currentUser ? await reauthenticateWithPopup(auth.currentUser, webProvider()) : await signInWithPopup(auth, webProvider());
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
function showGate(msg) {
  if (document.getElementById('sotayGate')) return;
  const st = document.createElement('style'); st.textContent = GATE_CSS; document.head.appendChild(st);
  const g = document.createElement('div'); g.id = 'sotayGate'; g.setAttribute('role', 'dialog'); g.setAttribute('aria-modal', 'true'); g.setAttribute('aria-labelledby', 'sgTitle');
  g.innerHTML = `<div class="g"><svg class="mk" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="16" cy="16" r="13"/><path d="M20.50 18.60L7.69 26.00 M16.00 21.20L3.19 13.80 M11.50 18.60L11.50 3.80 M11.50 13.40L24.31 6.00 M16.00 10.80L28.81 18.20 M20.50 13.40L20.50 28.20"/></svg>
    <h1 id="sgTitle">Sổ Tay Nhắc Việc</h1>
    <p>${msg || 'Đăng nhập Google để đồng bộ việc, phiếu khách và link bàn giao giữa iPhone, iPad và máy tính, và để đọc Google Lịch.'}</p>
    ${cfg ? '<button type="button" id="sgBtn"><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z"/><path fill="currentColor" opacity=".8" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"/><path fill="currentColor" opacity=".6" d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2L6.4 14z"/><path fill="currentColor" opacity=".9" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10C7.2 7.7 9.4 5.9 12 5.9z"/></svg>Đăng nhập bằng Google</button>' : ''}
    <div class="err" id="sgErr" role="alert"></div>
    <p class="note">Google sẽ hỏi quyền xem Lịch và Drive. App chỉ đọc, không sửa hay xoá gì trên tài khoản của anh.</p></div>`;
  document.body.appendChild(g);
  const b = document.getElementById('sgBtn');
  if (b) {
    b.focus();
    b.addEventListener('click', async () => {
      b.disabled = true; document.getElementById('sgErr').textContent = '';
      try { await googleSignIn(); }
      catch (e) {
        const m = String(e && (e.message || e.code) || '');
        document.getElementById('sgErr').textContent = /cancel|closed-by-user|popup-closed|12501|-5/i.test(m)
          ? 'Chưa đăng nhập. Bấm lại nút trên để thử.'
          : 'Không đăng nhập được: ' + m.slice(0, 120);
      }
      b.disabled = false;
    });
  }
}
function hideGate() { const g = document.getElementById('sotayGate'); if (g) g.remove(); }

if (auth) {
  onAuthStateChanged(auth, u => {
    if (u) { hideGate(); signedIn(u); try { localStorage.setItem('sotay-account', u.email || ''); } catch (e) {} }
    else whenBody(() => showGate());
  });
} else {
  whenBody(() => showGate('App chưa được cấu hình Firebase. Xem file HUONG-DAN.md, bước "Tạo Firebase".'));
}
function whenBody(fn) { if (document.body) fn(); else document.addEventListener('DOMContentLoaded', fn, { once: true }); }

const userApi = { id: async () => (await userReady).uid, email: async () => (await userReady).email };

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
async function gget(url, asText) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const t = await token(attempt > 0);
    let r;
    try { r = await fetch(url, { headers: { Authorization: 'Bearer ' + t } }); }
    catch (e) { throw { code: 'server_unavailable' }; }
    if (r.status === 401) { dropToken(); continue; }
    if (r.status === 403) { const j = await r.json().catch(() => ({})); const m = JSON.stringify(j); if (/insufficient|scope/i.test(m)) { dropToken(); continue; } throw { code: 'tool_error', detail: m }; }
    if (r.status === 404 || r.status === 400) throw { code: 'tool_error' };
    if (r.status >= 500) throw { code: 'server_unavailable' };
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
    async download_file_content(i) {
      const text = await gget(`${DRV}/files/${encodeURIComponent(i.fileId)}/export?${qs({ mimeType: i.exportMimeType || 'text/csv' })}`, true);
      return { content: [{ type: 'text', text }] };
    },
    async read_file_content(i) {
      const text = await gget(`${DRV}/files/${encodeURIComponent(i.fileId)}/export?${qs({ mimeType: 'text/csv' })}`, true);
      return { content: [{ type: 'text', text: '```csv\n' + text + '\n```' }] };
    },
    async get_file_metadata(i) {
      const j = await gget(`${DRV}/files/${encodeURIComponent(i.fileId)}?${qs({ fields: 'id,name,mimeType', supportsAllDrives: true })}`);
      return { payload: { id: j.id, title: j.name, mimeType: j.mimeType } };
    },
    async search_files(i) {
      const q = String(i.query || '').replace(/\btitle\b/g, 'name');
      const j = await gget(`${DRV}/files?${qs({ q, fields: 'files(id,name,mimeType)', pageSize: 50, supportsAllDrives: true, includeItemsFromAllDrives: true })}`);
      return { payload: { files: (j.files || []).map(f => ({ id: f.id, title: f.name, mimeType: f.mimeType })) } };
    }
  }
};
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
