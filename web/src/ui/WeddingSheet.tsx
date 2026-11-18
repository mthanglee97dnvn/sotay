import { useState } from 'preact/hooks'
import { weddings, saveWedding, deleteWedding } from '../data/weddings'
import { canEdit, myEmail, leadDays } from '../data/org'
import { fieldsFor, TIME_KEYS, makeupDoneBy, normClock, inputProps } from '../domain/ceremony'
import { emptyWedding, siblingDraft, channelUrl, CHANNELS, diffPatch } from '../domain/wedding'
import { consultDue, consultMessage } from '../domain/consult'
import { daysUntil, dmy } from '../domain/vn-date'
import { KINDS, coupleName, type Wedding, type Kind, type TimeKey } from '../domain/types'
import { Sheet } from './Shell'
import { openWedding, copyText } from './sheets'
import { toast } from './toast'
import { ICopy, IChat } from './icons'
import { WeddingRow } from './Upcoming'
import type { ComponentChildren } from 'preact'

const isTime = (k: string): k is TimeKey => (TIME_KEYS as readonly string[]).includes(k)

export function WeddingSheet({ extra }: { extra?: (w: Wedding) => ComponentChildren }) {
  const o = openWedding.value!
  const stored = o.id ? weddings.value.find(w => w.id === o.id) : undefined
  const [d, setD] = useState<Wedding>(() => ({ ...emptyWedding(myEmail()), ...(stored || {}), ...(o.draft || {}) } as Wedding))
  const [dirty, setDirty] = useState(!o.id)
  const [base, setBase] = useState<Wedding>(d)
  const edit = canEdit()
  // Fields that come from the calendar are edited in Framevis / Google Calendar, not here.
  const fromCal = !!d.source
  // Only fields the calendar filled are locked; empty ones stay editable (e.g. from the client form).
  const locked = (k: string) => !edit || (fromCal && (d.calFields || []).includes(k))
  const set = (p: Partial<Wedding>) => { setD({ ...d, ...p }); setDirty(true) }
  const get = (k: string) => isTime(k) ? d.times[k] || '' : String((d as unknown as Record<string, unknown>)[k] ?? '')
  const put = (k: string, v: string) => isTime(k) ? set({ times: { ...d.times, [k]: v } }) : set({ [k]: v } as Partial<Wedding>)
  const close = () => { if (dirty && edit && !confirm('Chưa lưu thay đổi. Vẫn đóng?')) return; openWedding.value = null }
  const save = () => {
    if (!d.bride.trim() && !d.groom.trim()) { toast('Nhập tên cô dâu hoặc chú rể', true); return }
    const id = d.id ? saveWedding({ id: d.id, ...diffPatch(base, d) }) : saveWedding({ ...d, id: undefined })
    setD({ ...d, id }); setBase({ ...d, id }); setDirty(false); toast('Đã lưu hồ sơ')
    if (!o.id) openWedding.value = { id }
  }
  const siblings = d.coupleKey ? weddings.value.filter(w => w.coupleKey === d.coupleKey && w.id !== d.id) : []
  const title = d.id ? coupleName(d) : 'Thêm lễ mới'

  return <Sheet title={title} onClose={close} actions={edit && <button class={'btn sm ' + (dirty ? 'primary' : 'ghost')} disabled={!dirty} onClick={save}>{dirty ? 'Lưu' : 'Đã lưu'}</button>}>
    <div class="stack">
      {d.id && d.date && <ConsultBlock w={d} onDone={v => { setD({ ...d, consultDone: v }); setBase({ ...base, consultDone: v }); saveWedding({ id: d.id, consultDone: v }) }} />}
      {d.id && extra?.(d)}
      {fromCal && <p class="muted small" style="margin:0">Lịch trình lấy từ {d.source!.cal === 'primary' ? 'Google Lịch' : 'Framevis'}. Sửa trên Framevis / Google Lịch, Sổ Tay sẽ tự cập nhật.</p>}
      <div class="card grid2">
        {fieldsFor(d.kind).map(f => f.sec ? <div class="sec">{f.sec}</div>
          : f.k === 'kind' ? <label class="field"><span>Loại lễ</span>
              <select disabled={locked('kind')} value={d.kind} onChange={e => set({ kind: (e.target as HTMLSelectElement).value as Kind })}>{KINDS.map(k => <option>{k}</option>)}</select></label>
          : <label class={'field' + (f.full ? ' full' : '')}><span>{f.l}{f.req ? ' *' : ''}</span>
              <input {...inputProps(f.type)} disabled={f.derived || locked(f.k!)} value={f.derived ? makeupDoneBy(d.times[f.from!], f.minus) : get(f.k!)} placeholder={f.type === 'time' && !f.derived ? 'vd: 07:30' : f.ph}
                onBlur={f.type === 'time' && !f.derived ? (e => { const v = normClock((e.target as HTMLInputElement).value); if (v && v !== get(f.k!)) put(f.k!, v) }) : undefined}
                onInput={e => put(f.k!, (e.target as HTMLInputElement).value)} />
              {f.hint && <span class="hint">{f.hint}</span>}</label>)}
        <div class="sec">Liên hệ & dịch vụ</div>
        <label class="field"><span>Khách nhắn qua</span>
          <select disabled={!edit} value={d.channel.kind} onChange={e => set({ channel: { ...d.channel, kind: (e.target as HTMLSelectElement).value as Wedding['channel']['kind'] } })}>
            {CHANNELS.map(([v, l]) => <option value={v}>{l}</option>)}</select></label>
        <label class="field"><span>Link chat với khách</span>
          <input type="url" disabled={!edit} placeholder="Link hội thoại Messenger / Zalo" value={d.channel.url} onInput={e => set({ channel: { ...d.channel, url: (e.target as HTMLInputElement).value } })} /></label>
        <label class="check full"><input type="checkbox" disabled={!edit || fromCal} checked={d.hasVideo} onChange={e => set({ hasVideo: (e.target as HTMLInputElement).checked })} />Có quay phim (giao thêm video)</label>
        {d.calNote && <div class="full"><div class="sec" style="margin:0 0 4px">Ghi chú trên lịch</div>
          <pre class="small" style="white-space:pre-wrap;font:inherit;margin:0;background:var(--chip);padding:10px 12px;border-radius:var(--r-md)">{d.calNote}</pre></div>}
        <label class="field full"><span>Ghi chú</span>
          <textarea disabled={!edit} value={d.notes} placeholder="Yêu cầu riêng, lưu ý cho ngày lễ…" onInput={e => set({ notes: (e.target as HTMLTextAreaElement).value })} /></label>
      </div>
      {d.id && <>
        <h2>Lễ khác của cặp này</h2>
        {siblings.length > 0 && <div class="list">{siblings.map(w => <WeddingRow w={w} />)}</div>}
        {edit && <button class="btn" onClick={() => { if (dirty) save(); openWedding.value = { draft: siblingDraft(d) } }}>Thêm lễ khác cho cặp này</button>}
      </>}
      {d.id && edit && !fromCal && <p><button class="btn ghost danger" onClick={() => { if (confirm(`Xoá hồ sơ ${coupleName(d)} (${d.kind} ${dmy(d.date)})? Không khôi phục được.`)) { deleteWedding(d.id); openWedding.value = null; toast('Đã xoá hồ sơ') } }}>Xoá hồ sơ</button></p>}
    </div>
  </Sheet>
}

