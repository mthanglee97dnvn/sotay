"""Smoke test against the mock build: python3 test/smoke.py <base-url>  (serve dist-mock under /sotay/)."""
import json, sys, datetime
from playwright.sync_api import sync_playwright, expect

if len(sys.argv) > 1: BASE = sys.argv[1]
else:  # serve dist-mock ourselves
    import threading, functools, http.server, os
    root = os.path.join(os.path.dirname(__file__), '..', 'dist-mock')
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(http.server.SimpleHTTPRequestHandler, directory=root))
    srv.RequestHandlerClass.log_message = lambda *a: None
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    BASE = f'http://127.0.0.1:{srv.server_port}/sotay/'
TODAY = datetime.date(2026, 11, 17)
def d(n): return (TODAY + datetime.timedelta(days=n)).isoformat()
def W(id, **k): return (f'orgs/mthanglee/weddings/{id}', {'kind': 'Cưới', 'bride': 'Lan', 'groom': 'Minh', 'date': d(10), 'hasVideo': True, 'consultDone': False,
    'photo': {'link': '', 'history': []}, 'video': {'link': '', 'history': []}, 'times': {}, 'channel': {'kind': 'fanpage', 'url': ''}, 'coupleKey': '', 'notes': '', **k})
SEED = dict([
    ('orgs/mthanglee', {'admin': 'admin@test.vn', 'roles': {'vo@test.vn': 'editor', 'xem@test.vn': 'viewer'}, 'consultLeadDays': 45}),
    W('a', bride='Ngọc Ánh', groom='Hoàng Phúc', date=d(0), kind='Đính hôn', coupleKey='ngoc anh|hoang phuc'),
    W('late', bride='Bảo Trân', groom='Minh Khoa', date=d(-15), photo={'link': 'https://photos/A', 'history': []}),
    W('late2', bride='Hồng Nhung', groom='Văn Tài', date=d(-14), hasVideo=False, photo={'link': 'https://photos/B', 'history': []}),
    ('invites/WEDtokenWEDtokenWEDtokenWED12345', {'org': 'mthanglee', 'weddingId': 'a', 'kind': 'Cưới', 'status': 'open', 'seen': True, 'answers': {}}),
    ('invites/OPENtokenOPENtokenOPENtoken12345', {'org': 'mthanglee', 'weddingId': 'a', 'kind': 'Tiệc báo hỷ', 'status': 'open', 'seen': True, 'answers': {}}),
])
fails = []
def check(name, fn):
    try: fn(); print('ok  ', name)
    except Exception as e: fails.append(name); print('FAIL', name, '-', str(e).splitlines()[0])

with sync_playwright() as p:
    b = p.chromium.launch()
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
        assert late.evaluate("e => getComputedStyle(e).color") == 'rgb(194, 29, 46)'
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
            pg.get_by_role('menuitem', name=item).click()
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

    def makeup_done():
        g = page(None, path='form.html#WEDtokenWEDtokenWEDtokenWED12345')
        done = g.get_by_label('Giờ cô dâu cần makeup xong')
        expect(done).to_be_disabled()
        g.get_by_label('Giờ nhà trai có mặt tại nhà gái & trình lễ').fill('08:00')
        expect(done).to_have_value('06:30')
        for lab, val in [('Tên cô dâu *', 'Linh'), ('Tên chú rể *', 'Thắng'), ('Số điện thoại chú rể *', '0766552110'), ('Ngày tổ chức *', '2027-02-15'), ('Địa chỉ nhà trai *', '248/12 Nguyễn Phước Nguyên')]:
            g.get_by_label(lab).fill(val)
        g.get_by_role('button', name='Gửi cho mình').click()
        expect(g.get_by_role('heading', name='Đã gửi, cảm ơn hai bạn!')).to_be_visible()
        ans = g.evaluate("() => window.__store.get('invites/WEDtokenWEDtokenWEDtokenWED12345').answers")
        assert 'tMakeupDone' not in ans and ans.get('tArrive') == '08:00', ans
    check('form shows makeup-done time 1h30 before trình lễ', makeup_done)

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
        expect(a.get_by_role('button', name='Cần hẹn tư vấn')).to_contain_text('2')
    check('admin: calendar bookings become profiles once', cal_sync)
    def cal_readonly():
        a.get_by_text('Bảo Duyên & Xuân Bách').first.click()
        expect(a.get_by_label('Tên cô dâu *')).to_be_disabled()
        expect(a.get_by_text('Sửa trên Framevis / Google Lịch').first).to_be_visible()
        expect(a.get_by_text('Ghi chú trên lịch')).to_be_visible()
        expect(a.get_by_text('Phụ kiện: hoa cầm tay', exact=False)).to_be_visible()
        expect(a.get_by_role('button', name='Đã tư vấn')).to_be_enabled()
    check('admin: synced fields read-only, calendar note shown', cal_readonly)
    calls.clear()
    e2 = admin_page('vo@test.vn')
    e2.wait_for_timeout(1500)
    check('editor: no calendar reads, no sync status', lambda: (expect(e2.get_by_text('Đã đồng bộ')).to_have_count(0), None if not calls else (_ for _ in ()).throw(AssertionError(calls))))
    b.close()

print('\n%d failed' % len(fails) if fails else '\nall passed')
sys.exit(1 if fails else 0)
