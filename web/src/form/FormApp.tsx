import { useEffect, useState } from 'preact/hooks'
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore/lite'
import { app } from '../firebase'
import { fieldsFor, makeupDoneBy, normClock, inputProps, type FieldDef } from '../domain/ceremony'
import { noteFor } from '../domain/notes'
import { validateAnswers, CLIENT_KEYS } from '../domain/invite'
import { dateLong } from '../domain/vn-date'
import { KINDS, type Invite, type Kind } from '../domain/types'
import { Logo } from '../ui/Logo'

const db = getFirestore(app)
type State = 'loading' | 'missing' | 'error' | 'form' | 'sent' | 'applied'
const word = (k: Kind) => k === 'Đính hôn' ? 'ngày đính hôn' : k === 'Tiệc báo hỷ' ? 'buổi tiệc' : 'ngày cưới'

export function FormApp() {
  const token = location.hash.slice(1).replace(/[^0-9A-Za-z]/g, '')
  const [st, setSt] = useState<State>('loading')
  const [inv, setInv] = useState<Invite | null>(null)
  const [a, setA] = useState<Record<string, string>>({})
  const [missing, setMissing] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (token.length < 20) { setSt('missing'); return }
    getDoc(doc(db, 'invites', token)).then(s => {
      if (!s.exists()) { setSt('missing'); return }
      const d = s.data() as Invite
      setInv(d)
      // Prefilled from the profile; a pending (not yet applied) submission wins so the client loses nothing.
      const ans = d.answers || {}
      setA({ kind: d.kind, ...(d.prefill || {}), ...(d.status === 'submitted' || !d.prefill ? ans : (ans.note ? { note: ans.note } : {})) })
      setSt(d.status === 'applied' ? 'applied' : d.status === 'submitted' ? 'sent' : 'form')
    }).catch(() => setSt('error'))
  }, [])

  const kind = (KINDS.includes(a.kind as Kind) ? a.kind : inv?.kind || 'Cưới') as Kind
  const submit = async (e: Event) => {
    e.preventDefault()
    const miss = validateAnswers(kind, a)
    setMissing(miss)
    // After the re-render marks the fields, take the client straight to the first missing one.
    if (miss.length) { setTimeout(() => (document.querySelector('[aria-invalid=true]') as HTMLElement | null)?.focus()); return }
    const keys = new Set(fieldsFor(kind).filter(f => f.k && !f.derived).map(f => f.k!).concat('note'))
    const isTime = new Set(fieldsFor(kind).filter(f => f.type === 'time').map(f => f.k!))
    const answers = Object.fromEntries(Object.entries(a).filter(([k, v]) => keys.has(k) && v.trim()).map(([k, v]) => [k, (isTime.has(k) ? normClock(v) || v.trim() : v.trim()).slice(0, 1000)]))
    setBusy(true)
    // What the client saw, so applying takes only what they added or changed.
    const base = Object.fromEntries(Object.entries(inv?.prefill || {}).filter(([k, v]) => CLIENT_KEYS.includes(k) && typeof v === 'string').map(([k, v]) => [k, v.slice(0, 1000)]))
    try { await updateDoc(doc(db, 'invites', token), { answers, base, status: 'submitted', submittedAt: serverTimestamp(), seen: false }); setSt('sent'); scrollTo(0, 0) }
    catch { alert('Chưa gửi được. Bạn kiểm tra mạng rồi bấm gửi lại giúp mình nhé!') }
    finally { setBusy(false) }
  }

  if (st === 'loading') return <main class="boot">Đang mở phiếu…</main>
  if (st === 'missing') return <Msg title="Link chưa đúng" text="Bạn nhắn lại mình để lấy link phiếu mới nhé!" />
  if (st === 'error') return <Msg title="Chưa mở được phiếu" text="Bạn kiểm tra kết nối mạng rồi tải lại trang giúp mình nhé." />
  if (st === 'applied') return <main class="gate"><Logo />
    <h1>Mình đã nhận thông tin, cảm ơn hai bạn!</h1>
    <p class="muted">Ekip MThanglee sẽ chuẩn bị chu đáo cho ngày vui của hai bạn. Khi có thêm giờ giấc hay thay đổi gì, bạn bổ sung ngay tại đây nhé.</p>
    <button class="btn" onClick={() => setSt('form')}>Sửa hoặc bổ sung thông tin</button>
  </main>
  if (st === 'sent') return <main class="gate"><Logo />
    <h1>Đã gửi, cảm ơn hai bạn!</h1>
    <p class="muted">Mình đã nhận được thông tin. Nếu có gì thay đổi, bạn sửa và gửi lại bất cứ lúc nào nhé.</p>
    <button class="btn" onClick={() => setSt('form')}>Sửa hoặc bổ sung thông tin</button>
  </main>

  return <main class="page formpage">
    <header class="brand">
      <Logo />
      <span class="rule" aria-hidden="true" />
      <h1>Thông tin {word(kind)}</h1>
      <p>Hai bạn điền giúp mình lịch trình để ekip chuẩn bị chu đáo nhé!</p>
      <small>Mục có dấu <b>*</b> là cần điền</small>
    </header>
    <form class="card grid2 form1" onSubmit={submit} noValidate>
      {fieldsFor(kind).flatMap(f => [f, ...(noteFor(f.k, kind) ? [{ ...f, noteOnly: true }] : [])]).map((f: FieldDef & { noteOnly?: boolean }) => f.noteOnly
        ? <div class="callout full" role="note"><b>{noteFor(f.k, kind)!.title}{makeupDoneBy(a[f.from!], f.minus) ? ` lúc ${makeupDoneBy(a[f.from!], f.minus)}` : ' vào giờ này'}?</b><span>{noteFor(f.k, kind)!.text}</span></div>
        : f.sec ? <div class="sec">{f.sec}</div>
        : f.k === 'kind' ? <label class="field"><span>Loại lễ</span>
            <select value={kind} onChange={e => setA({ ...a, kind: (e.target as HTMLSelectElement).value })}>{KINDS.map(k => <option>{k}</option>)}</select></label>
        : <label class={'field' + (f.full ? ' full' : '') + (missing.includes(f.l!) ? ' missing' : '')}><span>{f.l}{f.req ? ' *' : ''}</span>
            <input {...inputProps(f.type)} value={f.derived ? makeupDoneBy(a[f.from!], f.minus) : a[f.k!] || ''} disabled={f.derived} placeholder={f.derived ? 'Tự tính' : f.type === 'time' ? 'vd: 07:30' : f.ph} maxLength={1000}
              onBlur={f.type === 'time' && !f.derived ? (e => { const v = normClock((e.target as HTMLInputElement).value); if (v) setA({ ...a, [f.k!]: v }) }) : undefined}
              aria-invalid={missing.includes(f.l!)} aria-required={f.req || undefined} onInput={e => setA({ ...a, [f.k!]: (e.target as HTMLInputElement).value })} />
            {missing.includes(f.l!) ? <span class="hint late">Bạn điền giúp mình mục này nhé</span> : f.type === 'date' && a[f.k!] ? <span class="hint">{dateLong(a[f.k!])}</span> : f.hint && <span class="hint">{f.hint}</span>}</label>)}
      <label class="field full"><span>Ghi chú thêm</span><textarea maxLength={1000} value={a.note || ''} placeholder="Yêu cầu đặc biệt, lưu ý cho ekip…" onInput={e => setA({ ...a, note: (e.target as HTMLTextAreaElement).value })} /></label>
      {missing.length > 0 && <p class="full late small" role="alert">Còn thiếu: {missing.join(', ')}</p>}
      <button class="btn primary full" disabled={busy}>{busy ? 'Đang gửi…' : 'Gửi cho mình'}</button>
    </form>
  </main>
}

const Msg = ({ title, text }: { title: string; text: string }) => <main class="gate"><Logo /><h1>{title}</h1><p class="muted">{text}</p></main>