function ConsultBlock({ w, onDone }: { w: Wedding; onDone: (v: boolean) => void }) {
  const n = daysUntil(w.date)
  if (n < 1) return null // on or after the day there is nothing left to consult
  const due = consultDue(w, leadDays.value)
  const url = channelUrl(w)
  return <div class="card stack" style={due ? 'border-color:var(--accent)' : ''}>
    <div class="row"><div class="grow"><b>{`Còn ${n} ngày tới ${w.kind.toLowerCase()}`}</b>
      <div class="sub">{w.consultDone ? 'Đã tư vấn' : due ? 'Đến lúc hẹn tư vấn' : `Nhắc hẹn tư vấn khi còn ${leadDays.value} ngày`}</div></div></div>
    {!w.consultDone && canEdit() && <div class="row wrap">
      <button class="btn primary sm" onClick={async () => {
        await copyText(consultMessage(w))
        toast(url ? 'Đã chép tin nhắn – dán vào khung chat' : 'Đã chép tin nhắn hẹn tư vấn')
        if (url) window.open(url, '_blank', 'noopener')
      }}><IChat size={18} />Soạn tin hẹn tư vấn</button>
      <button class="btn sm" onClick={() => copyText(consultMessage(w)).then(() => toast('Đã chép tin nhắn'))}><ICopy size={18} />Chỉ chép</button>
      <button class="btn sm" onClick={() => onDone(true)}>Đã tư vấn</button>
    </div>}
    {w.consultDone && canEdit() && <button class="btn ghost sm" onClick={() => onDone(false)}>Bỏ đánh dấu đã tư vấn</button>}
  </div>
}
