// Runs inside Google Apps Script (V8). Bundled into tools/apps-script/Code.gs.
import { buildEmail } from '../../src/domain/notify'
import { answersSig } from '../../src/domain/invite'

declare const ScriptApp: any, UrlFetchApp: any, MailApp: any, Session: any, Logger: any

const DB = 'https://firestore.googleapis.com/v1/projects/sotay-mthanglee/databases/(default)/documents'

type FsValue = { stringValue?: string; integerValue?: string; booleanValue?: boolean; timestampValue?: string; nullValue?: null; mapValue?: { fields?: Record<string, FsValue> }; arrayValue?: { values?: FsValue[] } }
function decode(v: FsValue): unknown {
  if ('stringValue' in v) return v.stringValue
  if ('integerValue' in v) return Number(v.integerValue)
  if ('booleanValue' in v) return v.booleanValue
  if ('timestampValue' in v) return v.timestampValue
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue?.fields || {}).map(([k, x]) => [k, decode(x)]))
  if ('arrayValue' in v) return (v.arrayValue?.values || []).map(decode)
  return null
}

function call(url: string, method: string, payload?: unknown) {
  const r = UrlFetchApp.fetch(url, {
    method, contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    ...(payload ? { payload: JSON.stringify(payload) } : {}),
  })
  const code = r.getResponseCode()
  if (code < 200 || code >= 300) throw new Error(`${method} ${code}: ${String(r.getContentText()).slice(0, 200)}`)
  return JSON.parse(r.getContentText() || '{}')
}

/** One check: email every submitted form whose answers haven't been emailed yet. */
export function kiemTraPhieu() {
  let rows: any[]
  try {
    rows = call(`${DB}:runQuery`, 'post', {
      structuredQuery: {
        from: [{ collectionId: 'invites' }],
        where: { compositeFilter: { op: 'AND', filters: [
          { fieldFilter: { field: { fieldPath: 'org' }, op: 'EQUAL', value: { stringValue: 'mthanglee' } } },
          { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'submitted' } } },
        ] } },
      },
    })
  } catch (e) { Logger.log('Không đọc được phiếu: ' + e); return }
  const to = Session.getEffectiveUser().getEmail()
  for (const row of rows || []) {
    try {
      const d = row.document
      if (!d) continue
      const id = String(d.name).split('/invites/')[1]
      const inv = decode({ mapValue: { fields: d.fields } }) as { kind?: string; answers?: Record<string, string>; appliedAt?: unknown; notifiedSig?: string }
      const sig = answersSig(inv.answers || {})
      if (inv.notifiedSig === sig) continue
      const mail = buildEmail(inv)
      if (!mail) continue
      MailApp.sendEmail({ to, subject: mail.subject, body: mail.body, name: 'Sổ Tay MThanglee' })
      call(`${DB}/invites/${encodeURIComponent(id)}?updateMask.fieldPaths=notifiedSig`, 'patch', { fields: { notifiedSig: { stringValue: sig } } })
    } catch (e) { Logger.log('Lỗi khi báo một phiếu: ' + e) }
  }
}

/** Run once after pasting: checks every minute from now on. */
export function caiDat() {
  for (const t of ScriptApp.getProjectTriggers()) if (t.getHandlerFunction && t.getHandlerFunction() === 'kiemTraPhieu') ScriptApp.deleteTrigger(t)
  ScriptApp.newTrigger('kiemTraPhieu').timeBased().everyMinutes(1).create()
  kiemTraPhieu()
  Logger.log('Đã cài xong: mỗi phút Sổ Tay sẽ kiểm tra phiếu mới và gửi email cho ' + Session.getEffectiveUser().getEmail())
}

/** Sends a sample email so you can see what it looks like. */
export function guiThu() {
  const mail = buildEmail({ kind: 'Cưới', answers: { bride: 'Lan', groom: 'Minh', date: '2027-02-15', phoneGroom: '0905 000 000', tArrive: '08:00' } })!
  MailApp.sendEmail({ to: Session.getEffectiveUser().getEmail(), subject: '[Thử] ' + mail.subject, body: mail.body, name: 'Sổ Tay MThanglee' })
  Logger.log('Đã gửi email thử.')
}
