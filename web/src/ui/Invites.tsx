import { useState } from 'preact/hooks'
import { sendForm } from './sendForm'
import { newInvites } from '../data/invites'
import { applyInvite, createInvite } from '../data/invite-actions'
import { weddings } from '../data/weddings'
import { fieldsFor } from '../domain/ceremony'
import { coupleName, KINDS, type Kind } from '../domain/types'
import { dmy } from '../domain/vn-date'
import { Sheet } from './Shell'
import { openInvites, openWedding, copyText } from './sheets'
import { toast } from './toast'
import { ICopy } from './icons'

export function InvitesSheet() {
  const list = newInvites.value
  return <Sheet title={`Phiếu mới (${list.length})`} onClose={() => (openInvites.value = false)}>
    {!list.length && <p class="empty"><b>Không còn phiếu mới</b>Phiếu khách gửi sẽ hiện ở đây.</p>}
    <div class="stack">{list.map(inv => {
      const w = weddings.value.find(x => x.id === inv.weddingId)
      const labels = fieldsFor((inv.answers.kind as Kind) || inv.kind).filter(f => f.k)
      return <div class="card stack">
        <div><b>{coupleName({ bride: inv.answers.bride || w?.bride || '', groom: inv.answers.groom || w?.groom || '' })}</b>
          <div class="sub">{inv.appliedAt ? 'Khách bổ sung · ' : ''}{inv.answers.kind || inv.kind} {inv.answers.date ? dmy(inv.answers.date) : ''}</div></div>
        <dl class="small" style="margin:0;display:grid;grid-template-columns:auto 1fr;gap:4px 12px">
          {labels.filter(f => inv.answers[f.k!]).map(f => <><dt class="muted">{f.l}</dt><dd style="margin:0">{f.k === 'date' ? dmy(inv.answers[f.k!]) : inv.answers[f.k!]}</dd></>)}
          {inv.answers.note && <><dt class="muted">Ghi chú</dt><dd style="margin:0">{inv.answers.note}</dd></>}
        </dl>
        <div class="row">
          <button class="btn primary sm" onClick={() => applyInvite(inv).then(ok => ok && toast('Đã đưa vào hồ sơ'))}>Đưa vào hồ sơ</button>
          {w && <button class="btn sm" onClick={() => { openInvites.value = false; openWedding.value = { id: w.id } }}>Xem hồ sơ</button>}
        </div>
      </div>
    })}</div>
  </Sheet>
}

export function SendFormSheet() {
  const w = sendForm.value?.wedding
  const [kind, setKind] = useState<Kind>(w?.kind || 'Cưới')
  const [msg, setMsg] = useState('')
  const make = async () => {
    const r = createInvite(w?.id || null, kind)
    setMsg(r.message)
    toast((await copyText(r.message)) ? 'Đã chép tin nhắn kèm link phiếu – dán gửi khách' : 'Chép tin nhắn bên dưới gửi khách')
  }
  return <Sheet title={w ? `Phiếu cho ${coupleName(w)}` : 'Gửi phiếu cho khách'} onClose={() => (sendForm.value = null)}>
    <div class="stack">
      {!msg && <>
        <p class="muted">Khách mở link trên điện thoại, không cần đăng nhập. Phiếu gửi xong sẽ vào thẳng hồ sơ{w ? '' : ' mới'}, lần tới mở app anh thấy thông báo "phiếu mới".</p>
        <label class="field"><span>Loại lễ</span><select value={kind} onChange={e => setKind((e.target as HTMLSelectElement).value as Kind)}>{KINDS.map(k => <option>{k}</option>)}</select></label>
        <button class="btn primary" onClick={make}>Tạo link và chép tin nhắn</button>
      </>}
      {msg && <>
        <textarea readOnly value={msg} style="min-height:130px" />
        <button class="btn" onClick={() => copyText(msg).then(() => toast('Đã chép'))}><ICopy size={18} />Chép lại</button>
      </>}
    </div>
  </Sheet>
}
