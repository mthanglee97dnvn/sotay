"""Smoke test against the mock build: python3 test/smoke.py <base-url>  (serve dist-mock at the root)."""
import json, sys, datetime
from playwright.sync_api import sync_playwright, expect

if len(sys.argv) > 1: BASE = sys.argv[1]
else:  # serve dist-mock ourselves
    import threading, functools, http.server, os
    root = os.path.join(os.path.dirname(__file__), '..', 'dist-mock')
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(http.server.SimpleHTTPRequestHandler, directory=root))
    srv.RequestHandlerClass.log_message = lambda *a: None
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    BASE = f'http://127.0.0.1:{srv.server_port}/'
TODAY = datetime.date(2026, 11, 17)
def d(n): return (TODAY + datetime.timedelta(days=n)).isoformat()
def W(id, **k): return (f'orgs/mthanglee/weddings/{id}', {'kind': 'Cưới', 'bride': 'Lan', 'groom': 'Minh', 'date': d(10), 'hasVideo': True, 'consultDone': False,
    'photo': {'link': '', 'history': []}, 'video': {'link': '', 'history': []}, 'times': {}, 'channel': {'kind': 'fanpage', 'url': ''}, 'coupleKey': '', 'notes': '', **k})
SEED = dict([
    ('orgs/mthanglee', {'admin': 'admin@test.vn', 'roles': {'vo@test.vn': 'editor', 'xem@test.vn': 'viewer'}, 'consultLeadDays': 45}),
    W('a', bride='Ngọc Ánh', groom='Hoàng Phúc', date=d(0), kind='Đính hôn', coupleKey='ngoc anh|hoang phuc'),
    W('long', bride='Nguyễn Thị Thanh Hương', groom='Trần Đình Quang Huy', date=d(5), consultDone=True),
    W('late', bride='Bảo Trân', groom='Minh Khoa', date=d(-15), photo={'link': 'https://photos/A', 'history': []}),
    W('late2', bride='Hồng Nhung', groom='Văn Tài', date=d(-14), hasVideo=False, photo={'link': 'https://photos/B', 'history': []}),
    ('invites/APPLIEDtokenAPPLIEDtokenAPPLIE', {'org': 'mthanglee', 'weddingId': 'a', 'kind': 'Đính hôn', 'status': 'applied', 'seen': True, 'appliedAt': 1, 'answers': {'bride': 'Ánh', 'groom': 'Phúc', 'phoneGroom': '0905', 'date': '2026-12-01', 'addrGroom': 'X'}}),
    ('invites/WEDtokenWEDtokenWEDtokenWED12345', {'org': 'mthanglee', 'weddingId': 'a', 'kind': 'Cưới', 'status': 'open', 'seen': True, 'answers': {}}),
    ('invites/OPENtokenOPENtokenOPENtoken12345', {'org': 'mthanglee', 'weddingId': 'a', 'kind': 'Tiệc báo hỷ', 'status': 'open', 'seen': True, 'answers': {}}),
])
fails = []
def check(name, fn):
    try: fn(); print('ok  ', name)
    except Exception as e: fails.append(name); print('FAIL', name, '-', (str(e).splitlines() or [repr(e)])[0])

# Local runs often cannot reach Google Fonts; layout checks must measure the real wide Archivo (CI loads it from Google).
# Point SMOKE_ARCHIVO_DIR at @fontsource-variable/archivo/files to get the same widths offline.
import os, base64
FONT_CSS = ''
if os.environ.get('SMOKE_ARCHIVO_DIR'):
    D = os.environ['SMOKE_ARCHIVO_DIR'].rstrip('/') + '/'
    FONT_CSS = ''.join(f"@font-face{{font-family:'Archivo';src:url(data:font/woff2;base64,{base64.b64encode(open(D + f'archivo-{sub}-wdth-normal.woff2', 'rb').read()).decode()}) format('woff2');font-weight:100 900;font-stretch:62% 125%}}" for sub in ['latin', 'latin-ext', 'vietnamese'])
    # Be Vietnam Pro sits next to it (@fontsource/be-vietnam-pro): its digits are not all the same width.
    BV = D + '../../../@fontsource/be-vietnam-pro/files/'
    if os.path.isdir(BV):
        FONT_CSS += ''.join(f"@font-face{{font-family:'Be Vietnam Pro';src:url(data:font/woff2;base64,{base64.b64encode(open(BV + f'be-vietnam-pro-{sub}-{w}-normal.woff2', 'rb').read()).decode()}) format('woff2');font-weight:{w}}}" for sub in ['latin', 'vietnamese'] for w in [400, 500, 600, 700] if os.path.exists(BV + f'be-vietnam-pro-{sub}-{w}-normal.woff2'))
