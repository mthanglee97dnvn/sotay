import { useEffect, useState } from 'preact/hooks'
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore/lite'
import { app } from '../firebase'
import { fieldsFor } from '../domain/ceremony'
import { validateAnswers } from '../domain/invite'
import { KINDS, type Invite, type Kind } from '../domain/types'

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
      setInv(d); setA({ kind: d.kind, ...(d.answers || {}) })
      setSt(d.status === 'applied' ? 'applied' : d.status === 'submitted' ? 'sent' : 'form')
    }).catch(() => setSt('error'))
  }, [])

  const kind = (KINDS.includes(a.kind as Kind) ? a.kind : inv?.kind || 'Cưới') as Kind
  const submit = async (e: Event) => {
    e.preventDefault()
    const miss = validateAnswers(kind, a)
    setMissing(miss)
    if (miss.length) { document.querySelector('.field.missing input')?.scrollIntoView({ block: 'center' }); return }
    const keys = new Set(fieldsFor(kind).filter(f => f.k).map(f => f.k!).concat('note'))
    const answers = Object.fromEntries(Object.entries(a).filter(([k, v]) => keys.has(k) && v.trim()).map(([k, v]) => [k, v.trim().slice(0, 1000)]))
    setBusy(true)
    try { await updateDoc(doc(db, 'invites', token), { answers, status: 'submitted', submittedAt: serverTimestamp(), seen: false }); setSt('sent'); scrollTo(0, 0) }
    catch { alert('Chưa gửi được. Bạn kiểm tra mạng rồi bấm gửi lại giúp mình nhé!') }
    finally { setBusy(false) }
  }

  if (st === 'loading') return <main class="boot">Đang mở phiếu…</main>
  if (st === 'missing') return <Msg title="Link chưa đúng" text="Bạn nhắn lại mình để lấy link phiếu mới nhé!" />
  if (st === 'error') return <Msg title="Chưa mở được phiếu" text="Bạn kiểm tra kết nối mạng rồi tải lại trang giúp mình nhé." />
  if (st === 'applied') return <Msg title="Mình đã nhận thông tin, cảm ơn hai bạn!" text="Ekip MThanglee sẽ chuẩn bị chu đáo cho ngày vui của hai bạn. Cần đổi gì bạn cứ nhắn mình nha." />
  if (st === 'sent') return <main class="gate">
    <h1>Đã gửi, cảm ơn hai bạn!</h1>
    <p class="muted">Mình đã nhận được thông tin. Nếu có gì thay đổi, bạn sửa và gửi lại bất cứ lúc nào nhé.</p>
    <button class="btn" onClick={() => setSt('form')}>Sửa và gửi lại</button>
  </main>

  return <main class="page" style="padding-bottom:40px">
    <p class="muted small" style="margin:0">MThanglee Studio – Phóng sự cưới Đà Nẵng</p>
    <h1>Thông tin {word(kind)}</h1>
    <p class="muted">Hai bạn điền giúp mình lịch trình {word(kind)} để ekip MThanglee chuẩn bị chu đáo nhất nhé! Mục có dấu * là cần điền.</p>
    <form class="card grid2 form1" onSubmit={submit} noValidate>
      {fieldsFor(kind).map(f => f.sec ? <div class="sec">{f.sec}</div>
        : f.k === 'kind' ? <label class="field"><span>Loại lễ</span>
            <select value={kind} onChange={e => setA({ ...a, kind: (e.target as HTMLSelectElement).value })}>{KINDS.map(k => <option>{k}</option>)}</select></label>
        : <label class={'field' + (f.full ? ' full' : '') + (missing.includes(f.l!) ? ' missing' : '')}><span>{f.l}{f.req ? ' *' : ''}</span>
            <input {...({ type: f.type === 'tel' || f.type === 'date' || f.type === 'time' ? f.type : 'text' } as object)} value={a[f.k!] || ''} placeholder={f.ph} maxLength={1000}
              aria-invalid={missing.includes(f.l!)} onInput={e => setA({ ...a, [f.k!]: (e.target as HTMLInputElement).value })} />
            {missing.includes(f.l!) ? <span class="hint late">Bạn điền giúp mình mục này nhé</span> : f.hint && <span class="hint">{f.hint}</span>}</label>)}
      <label class="field full"><span>Ghi chú thêm</span><textarea maxLength={1000} value={a.note || ''} placeholder="Yêu cầu đặc biệt, lưu ý cho ekip…" onInput={e => setA({ ...a, note: (e.target as HTMLTextAreaElement).value })} /></label>
      {missing.length > 0 && <p class="full late small" role="alert">Còn thiếu: {missing.join(', ')}</p>}
      <button class="btn primary full" disabled={busy}>{busy ? 'Đang gửi…' : 'Gửi cho mình'}</button>
    </form>
  </main>
}

const Msg = ({ title, text }: { title: string; text: string }) => <main class="gate"><h1>{title}</h1><p class="muted">{text}</p></main>
