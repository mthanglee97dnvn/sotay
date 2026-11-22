import { signal } from '@preact/signals'
import { useEffect } from 'preact/hooks'
import { mergeFeed, PRICE_FEED, type PriceCat } from '../domain/prices'
import { copyText } from './sheets'
import { toast } from './toast'
import { ICopy } from './icons'

const FEED_KEY = 'sotay2-prices-feed', OPEN_KEY = 'sotay2-prices-open'
const read = <T,>(k: string, d: T): T => { try { return JSON.parse(localStorage.getItem(k) || '') as T } catch { return d } }
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* private mode */ } }

const cached = read<unknown>(FEED_KEY, null)
const cats = signal<PriceCat[]>(mergeFeed(cached))
/** 'ok' once a list is shown (fresh or from this device); 'fail' when nothing could be loaded. */
const state = signal<'loading' | 'ok' | 'fail'>(cached ? 'ok' : 'loading')
const open = signal<string[]>(read<string[]>(OPEN_KEY, []))
let fetched = false

async function load() {
  if (fetched) return
  fetched = true
  try {
    const r = await fetch(PRICE_FEED, { cache: 'no-cache' })
    if (!r.ok) throw new Error(String(r.status))
    const f = await r.json()
    cats.value = mergeFeed(f); state.value = 'ok'; write(FEED_KEY, f)
  } catch { fetched = false; if (state.value !== 'ok') state.value = 'fail' }
}

async function copy(url: string, what: string) {
  toast(await copyText(url) ? `Đã copy link ${what}` : 'Không copy được, bấm Xem rồi copy địa chỉ trang', false)
}

function toggle(key: string) {
  open.value = open.value.includes(key) ? open.value.filter(k => k !== key) : [...open.value, key]
  write(OPEN_KEY, open.value)
}

export function Prices() {
  useEffect(() => { void load() }, [])
  return <main class="page prices">
    <h1>Báo giá</h1>
    <p class="muted small">Copy link rồi dán gửi khách. Ảnh báo giá đổi ở trang quản lý website, link giữ nguyên.</p>
    <div class="list">{cats.value.map(c => {
      const isOpen = open.value.includes(c.key)
      return <section class="pcat" data-cat={c.key} key={c.key}>
        <div class="pcat-head">
          <button class="item pcat-toggle" aria-expanded={isOpen} aria-controls={`pc-${c.key}`} onClick={() => toggle(c.key)}>
            <span class="chev" aria-hidden="true">{isOpen ? '▾' : '▸'}</span>
            <span class="grow"><span class="title">{c.label}</span>{state.value === 'ok' && <span class="sub"> · {c.sheets.length} báo giá</span>}</span>
          </button>
          <button class="btn sm ghost pcopy" aria-label={`Copy link báo giá ${c.label}`} onClick={() => copy(c.url, `báo giá ${c.label}`)}><ICopy size={18} /> Copy link</button>
        </div>
        {isOpen && <div id={`pc-${c.key}`} class="psheets">
          {state.value === 'loading' && <p class="muted small">Đang tải…</p>}
          {state.value === 'fail' && <p class="muted small">Chưa tải được danh sách báo giá. Link cả mục ở trên vẫn copy được.</p>}
          {state.value === 'ok' && !c.sheets.length && <p class="muted small">Chưa có báo giá nào trong mục này.</p>}
          {state.value === 'ok' && c.sheets.map(s => <div class="psheet" key={s.url}>
            {s.thumb ? <img src={s.thumb} alt="" width={48} height={48} loading="lazy" /> : <span class="pthumb" aria-hidden="true" />}
            <div class="grow"><div class="title">{s.name}</div><div class="sub">{s.count} trang</div></div>
            <button class="btn sm" aria-label={`Copy link ${s.name}`} onClick={() => copy(s.url, s.name)}>Copy link</button>
            <a class="btn sm ghost" href={s.url} target="_blank" rel="noopener" aria-label={`Xem ${s.name}`}>Xem</a>
          </div>)}
        </div>}
      </section>
    })}</div>
  </main>
}