with sync_playwright() as p:
    b = p.chromium.launch()
    if FONT_CSS:
        _np = b.new_page
        def _new_page(*a, **k):
            pg = _np(*a, **k); pg.route('**/fonts.googleapis.com/**', lambda r: r.fulfill(body=FONT_CSS, content_type='text/css')); return pg
        b.new_page = _new_page
    def page(user, tab='upcoming', path=''):
        pg = b.new_page(viewport={'width': 390, 'height': 844}, has_touch=True)
        pg.errors = []
        pg.on('pageerror', lambda e: pg.errors.append(str(e)))
        pg.on('console', lambda m: m.type == 'error' and pg.errors.append(m.text))
        pg.clock.install(time=datetime.datetime(2026, 11, 17, 10, 0, tzinfo=datetime.timezone(datetime.timedelta(hours=7))))
        pg.add_init_script(f"window.__SEED={json.dumps(SEED)}; window.__USER={json.dumps({'email': user} if user else None)}; localStorage.setItem('sotay2-tab', '{tab}')")
        pg.goto(BASE + path)
        return pg

    pg = page('vo@test.vn')
    check('Sắp tới shows chips', lambda: expect(pg.get_by_role('button', name='Cần hẹn tư vấn')).to_be_visible())
    def sibling():
        pg.get_by_text('Ngọc Ánh & Hoàng Phúc').first.click()
        pg.get_by_role('button', name='Thêm lễ khác cho cặp này').click()
        expect(pg.get_by_label('Tên cô dâu *')).to_have_value('Ngọc Ánh')
        pg.get_by_label('Loại lễ').select_option('Cưới')
        pg.get_by_label('Ngày tổ chức *').fill(d(30))
        pg.get_by_role('button', name='Lưu').click()
        expect(pg.get_by_text('Lễ khác của cặp này')).to_be_visible()
        expect(pg.locator('.sheet .list .item')).to_have_count(1)  # the đính hôn shows under the new cưới
    check('add a second ceremony for the same couple', sibling)
    pg.get_by_role('button', name='Đóng').click()
    def store():
        pg.get_by_role('button', name='Kho sản phẩm').click()
        late = pg.locator('.st.late').first
        expect(late).to_contain_text('Trễ')
        assert late.evaluate("e => getComputedStyle(e).color") == 'rgb(163, 52, 31)'  # overdue earth red, Light
    check('store shows late item in red', store)
    def store_search():
        pg.get_by_label('Tìm').fill('Hồng')
        expect(pg.get_by_label('Link Ảnh', exact=True)).to_have_count(1)
        expect(pg.get_by_label('Link Ảnh', exact=True)).to_have_value('https://photos/B')
        pg.get_by_label('Tìm').fill('')
    check('store search shows the right couple\'s link', store_search)
    def stale_save():
        pg.get_by_role('button', name='Sắp tới').click()
        pg.get_by_role('button', name='Xem 2 lễ đã qua').click()
        pg.get_by_text('Bảo Trân & Minh Khoa').first.click()
        # someone else saves a new link while the sheet is open
        pg.evaluate("() => { const k='orgs/mthanglee/weddings/late'; const w=window.__store.get(k); window.__store.set(k, {...w, photo: {link: 'https://photos/NEW', history: []}}); window.__notify() }")
        pg.get_by_label('Ghi chú').fill('Ghi chú mới')
        pg.get_by_role('button', name='Lưu').click()
        w = pg.evaluate("() => window.__store.get('orgs/mthanglee/weddings/late')")
        assert w['photo']['link'] == 'https://photos/NEW', w['photo']
        assert w['notes'] == 'Ghi chú mới'
        pg.get_by_role('button', name='Đóng').click()
    check('saving a profile keeps changes made by others', stale_save)
    def fab_menu():
        pg.get_by_role('button', name='Sắp tới').click()
        for item, sheet in [('Thêm việc', 'Thêm việc'), ('Gửi phiếu cho khách', 'Gửi phiếu cho khách'), ('Thêm lễ', 'Thêm lễ mới')]:
            pg.get_by_role('button', name='Thêm mới').click()
            pg.locator('.fabmenu').get_by_role('button', name=item, exact=True).click()
            expect(pg.get_by_role('dialog', name=sheet)).to_be_visible()
            pg.get_by_role('dialog').get_by_role('button', name='Đóng').click()
            pg.once('dialog', lambda d: d.accept())
    check('+ menu items open their sheets', fab_menu)
    check('editor page has no errors', lambda: (_ for _ in ()).throw(AssertionError(pg.errors)) if pg.errors else None)

    v = page('xem@test.vn')
    check('viewer has no + button', lambda: (expect(v.get_by_role('button', name='Cần hẹn tư vấn')).to_be_visible(), expect(v.locator('.fab')).to_have_count(0)))
    def viewer_ro():
        v.get_by_text('Ngọc Ánh & Hoàng Phúc').first.click()
        expect(v.get_by_label('Tên cô dâu *')).to_be_disabled()
        expect(v.get_by_role('button', name='Lưu')).to_have_count(0)
    check('viewer profile is read-only', viewer_ro)

    s = page('stranger@test.vn')
    check('stranger sees not-invited screen', lambda: expect(s.get_by_text('Bạn chưa được mời')).to_be_visible())

    f = page(None, path='form.html#OPENtokenOPENtokenOPENtoken12345')
    def form():
        expect(f.get_by_role('heading', name='Thông tin buổi tiệc')).to_be_visible()
        expect(f.get_by_label('Địa chỉ nhà gái')).to_have_count(0)
        f.get_by_label('Giờ đón khách tại nhà hàng').click(); f.keyboard.type('17:00')
        expect(f.get_by_label('Giờ cô dâu cần makeup xong')).to_have_value('15:30')
        f.get_by_label('Giờ đón khách tại nhà hàng').fill('11:00')
        expect(f.get_by_label('Giờ cô dâu cần makeup xong')).to_have_value('09:30')
        for lab, val in [('Tên cô dâu *', 'Mỹ Linh'), ('Tên chú rể *', 'Đức Anh'), ('Số điện thoại chú rể *', '0905'), ('Ngày tổ chức *', '2027-02-15'), ('Địa chỉ nhà hàng *', 'Sảnh Ruby')]:
            f.get_by_label(lab).fill(val)
        f.get_by_role('button', name='Gửi cho mình').click()
        expect(f.get_by_role('heading', name='Đã gửi, cảm ơn hai bạn!')).to_be_visible()
        assert not f.errors, f.errors
    check('public Tiệc báo hỷ form submits', form)

    import re
    ANH_EM = re.compile(r'(^|[\s,.!])(anh|em)(?=[\s,.!?]|$)', re.I | re.M)
    def client_copy():
        g = page(None, path='form.html#OPENtokenOPENtokenOPENtoken12345')
        expect(g.get_by_role('heading', name='Thông tin buổi tiệc')).to_be_visible()
        g.get_by_role('button', name='Gửi cho mình').click()
        txt = g.locator('main').inner_text()
        assert not ANH_EM.search(txt), ANH_EM.search(txt).group(0)
    check('client form speaks mình/bạn', client_copy)

    def reopen_applied():
        g = page(None, path='form.html#APPLIEDtokenAPPLIEDtokenAPPLIE')
        expect(g.get_by_text('Mình đã nhận thông tin')).to_be_visible()
        g.get_by_role('button', name='Sửa hoặc bổ sung thông tin').click()
        expect(g.get_by_label('Tên cô dâu *')).to_have_value('Ánh')
        g.get_by_label('Giờ nhà trai có mặt tại nhà gái & trình lễ').fill('08:00')
        g.get_by_role('button', name='Gửi cho mình').click()
        expect(g.get_by_role('heading', name='Đã gửi, cảm ơn hai bạn!')).to_be_visible()
        st = g.evaluate("() => window.__store.get('invites/APPLIEDtokenAPPLIEDtokenAPPLIE').status")
        assert st == 'submitted', st
    check('client can reopen an applied form and add details', reopen_applied)

    def banner_update():
        seed = dict(SEED); seed['invites/APPLIEDtokenAPPLIEDtokenAPPLIE'] = {**SEED['invites/APPLIEDtokenAPPLIEDtokenAPPLIE'], 'status': 'submitted'}
        g = b.new_page(viewport={'width': 390, 'height': 844})
        g.add_init_script(f"window.__SEED={json.dumps(seed)}; window.__USER={{email:'admin@test.vn'}}; localStorage.setItem('sotay2-tab','upcoming')")
        g.goto(BASE)
        expect(g.locator('.banner')).to_contain_text('bổ sung')
    check('admin banner tells an update apart from a new form', banner_update)

    def makeup_done():
        g = page(None, path='form.html#WEDtokenWEDtokenWEDtokenWED12345')
        done = g.get_by_label('Giờ cô dâu cần makeup xong')
        expect(done).to_be_disabled()
        # type like a person, digits only (no AM/PM step)
        arr = g.get_by_label('Giờ nhà trai có mặt tại nhà gái & trình lễ')
        arr.click(); g.keyboard.type('0800')
        expect(done).to_have_value('06:30')
        expect(g.get_by_role('note').first).to_contain_text('Vì sao cô dâu cần makeup xong lúc 06:30?')
        expect(g.get_by_role('note').first).to_contain_text('chuyên viên trang điểm')
        expect(g.get_by_label('Giờ ekip có mặt ở nhà gái')).to_have_value('06:15')
        arr.fill(''); arr.click(); g.keyboard.type('7h30')
        expect(done).to_have_value('06:00')
        g.get_by_label('Giờ makeup (trang điểm)').click()
        expect(arr).to_have_value('07:30')
        arr.fill(''); arr.click(); g.keyboard.type('08:00')
        dep = g.get_by_label('Giờ nhà trai xuất phát đến nhà gái')
        dep.click(); g.keyboard.type('0730')
        expect(g.get_by_label('Giờ ekip có mặt ở nhà trai')).to_have_value('06:00')
        expect(g.get_by_role('note').filter(has_text='Vì sao ekip có mặt ở nhà trai')).to_contain_text('Vì sao ekip có mặt ở nhà trai lúc 06:00?')
        expect(g.get_by_label('Giờ ekip có mặt ở nhà trai')).to_be_disabled()
        for lab, val in [('Tên cô dâu *', 'Linh'), ('Tên chú rể *', 'Thắng'), ('Số điện thoại chú rể *', '0766552110'), ('Ngày tổ chức *', '2027-02-15'), ('Địa chỉ nhà trai *', '248/12 Nguyễn Phước Nguyên')]:
            g.get_by_label(lab).fill(val)
        g.get_by_role('button', name='Gửi cho mình').click()
        expect(g.get_by_role('heading', name='Đã gửi, cảm ơn hai bạn!')).to_be_visible()
        ans = g.evaluate("() => window.__store.get('invites/WEDtokenWEDtokenWEDtokenWED12345').answers")
        assert 'tMakeupDone' not in ans and ans.get('tArrive') == '08:00', ans
    check('form shows makeup-done time 1h30 before trình lễ', makeup_done)

    def wide_rows_align():
        g = b.new_page(viewport={'width': 1000, 'height': 900})
        g.add_init_script(f"window.__SEED={json.dumps(SEED)}")
        g.goto(BASE + 'form.html#WEDtokenWEDtokenWEDtokenWED12345')
        y1 = g.get_by_label('Giờ makeup (trang điểm)').bounding_box()['y']
        y2 = g.get_by_label('Giờ cô dâu cần makeup xong').bounding_box()['y']
        assert abs(y1 - y2) < 2, (y1, y2)
    check('fields in one row start at the same height', wide_rows_align)

    def form_mobile_layout():
        g = b.new_page(viewport={'width': 430, 'height': 932}, is_mobile=True, has_touch=True)
        g.add_init_script(f"window.__SEED={json.dumps(SEED)}")
        g.goto(BASE + 'form.html#OPENtokenOPENtokenOPENtoken12345')
        expect(g.get_by_label('Ngày tổ chức *')).to_be_visible()
        card = g.locator('form.card').bounding_box()
        boxes = [g.locator(sel).nth(i).bounding_box() for sel in ['form input, form select, form textarea'] for i in range(g.locator(sel).count())]
        xs = {round(bx['x']) for bx in boxes}
        assert len(xs) == 1, f'fields not in one column: {sorted(xs)}'
        over = [bx for bx in boxes if bx['x'] + bx['width'] > card['x'] + card['width'] - 1]
        assert not over, f'{len(over)} fields overflow the card'
    check('client form fits a phone in one column', form_mobile_layout)
    # ---- calendar sync (admin) ----
    FV = '8be6adaa55c616c63c7a632f1689bc68254a176505b575d3178e79a03f69de2c@group.calendar.google.com'
    CAL_EVENT = {'id': 'fvX', 'summary': 'Trọn Gói Cơ Bản - Bảo Duyên / Page (2 Chụp + 2 Quay)', 'start': {'dateTime': d(33) + 'T06:30:00+07:00'},
        'description': 'Khách: Bảo Duyên · 0947085464\n\nNote: WEDDING TIMELINE / BẢO DUYÊN - XUÂN BÁCH\n\n* Nhà trai \n- Địa chỉ : 27A/7 Thái Phiên\n- Giờ nhà trai có mặt trình lễ : 8H00\n\n* Nhà gái \n- SĐT : 0947085464\n\nPhụ kiện: hoa cầm tay\nID: bkN6S31RCE7TVY1N'}
    DUP = {'id': 'prX', 'summary': 'Phóng sự cưới - Bảo Duyên / FB (2 Chụp)', 'start': {'dateTime': d(33) + 'T06:00:00+07:00'}, 'description': 'BÁO GIÁ 2026\n- SĐT : 0947085464'}
    calls = []
    def cal_route(route):
        url = route.request.url
        calls.append(url)
        items = [CAL_EVENT] if FV.split('@')[0] in url else [DUP] if '/primary/' in url else []
        route.fulfill(status=200, content_type='application/json', body=json.dumps({'items': items}))
    def admin_page(user):
        pg = page(user)
        pg.route('**/calendar/v3/calendars/**', cal_route)
        pg.route('**/accounts.google.com/gsi/client', lambda r: r.fulfill(status=200, content_type='text/javascript', body=''))
        pg.evaluate("e => localStorage.setItem('sotay2-gtoken', JSON.stringify({t: 'tok', email: e, exp: Date.now() + 3e6}))", user)
        pg.reload()
        return pg
    a = admin_page('admin@test.vn')
    def cal_sync():
        expect(a.get_by_text('Đã đồng bộ')).to_be_visible(timeout=8000)
        expect(a.get_by_text('Bảo Duyên & Xuân Bách')).to_have_count(1)
        expect(a.get_by_role('button', name='Cần hẹn tư vấn')).to_contain_text('1')  # the đính hôn is today: no longer counted
    check('admin: calendar bookings become profiles once', cal_sync)
    def cal_readonly():
        a.get_by_text('Bảo Duyên & Xuân Bách').first.click()
        expect(a.get_by_label('Tên cô dâu *')).to_be_disabled()
        expect(a.get_by_text('Sửa trên Framevis / Google Lịch').first).to_be_visible()
        expect(a.get_by_text('Ghi chú trên lịch')).to_be_visible()
        expect(a.get_by_text('Phụ kiện: hoa cầm tay', exact=False)).to_be_visible()
        expect(a.locator('.sheet').get_by_role('button', name='Đã tư vấn', exact=True)).to_be_enabled()
    check('admin: synced fields read-only, calendar note shown', cal_readonly)
    calls.clear()
    e2 = admin_page('vo@test.vn')
    e2.wait_for_timeout(1500)
    check('editor: no calendar reads, no sync status', lambda: (expect(e2.get_by_text('Đã đồng bộ')).to_have_count(0), None if not calls else (_ for _ in ()).throw(AssertionError(calls))))
    # --- Thợ freelancer tab ---
    t = page('vo@test.vn', tab='crew')
    t.add_init_script("window.__copied=[];window.__opened=[];navigator.clipboard.writeText=x=>(window.__copied.push(x),Promise.resolve());window.__order=[];navigator.clipboard.writeText=x=>(window.__copied.push(x),Promise.resolve().then(()=>window.__order.push('copied')));window.open=u=>(window.__opened.push(u),window.__order.push('open'),null)")
    t.reload()
    def crew_tab():
        labels = t.locator('.nav button').evaluate_all("bs => bs.map(b => b.getAttribute('aria-label') || b.innerText.trim())")
        assert labels.index('Thợ') == labels.index('Kho sản phẩm') + 1, labels
    check('thợ: tab shows between Kho sản phẩm and Thêm', crew_tab)
    def crew_add():
        t.get_by_role('button', name='Thêm thợ').click()
        t.get_by_label('Tên', exact=True).fill('Minh Tuấn')
        t.get_by_label('Link Facebook').fill('https://www.facebook.com/minhtuan.photo')
        t.get_by_role('button', name='Lưu').click()
        expect(t.locator('.list').get_by_text('Minh Tuấn')).to_be_visible()
    check('thợ: editor adds a thợ and it appears in the list', crew_add)
    def crew_ask():
        t.get_by_label('Ngày cần thợ').fill('2026-11-28')
        t.get_by_role('button', name='Chụp', exact=True).click()
        t.get_by_role('button', name='Hỏi lịch').first.click()
        t.wait_for_function('window.__opened.length > 0')
        assert t.evaluate('window.__copied[0]') == 'Hí Lô Ae, ngày Thứ Bảy 28/11 bên Thén đang cần tìm thợ chụp, Ae còn rảnh lịch không báo giúp Thén để nhận lịch nhé', t.evaluate('window.__copied')
        assert t.evaluate('window.__opened[0]') == 'https://m.me/minhtuan.photo'
    check('thợ: Hỏi lịch copies the message with the chosen date and opens m.me', crew_ask)
    def crew_blocked():
        assert t.evaluate('window.__order[0]') == 'open', t.evaluate('window.__order')
        link = t.locator('.sheet a', has_text='Mở Messenger')
        expect(link).to_have_attribute('href', 'https://m.me/minhtuan.photo')
        t.keyboard.press('Escape')
    check('thợ: chat opens in the tap itself; if blocked, a Mở Messenger link is offered', crew_blocked)
    v = page('xem@test.vn', tab='crew')
    def crew_viewer():
        expect(v.locator('h1')).to_contain_text('Thợ freelancer')
        expect(v.get_by_role('button', name='Thêm thợ')).to_have_count(0)
    check('thợ: viewer sees the list without Thêm thợ', crew_viewer)
    def crew_fit():
        t.set_viewport_size({'width': 320, 'height': 640})
        assert t.evaluate('document.documentElement.scrollWidth <= innerWidth')
        assert t.evaluate("[...document.querySelectorAll('.nav button')].every(b => b.scrollWidth <= b.clientWidth + 1)")
    check('thợ: five nav items fit at 320px', crew_fit)
    # --- accessibility: keyboard and screen-reader behaviour ---
    k = page('admin@test.vn')
    def sheet_focus():
        row = k.locator('.list .item').first
        row.focus(); k.keyboard.press('Enter')
        expect(k.locator('.sheet')).to_be_visible()
        expect(k.locator('.sheet:focus')).to_have_count(1)
        for _ in range(40):
            k.keyboard.press('Tab')
            assert k.evaluate("() => !!document.activeElement.closest('.sheet')"), 'Tab left the open sheet'
        k.keyboard.press('Escape')
        expect(k.locator('.sheet')).to_have_count(0)
        expect(k.locator('.item:focus')).to_have_count(1)
    check('a11y: sheet takes focus, traps Tab, returns focus on Esc', sheet_focus)
    def fab_keys():
        k.locator('.fab').focus(); k.keyboard.press('Enter')
        expect(k.locator('.fabmenu :focus')).to_have_count(1)
        k.keyboard.press('Escape')
        expect(k.locator('.fabmenu')).to_have_count(0)
        expect(k.locator('.fab:focus')).to_have_count(1)
    check('a11y: + menu opens into its items and closes with Esc', fab_keys)
    check('a11y: toast region is always present for screen readers', lambda: expect(k.locator('[role=status][aria-live=polite]')).to_have_count(1))
    r = page(None, path='form.html#WEDtokenWEDtokenWEDtokenWED12345')
    def form_required():
        r.wait_for_selector('[aria-required=true]')
        assert r.locator('[aria-required=true]').count() >= 4, 'required fields not marked'
        r.get_by_role('button', name='Gửi cho mình').click()
        expect(r.locator(':focus')).to_have_attribute('aria-invalid', 'true')
        assert r.evaluate("getComputedStyle(document.activeElement).borderTopColor") == 'rgb(163, 52, 31)', 'missing field border not red'
        assert r.evaluate("getComputedStyle(document.activeElement.closest('.field').querySelector('.hint.late')).color") == 'rgb(163, 52, 31)', 'missing hint not red'
    check('a11y: client form marks required fields and focuses the first missing one', form_required)
    # --- website look: Light and Dark ---
    OLD = ['rgb(17, 34, 80)', 'rgb(60, 80, 125)', 'rgb(224, 197, 143)', 'rgb(27, 47, 99)', 'rgb(3, 10, 34)', '/places/']
    SCAN = """(old) => { const bad = new Set(); for (const e of document.querySelectorAll('*')) { const cs = getComputedStyle(e);
        for (const v of [cs.color, cs.backgroundColor, cs.borderTopColor, cs.borderBottomColor, cs.backgroundImage]) for (const o of old) if (v && v.includes(o)) bad.add((e.className && e.className.baseVal === undefined ? e.className : e.tagName) + ' ' + o) } return [...bad].slice(0, 8) }"""
    def themed(user, theme, path='', scheme='light'):
        pg = page(user, path=path)
        pg.close()
        pg = b.new_page(viewport={'width': 390, 'height': 844}, has_touch=True, color_scheme=scheme)
        pg.errors = []
        pg.on('pageerror', lambda e: pg.errors.append(str(e)))
        pg.clock.install(time=datetime.datetime(2026, 11, 17, 10, 0, tzinfo=datetime.timezone(datetime.timedelta(hours=7))))
        pg.add_init_script(f"window.__SEED={json.dumps(SEED)}; window.__USER={json.dumps({'email': user} if user else None)}; localStorage.setItem('sotay2-tab', 'upcoming'); {'' if theme is None else f'localStorage.setItem(%r, %r);' % ('sotay2-theme', theme)}")
        pg.goto(BASE + path)
        return pg
    def no_old_colours():
        for theme in ['light', 'dark']:
            q = themed('vo@test.vn', theme)
            expect(q.get_by_role('button', name='Cần hẹn tư vấn')).to_be_visible()
            assert q.evaluate('document.documentElement.dataset.theme') == theme
            for name in ['Việc', 'Kho sản phẩm', 'Thợ', 'Thêm', 'Sắp tới']:
                q.get_by_role('button', name=name, exact=True).first.click(); q.wait_for_timeout(150)
                bad = q.evaluate(SCAN, OLD); assert not bad, f'{theme}/{name}: {bad}'
            q.locator('.list .item').first.click(); expect(q.locator('.sheet')).to_be_visible()
            bad = q.evaluate(SCAN, OLD); assert not bad, f'{theme}/profile: {bad}'
            q.close()
    check('look: no Hướng D colours or landmark photos, Light and Dark', no_old_colours)
    def form_light():
        q = themed(None, 'dark', path='form.html#OPENtokenOPENtokenOPENtoken12345', scheme='dark')
        expect(q.get_by_role('heading', name='Thông tin buổi tiệc')).to_be_visible()
        assert q.evaluate('document.documentElement.dataset.theme') == 'light'
        assert q.evaluate('getComputedStyle(document.body).backgroundColor') == 'rgb(235, 230, 221)'
        assert q.evaluate("document.querySelector('meta[name=theme-color]').content") == '#ebe6dd'
        bad = q.evaluate(SCAN, OLD); assert not bad, bad
    check('look: client form is always Light', form_light)
    def fonts():
        q = themed('vo@test.vn', 'light')
        expect(q.get_by_role('button', name='Cần hẹn tư vấn')).to_be_visible()
        fam = lambda sel: q.evaluate(f"getComputedStyle(document.querySelector({sel!r})).fontFamily")
        assert fam('.page h1').startswith('Archivo'), fam('.page h1')
        assert fam('body').startswith('"Be Vietnam Pro"'), fam('body')
        assert 'Archivo' in q.evaluate("document.querySelector('link[rel=stylesheet][href*=\"fonts.googleapis\"]').href")
        assert 'Noto+Serif+Display:ital,wght@1,300' in q.evaluate("document.querySelector('link[rel=stylesheet][href*=\"fonts.googleapis\"]').href")
    check('look: website fonts', fonts)
    CONTRAST = """() => {
      const rgb = s => { const m = s.match(/[\\d.]+/g).map(Number); return [m[0], m[1], m[2], m.length > 3 ? m[3] : 1] }
      const lum = ([r, g, b]) => { const f = c => { c /= 255; return c <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4 }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b) }
      const bgOf = e => { const layers = []; for (let n = e; n; n = n.parentElement) { const c = rgb(getComputedStyle(n).backgroundColor); if (c[3] > 0) { layers.push(c); if (c[3] >= 1) break } }
        let out = [255, 255, 255]; for (const c of layers.reverse()) out = out.map((v, i) => v * (1 - c[3]) + c[i] * c[3]); return out }
      const bad = []
      for (const e of document.querySelectorAll('body *')) {
        if (![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue
        const r = e.getBoundingClientRect(), cs = getComputedStyle(e)
        if (!r.width || !r.height || cs.visibility === 'hidden' || +cs.opacity === 0 || e.closest('[aria-hidden=true]')) continue
        const bg = bgOf(e), fg0 = rgb(cs.color), a = fg0[3] * (+cs.opacity || 1)
        const fg = bg.map((v, i) => v * (1 - a) + fg0[i] * a)
        const L1 = lum(fg), L2 = lum(bg), ratio = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05)
        const size = parseFloat(cs.fontSize), large = size >= 24 || (size >= 18.66 && +cs.fontWeight >= 700)
        if (ratio < (large ? 3 : 4.5) && !(e.disabled || e.closest(':disabled'))) bad.push(e.textContent.trim().slice(0, 24) + ' ' + ratio.toFixed(2))
      }
      return bad.slice(0, 8) }"""
    def contrast_both():
        for theme in ['light', 'dark']:
            q = themed('vo@test.vn', theme)
            expect(q.get_by_role('button', name='Cần hẹn tư vấn')).to_be_visible()
            for name in ['Sắp tới', 'Việc', 'Kho sản phẩm', 'Thợ', 'Thêm']:
                q.get_by_role('button', name=name, exact=True).first.click(); q.wait_for_timeout(150)
                bad = q.evaluate(CONTRAST); assert not bad, f'{theme}/{name}: {bad}'
            q.get_by_role('button', name='Sắp tới', exact=True).first.click()
            q.locator('.list .item').first.click(); expect(q.locator('.sheet')).to_be_visible(); q.wait_for_timeout(300)
            bad = q.evaluate(CONTRAST); assert not bad, f'{theme}/profile: {bad}'
            q.close()
        q = themed(None, None, path='form.html#OPENtokenOPENtokenOPENtoken12345')
        expect(q.get_by_role('heading', name='Thông tin buổi tiệc')).to_be_visible()
        bad = q.evaluate(CONTRAST); assert not bad, f'form: {bad}'
    check('look: text contrast ≥ 4.5:1 in Light and Dark', contrast_both)
    def upcoming_layout():
        q = themed('vo@test.vn', 'light')
        expect(q.locator('.hero')).to_be_visible()
        assert q.evaluate("(h => [h, ...h.querySelectorAll('*')].every(e => getComputedStyle(e).backgroundImage === 'none'))(document.querySelector('.hero'))"), 'hero has a background image'
        for t in q.locator('h2.roll').all_text_contents():
            assert re.match(r'^Tháng \d{1,2}/\d{4}', t.strip()) or t.strip().startswith('Chưa có ngày'), t
        soon = q.locator('.item.wrow.soon .pill').first
        expect(soon).to_be_visible()
        assert soon.evaluate("e => { const c = getComputedStyle(e); return c.textDecorationLine.includes('underline') || parseFloat(c.borderBottomWidth) > 0 }"), 'soon countdown not underlined'
        assert soon.evaluate("e => getComputedStyle(e).color") == q.evaluate("getComputedStyle(document.body).color"), 'soon countdown uses a hue'
    check('look: Sắp tới hero, month rolls, ≤7-day underline', upcoming_layout)
    def no_overflow_320():
        q = themed('vo@test.vn', 'light'); q.set_viewport_size({'width': 320, 'height': 700})
        expect(q.get_by_text('Nguyễn Thị Thanh Hương', exact=False).first).to_be_visible()
        for name in ['Sắp tới', 'Việc', 'Kho sản phẩm', 'Thợ', 'Thêm']:
            q.get_by_role('button', name=name, exact=True).first.click(); q.wait_for_timeout(120)
            assert q.evaluate('document.documentElement.scrollWidth <= 320'), name
        q.get_by_role('button', name='Sắp tới', exact=True).first.click()
        q.get_by_text('Nguyễn Thị Thanh Hương', exact=False).first.click(); expect(q.locator('.sheet')).to_be_visible()
        assert q.evaluate("document.documentElement.scrollWidth <= 320 && [...document.querySelectorAll('.sheet *')].every(e => e.getBoundingClientRect().right <= 321)"), 'profile overflows'
        f2 = themed(None, None, path='form.html#OPENtokenOPENtokenOPENtoken12345'); f2.set_viewport_size({'width': 320, 'height': 700})
        expect(f2.get_by_role('heading', name='Thông tin buổi tiệc')).to_be_visible()
        assert f2.evaluate('document.documentElement.scrollWidth <= 320'), 'form overflows'
    check('look: nothing overflows at 320px, long names wrap', no_overflow_320)
    def targets():
        q = themed('vo@test.vn', 'light')
        expect(q.locator('.fab')).to_be_visible()
        small = q.evaluate("[...document.querySelectorAll('.nav button, .fab')].filter(e => { const r = e.getBoundingClientRect(); return r.width < 44 || r.height < 44 }).map(e => e.textContent || e.className)")
        assert not small, small
        q.locator('.list .item').first.click(); expect(q.locator('.sheet')).to_be_visible()
        small = q.evaluate("[...document.querySelectorAll('.sheethead button')].filter(e => { const r = e.getBoundingClientRect(); return r.width < 44 || r.height < 44 }).map(e => e.textContent)")
        assert not small, small
    check('look: tab bar, + and sheet header buttons ≥ 44px', targets)
    def themebtn_clear():
        q = themed('admin@test.vn', 'light'); q.set_viewport_size({'width': 320, 'height': 700})
        expect(q.get_by_role('button', name='Cần hẹn tư vấn')).to_be_visible()
        HIT = """() => { const b = document.querySelector('.themebtn').getBoundingClientRect(), hit = []
          for (const e of document.querySelectorAll('.page h1, .page .eyebrow, .page .kicker, .page > button, .mast-date, .mast .syncbtn')) {
            const rg = document.createRange(); rg.selectNodeContents(e)
            for (const r of e.tagName === 'BUTTON' ? [e.getBoundingClientRect()] : [...rg.getClientRects()]) if (r.width && r.right > b.left && r.left < b.right && r.bottom > b.top && r.top < b.bottom) { hit.push(e.textContent.slice(0, 20)); break } }
          return hit }"""
        for name in ['Sắp tới', 'Việc', 'Kho sản phẩm', 'Thợ', 'Thêm']:
            q.get_by_role('button', name=name, exact=True).first.click(); q.wait_for_timeout(120)
            hit = q.evaluate(HIT); assert not hit, f'{name}: {hit}'
        q.get_by_role('button', name='Nhập dữ liệu cũ').click(); q.wait_for_timeout(150)
        hit = q.evaluate(HIT); assert not hit, f'Nhập dữ liệu cũ: {hit}'
    check('look: the theme button never covers a title at 320px', themebtn_clear)
    def hero_kind():
        q = themed('vo@test.vn', 'light')
        assert 'Đính hôn' in q.locator('.hero').inner_text() and 'Có quay' in q.locator('.hero').inner_text(), q.locator('.hero').inner_text()
    check('look: nearest wedding shows its kind and Có quay', hero_kind)
    def theme_header():
        q = themed('vo@test.vn', None, scheme='light')
        expect(q.get_by_role('button', name='Cần hẹn tư vấn')).to_be_visible()
        assert q.evaluate('document.documentElement.dataset.theme') == 'light'
        q.get_by_role('button', name='Chuyển sang giao diện tối').click()
        assert q.evaluate('document.documentElement.dataset.theme') == 'dark'
        assert q.evaluate("localStorage.getItem('sotay2-theme')") == 'dark'
        q.evaluate("window.__dcl = null")
        q.reload(); q.wait_for_load_state('domcontentloaded')
        assert q.evaluate('document.documentElement.dataset.theme') == 'dark'
        assert q.evaluate("document.querySelector('meta[name=theme-color]').content") == '#111111'
        expect(q.get_by_role('button', name='Chuyển sang giao diện sáng')).to_be_visible()
    check('theme: header button switches and is remembered', theme_header)
    def theme_more():
        q = themed('vo@test.vn', None, scheme='dark')
        expect(q.get_by_role('button', name='Cần hẹn tư vấn')).to_be_visible()
        assert q.evaluate('document.documentElement.dataset.theme') == 'dark'
        q.get_by_role('button', name='Thêm', exact=True).first.click()
        grp = q.get_by_role('radiogroup', name='Giao diện')
        expect(grp).to_be_visible()
        expect(grp.get_by_text('Theo cài đặt sáng/tối của máy')).to_be_visible()
        grp.get_by_role('radio', name='Sáng', exact=True).check()
        assert q.evaluate('document.documentElement.dataset.theme') == 'light'
        grp.get_by_role('radio', name='Tự động', exact=False).check()
        assert q.evaluate('document.documentElement.dataset.theme') == 'dark'
        q.emulate_media(color_scheme='light'); q.wait_for_timeout(100)
        assert q.evaluate('document.documentElement.dataset.theme') == 'light'
        expect(grp.get_by_role('radio', name='Tự động', exact=False)).to_be_checked()
        expect(q.get_by_role('button', name='Chuyển sang giao diện tối')).to_be_visible()  # header button follows the device too
    check('theme: Thêm has Tự động / Sáng / Tối and Tự động follows the device', theme_more)
    def theme_bad_value():
        q = themed('vo@test.vn', 'x', scheme='dark')
        expect(q.get_by_role('button', name='Cần hẹn tư vấn')).to_be_visible()
        assert q.evaluate('document.documentElement.dataset.theme') == 'dark'
        assert not q.errors, q.errors
    check('theme: an unknown stored value behaves as Tự động', theme_bad_value)
    def theme_viewer():
        q = themed('xem@test.vn', 'light')
        expect(q.get_by_role('button', name='Cần hẹn tư vấn')).to_be_visible()
        q.get_by_role('button', name='Chuyển sang giao diện tối').click()
        assert q.evaluate('document.documentElement.dataset.theme') == 'dark'
        q.get_by_role('button', name='Thêm', exact=True).first.click()
        expect(q.get_by_role('radiogroup', name='Giao diện')).to_be_visible()
    check('theme: viewer can switch too', theme_viewer)
    def favicon():
        for path in ['', 'form.html#OPENtokenOPENtokenOPENtoken12345']:
            q = themed(None if path else 'vo@test.vn', 'light', path=path)
            q.wait_for_load_state('load')
            hrefs = q.evaluate("[...document.querySelectorAll('link[rel~=icon]')].map(l => l.href)")
            assert hrefs, f'no favicon on /{path}'
            for h in hrefs:
                st = q.evaluate(f"fetch({h!r}).then(r => r.status + ' ' + r.headers.get('content-type'))")
                assert st.startswith('200 image/'), (h, st)
    check('favicon: app and client form show the Sổ Tay icon in the tab', favicon)
    def one_link_per_profile():
        g = page('admin@test.vn')
        g.get_by_text('Nguyễn Thị Thanh Hương', exact=False).first.click()
        expect(g.locator('.sheet')).to_be_visible()
        def copy_url():
            g.get_by_role('button', name='Gửi phiếu cho khách điền').click()
            g.get_by_role('button', name='Chép link và tin nhắn').click()
            msg = g.locator('.sheet').last.locator('textarea').input_value()
            g.locator('.sheet').last.press('Escape'); g.wait_for_timeout(150)
            return re.search(r'https?://\S+form\.html#\w+', msg).group(0), msg
        u1, msg = copy_url()
        assert 'điền sẵn' in msg, msg
        u2, _ = copy_url()
        assert u1 == u2, (u1, u2)
        tok = u1.split('#')[1]
        inv = g.evaluate(f"() => window.__store.get('invites/{tok}')")
        assert inv['weddingId'] == 'long' and inv['prefill']['bride'] == 'Nguyễn Thị Thanh Hương', inv
        assert set(inv['prefill']) <= {'kind','bride','groom','phoneBride','phoneGroom','date','addrBride','addrGroom','addrRest','tMakeup','tDepart','tArrive','tRuoc','tWelcome','tParty'}, inv['prefill']
        assert g.evaluate("() => window.__store.get('orgs/mthanglee/weddings/long').formToken") == tok
        g.get_by_label('Địa chỉ nhà hàng').fill('Nhà hàng Mới')
        g.get_by_label('Ghi chú').fill('GHI CHU NOI BO')
        g.get_by_role('button', name='Lưu').click(); g.wait_for_timeout(300)
        inv = g.evaluate(f"() => window.__store.get('invites/{tok}')")
        assert inv['prefill'].get('addrRest') == 'Nhà hàng Mới', inv['prefill']
        assert 'GHI CHU NOI BO' not in json.dumps(inv, ensure_ascii=False), inv
    check('form link: one link per profile, prefill follows the profile', one_link_per_profile)
    def apply_changed_only():
        seed = dict(SEED)
        k, w = W('b2', bride='Mai', groom='Tú', times={'tRuoc': '11:00'})
        seed[k] = w
        seed['invites/BASEtokenBASEtokenBASEtoken12345'] = {'org': 'mthanglee', 'weddingId': 'b2', 'kind': 'Cưới', 'status': 'submitted', 'seen': False, 'submittedAt': 5,
            'answers': {'bride': 'Mai', 'groom': 'Tú', 'tRuoc': '10:00', 'addrRest': 'Sảnh B', 'tMakeup': ''}, 'base': {'bride': 'Mai', 'groom': 'Tú', 'tRuoc': '10:00'}}
        g = b.new_page(viewport={'width': 390, 'height': 844})
        g.add_init_script(f"window.__SEED={json.dumps(seed)}; window.__USER={{email:'admin@test.vn'}}; localStorage.setItem('sotay2-tab','upcoming')")
        g.goto(BASE)
        g.locator('.banner').click()
        row = g.locator('.sheet .card, .sheet .item').filter(has_text='Mai')
        row.get_by_role('button', name='Đưa vào hồ sơ').click(); g.wait_for_timeout(400)
        wd = g.evaluate("() => window.__store.get('orgs/mthanglee/weddings/b2')")
        assert wd['times'].get('tRuoc') == '11:00' and wd.get('addrRest') == 'Sảnh B', wd
    check('form link: applying takes only what the client added or changed', apply_changed_only)
    def form_variants(extra):
        seed = dict(SEED); seed['invites/PREFtokenPREFtokenPREFtoken12345'] = {'org': 'mthanglee', 'weddingId': 'long', 'kind': 'Cưới', 'seen': True, **extra}
        g = b.new_page(viewport={'width': 390, 'height': 844})
        g.add_init_script(f"window.__SEED={json.dumps(seed)}")
        g.goto(BASE + 'form.html#PREFtokenPREFtokenPREFtoken12345')
        return g
    def form_prefilled():
        g = form_variants({'status': 'applied', 'answers': {'note': 'Mang hoa'}, 'prefill': {'kind': 'Cưới', 'bride': 'Ngân', 'addrRest': 'Sảnh A', 'tRuoc': '09:30'}})
        g.get_by_role('button', name='Sửa hoặc bổ sung thông tin').click()
        expect(g.get_by_label('Tên cô dâu *')).to_have_value('Ngân')
        expect(g.get_by_label('Địa chỉ nhà hàng')).to_have_value('Sảnh A')
        expect(g.get_by_label('Giờ rước dâu')).to_have_value('09:30')
        expect(g.locator('textarea').first).to_have_value('Mang hoa')
    check('form opens prefilled with the profile and the client\'s last note', form_prefilled)
    def form_pending():
        g = form_variants({'status': 'submitted', 'submittedAt': 5, 'answers': {'bride': 'Ngân Hà'}, 'prefill': {'kind': 'Cưới', 'bride': 'Ngân'}})
        g.get_by_role('button', name='Sửa hoặc bổ sung thông tin').click()
        expect(g.get_by_label('Tên cô dâu *')).to_have_value('Ngân Hà')
    check('form keeps the client\'s pending answers over the prefill', form_pending)
    def form_sends_base():
        pre = {'kind': 'Cưới', 'bride': 'Ngân', 'groom': 'Huy', 'date': '2027-01-10'}
        g = form_variants({'status': 'open', 'answers': {}, 'prefill': pre})
        expect(g.get_by_label('Tên cô dâu *')).to_have_value('Ngân')
        g.get_by_label('Số điện thoại chú rể *').fill('0905123456')
        g.get_by_label('Địa chỉ nhà trai *').fill('12 Lê Lợi')
        g.get_by_role('button', name='Gửi cho mình').click()
        expect(g.get_by_role('heading', name='Đã gửi, cảm ơn hai bạn!')).to_be_visible()
        inv = g.evaluate("() => window.__store.get('invites/PREFtokenPREFtokenPREFtoken12345')")
        assert inv.get('base') == pre, inv.get('base')
        assert inv['answers'].get('phoneGroom') == '0905123456' and inv['answers'].get('bride') == 'Ngân', inv['answers']
    check('form sends the prefill the client saw as base', form_sends_base)
    def reopen_pending_keeps_owner_edit():
        g = form_variants({'status': 'submitted', 'submittedAt': 5, 'answers': {'bride': 'Lan', 'groom': 'Huy', 'note': 'Mang hoa'}, 'base': {'kind': 'Cưới', 'bride': 'Lan'},
                           'prefill': {'kind': 'Cưới', 'bride': 'Lan Anh'}})
        g.get_by_role('button', name='Sửa hoặc bổ sung thông tin').click()
        expect(g.get_by_label('Tên cô dâu *')).to_have_value('Lan Anh')   # owner's newer edit
        expect(g.get_by_label('Tên chú rể *')).to_have_value('Huy')       # client's own pending change
        expect(g.locator('textarea').first).to_have_value('Mang hoa')
        g.get_by_label('Số điện thoại chú rể *').fill('0905'); g.get_by_label('Ngày tổ chức *').fill('2027-01-10'); g.get_by_label('Địa chỉ nhà trai *').fill('12 Lê Lợi')
        g.get_by_role('button', name='Gửi cho mình').click()
        expect(g.get_by_role('heading', name='Đã gửi, cảm ơn hai bạn!')).to_be_visible()
        inv = g.evaluate("() => window.__store.get('invites/PREFtokenPREFtokenPREFtoken12345')")
        assert inv['base'].get('note') == 'Mang hoa', inv['base']   # unchanged note is not "new"
        assert inv['answers']['bride'] == 'Lan Anh', inv['answers']
    check('form: reopening a pending answer shows the owner\'s newer edits', reopen_pending_keeps_owner_edit)
    def new_profile_link_and_apply():
        seed = dict(SEED)
        k, w = W('np', bride='Thu', groom='Bình')
        seed[k] = w
        seed['invites/NEWPtokenNEWPtokenNEWPtoken12345'] = {'org': 'mthanglee', 'weddingId': 'np', 'kind': 'Cưới', 'status': 'submitted', 'seen': False, 'submittedAt': 5,
            'prefill': {'kind': 'Cưới'}, 'base': {'kind': 'Cưới'}, 'answers': {'bride': 'Thu', 'groom': 'Bình', 'addrRest': 'Sảnh C'}}
        g = b.new_page(viewport={'width': 390, 'height': 844})
        g.add_init_script(f"window.__SEED={json.dumps(seed)}; window.__USER={{email:'admin@test.vn'}}; localStorage.setItem('sotay2-tab','upcoming')")
        g.goto(BASE)
        g.locator('.banner').click()
        g.locator('.sheet .card, .sheet .item').filter(has_text='Thu').get_by_role('button', name='Đưa vào hồ sơ').click(); g.wait_for_timeout(400)
        inv = g.evaluate("() => window.__store.get('invites/NEWPtokenNEWPtokenNEWPtoken12345')")
        assert inv['prefill'].get('addrRest') == 'Sảnh C' and inv['prefill'].get('bride') == 'Thu', inv['prefill']
        assert g.evaluate("() => window.__store.get('orgs/mthanglee/weddings/np').formToken") == 'NEWPtokenNEWPtokenNEWPtoken12345'
        g.locator('.sheet').last.press('Escape'); g.wait_for_timeout(150)
        g.locator('.fab').click(); g.get_by_role('button', name='Gửi phiếu cho khách').click()
        g.get_by_role('button', name='Tạo link và chép tin nhắn').click()
        tok = re.search(r'form\.html#(\w+)', g.locator('.sheet').last.locator('textarea').input_value()).group(1)
        wid = g.evaluate(f"() => window.__store.get('invites/{tok}').weddingId")
        assert g.evaluate(f"() => window.__store.get('orgs/mthanglee/weddings/{wid}').formToken") == tok
    check('form link: links for new profiles are remembered and applying refreshes the prefill', new_profile_link_and_apply)
    def link_uses_saved_profile():
        g = page('admin@test.vn')
        g.get_by_text('Nguyễn Thị Thanh Hương', exact=False).first.click()
        g.get_by_label('Tên cô dâu *').fill('CHUA LUU')
        g.get_by_role('button', name='Gửi phiếu cho khách điền').click()
        g.get_by_role('button', name='Chép link và tin nhắn').click()
        tok = re.search(r'form\.html#(\w+)', g.locator('.sheet').last.locator('textarea').input_value()).group(1)
        assert g.evaluate(f"() => window.__store.get('invites/{tok}').prefill.bride") == 'Nguyễn Thị Thanh Hương'
    check('form link: prefill comes from the saved profile, not unsaved edits', link_uses_saved_profile)
    def consult_page(user):
        seed = dict(SEED); k, w = W('cc', bride='Tường Vi', groom='Quốc Huy', date=d(7)); seed[k] = w
        k, w = W('cc2', bride='Kim Anh', groom='Alex', date=d(8)); seed[k] = w
        g = b.new_page(viewport={'width': 390, 'height': 844}, has_touch=True)
        g.clock.install(time=datetime.datetime(2026, 11, 17, 10, 0, tzinfo=datetime.timezone(datetime.timedelta(hours=7))))
        g.add_init_script(f"window.__SEED={json.dumps(seed)}; window.__USER={{email:'{user}'}}; localStorage.setItem('sotay2-tab','upcoming')")
        g.goto(BASE)
        return g
    def consult_toggle():
        g = consult_page('admin@test.vn')
        btn = g.get_by_role('button', name='Đánh dấu đã tư vấn cho Tường Vi & Quốc Huy')
        expect(btn).to_contain_text('Chưa tư vấn')
        btn.click(); g.wait_for_timeout(200)
        assert g.evaluate("() => window.__store.get('orgs/mthanglee/weddings/cc').consultDone") is True
        expect(g.locator('.sheet')).to_have_count(0)
        expect(g.get_by_role('button', name='Bỏ đánh dấu đã tư vấn cho Tường Vi & Quốc Huy')).to_contain_text('Đã tư vấn')
        g.get_by_role('button', name='Hoàn tác').click(); g.wait_for_timeout(200)
        assert g.evaluate("() => window.__store.get('orgs/mthanglee/weddings/cc').consultDone") is False
        expect(g.get_by_role('button', name='Đánh dấu đã tư vấn cho Tường Vi & Quốc Huy')).to_be_visible()
        g.get_by_text('Tường Vi', exact=False).first.click()
        expect(g.locator('.sheet')).to_be_visible()   # the name still opens the profile
    check('consult button toggles in place, with undo', consult_toggle)
    def consult_rules():
        g = consult_page('admin@test.vn')
        expect(g.get_by_role('button', name='Đánh dấu đã tư vấn cho Tường Vi & Quốc Huy')).to_be_visible()
        expect(g.get_by_role('button', name=re.compile('tư vấn cho Ngọc Ánh'))).to_have_count(0)   # today
        sz = g.get_by_role('button', name='Đánh dấu đã tư vấn cho Tường Vi & Quốc Huy').bounding_box()
        assert sz['height'] >= 44 and sz['width'] >= 44, sz
        v = consult_page('xem@test.vn')
        expect(v.locator('.item.wrow').filter(has_text='Tường Vi')).to_contain_text('Chưa tư vấn')
        expect(v.get_by_role('button', name=re.compile('tư vấn cho'))).to_have_count(0)
    check('consult button: none today/past, viewer sees text only, 44px', consult_rules)
    def consult_filter_double():
        g = consult_page('admin@test.vn')
        g.get_by_role('button', name='Cần hẹn tư vấn').click(); g.wait_for_timeout(150)
        g.get_by_role('button', name='Đánh dấu đã tư vấn cho Tường Vi & Quốc Huy').dblclick(); g.wait_for_timeout(300)
        done = g.evaluate("() => [window.__store.get('orgs/mthanglee/weddings/cc').consultDone, window.__store.get('orgs/mthanglee/weddings/cc2').consultDone]")
        assert done[1] is False, done   # the second tap must not land on the next couple
    check('consult button: a double tap in the filter never marks the next couple', consult_filter_double)
    def consult_narrow():
        g = consult_page('admin@test.vn'); g.set_viewport_size({'width': 320, 'height': 700})
        expect(g.get_by_role('button', name=re.compile('tư vấn cho Tường Vi'))).to_be_visible()
        w = g.locator('.item.wrow').filter(has_text='Tường Vi').locator('.nm').bounding_box()['width']
        assert w >= 100, w
        v = consult_page('xem@test.vn')
        st = v.locator('span.consult').first.evaluate("e => { const c = getComputedStyle(e); return [c.borderTopColor, c.borderTopStyle, c.borderTopWidth] }")
        assert st[1] == 'none' or st[2] == '0px' or st[0] == 'rgba(0, 0, 0, 0)', st
    check('consult button: names keep room at 320px; viewer status is plain text', consult_narrow)
    def hero_layout_a():
        q = themed('vo@test.vn', 'light')
        h = q.locator('.hero'); expect(h).to_be_visible()
        order = h.evaluate("h => ['.kick', '.names', '.bottom'].map(s => h.querySelector(s)?.getBoundingClientRect().top ?? -1)")
        assert order[0] >= 0 and order[0] < order[1] < order[2], order
        assert h.evaluate("h => [...h.querySelectorAll('*')].every(e => parseFloat(getComputedStyle(e).fontSize) < 30)"), 'hero still has a giant number'
        cd = h.locator('.bottom .cd').inner_text()
        assert re.search(r'Hôm nay · còn \d\d:\d\d:\d\d|Còn \d+ ngày|Đang diễn ra hôm nay', cd), cd
        assert h.evaluate("h => getComputedStyle(h.querySelector('.names')).fontFamily").startswith('Archivo')
    check('hero (mẫu A): kind and date, names, then countdown and ekip on one line', hero_layout_a)
    def hero_days_match_list():
        seed = {k: v for k, v in SEED.items() if k != 'orgs/mthanglee/weddings/a'}
        g = b.new_page(viewport={'width': 390, 'height': 844})
        g.clock.install(time=datetime.datetime(2026, 11, 17, 10, 0, tzinfo=datetime.timezone(datetime.timedelta(hours=7))))
        g.add_init_script(f"window.__SEED={json.dumps(seed)}; window.__USER={{email:'vo@test.vn'}}; localStorage.setItem('sotay2-tab','upcoming')")
        g.goto(BASE)
        expect(g.locator('.hero .cd')).to_have_text('Còn 5 ngày')   # same count as the list row (calendar days)
    check('hero countdown counts calendar days like the list', hero_days_match_list)
    def hero_timer_steady():
        seed = dict(SEED); k, w = W('a', bride='Thanh Huyền', groom='Văn Thương', date=d(0), times={'tDepart': '18:00', 'tArrive': '18:30'}); seed[k] = w
        q = b.new_page(viewport={'width': 390, 'height': 844})
        q.clock.install(time=datetime.datetime(2026, 11, 17, 13, 7, 30, tzinfo=datetime.timezone(datetime.timedelta(hours=7))))
        q.add_init_script(f"window.__SEED={json.dumps(seed)}; window.__USER={{email:'vo@test.vn'}}; localStorage.setItem('sotay2-tab','upcoming'); localStorage.setItem('sotay2-theme','dark')")
        q.goto(BASE)
        expect(q.locator('.hero .tnum')).to_be_visible()
        widths, tops = set(), set()
        for _ in range(12):
            widths.add(round(q.locator('.hero .tnum').bounding_box()['width'], 1))
            tops.add(round(q.locator('.hero .crew').bounding_box()['y'], 1) if q.locator('.hero .crew').count() else 0)
            q.clock.run_for(1000); q.wait_for_timeout(30)
        assert len(widths) == 1 and len(tops) == 1, (widths, tops)
    check('hero: the ticking timer never moves the ekip label', hero_timer_steady)
    b.close()

print('\n%d failed' % len(fails) if fails else '\nall passed')
sys.exit(1 if fails else 0)
