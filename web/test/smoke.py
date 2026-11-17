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
        for lab, val in [('Tên cô dâu *', 'Mỹ Linh'), ('Tên chú rể *', 'Đức Anh'), ('Số điện thoại chú rể *', '0905'), ('Ngày tổ chức *', '2027-02-15'), ('Địa chỉ nhà hàng *', 'Sảnh Ruby')]:
            f.get_by_label(lab).fill(val)
        f.get_by_role('button', name='Gửi cho anh').click()
        expect(f.get_by_role('heading', name='Đã gửi, cảm ơn hai em!')).to_be_visible()
        assert not f.errors, f.errors
    check('public Tiệc báo hỷ form submits', form)
    b.close()

print('\n%d failed' % len(fails) if fails else '\nall passed')
sys.exit(1 if fails else 0)
