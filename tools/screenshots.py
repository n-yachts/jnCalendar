"""
Vytvoří náhledy obrazovek pro nápovědu (help/img/*.png).

Aplikace běží proti napodobenému Googlu (žádný skutečný účet ani kalendář)
s ukázkovými daty a pevným datem 9. 11. 2026, takže obrázky vycházejí pokaždé stejně.

Použití (potřebuje Python 3 a Playwright):
    pip install playwright && playwright install chromium
    python tools/screenshots.py

Po každé změně vzhledu nebo funkcí spusťte znovu a zkontrolujte help.html.
"""
import datetime as dt
import functools
import http.server
import json
import os
import re
import socketserver
import tempfile
import threading
from urllib.parse import parse_qs, unquote, urlparse

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'help', 'img')
PORT = 8080  # stejná adresa jako u start.cmd, ať průvodce ukazuje správný origin
FIXED_NOW = '2026-11-09T10:00:00+01:00'
CLIENT_ID = '123456789012-ukazka0example0abcdefghijkl.apps.googleusercontent.com'

DEMO = [
    dict(type='narozeniny', title='Jana Nováková', date='1986-12-02', remindDays=7, note='Má ráda orchideje'),
    dict(type='narozeniny', title='Děda Karel', date='1950-11-20', remindDays=7),
    dict(type='narozeniny', title='Tomáš Malý', date='2026-03-14', noYear=True, remindDays=7),
    dict(type='svatek', title='Martin Novák', date='2026-11-11', noYear=True, remindDays=1),
    dict(type='svatek', title='Kateřina Malá', date='2026-11-25', noYear=True, remindDays=1),
    dict(type='vyroci', title='Svatba Jany a Petra', date='2016-12-05', remindDays=7),
    dict(type='doklad', title='Řidičský průkaz – Jana', date='2026-12-01', remindDays=28),
    dict(type='doklad', title='Cestovní pas – Jan', date='2027-01-20', remindDays=28),
    dict(type='stk', title='Škoda Octavia 1AB 2345', date='2026-12-15', repeat=dict(freq='yearly', interval=2),
         remindDays=28, lastDone='2024-12-15'),
    dict(type='prohlidka', title='Zubař', date='2026-11-26', repeat=dict(freq='monthly', interval=6), remindDays=14,
         what='preventivní prohlídka'),
    dict(type='prohlidka', title='Praktický lékař', date='2027-01-18', repeat=dict(freq='yearly', interval=2), remindDays=14,
         what='preventivní prohlídka'),
    dict(type='prohlidka', title='Tetanus', date='2031-05-01', repeat=dict(freq='yearly', interval=15), remindDays=28, what='očkování'),
    dict(type='smlouva', title='Povinné ručení – Octavia', date='2027-01-20', repeat=dict(freq='yearly', interval=1),
         remindDays=14, noticeWeeks=6, note='Pojišťovna XY, smlouva 123456'),
    dict(type='smlouva', title='Pojištění plavidla', date='2027-04-01', repeat=dict(freq='yearly', interval=1),
         remindDays=14, noticeWeeks=6),
    dict(type='dane', title='Daň z nemovitých věcí – platba', date='2027-05-31', repeat=dict(freq='yearly', interval=1), remindDays=14),
    dict(type='auto', title='Přezutí na zimní pneu – Octavia', date='2026-11-14', repeat=dict(freq='yearly', interval=1), remindDays=7),
    dict(type='lod', title='Zazimování', date='2026-11-28', repeat=dict(freq='yearly', interval=1), remindDays=14),
    dict(type='lod', title='Servis motoru', date='2027-02-15', repeat=dict(freq='yearly', interval=1), remindDays=14,
         lastDone='2026-02-20'),
    dict(type='lod', title='Spuštění na vodu', date='2027-04-15', repeat=dict(freq='yearly', interval=1), remindDays=14),
    dict(type='dum', title='Kontrola a čištění komína', date='2026-12-03', repeat=dict(freq='yearly', interval=1), remindDays=14),
    dict(type='dum', title='Hasicí přístroj – kontrola', date='2027-01-10', repeat=dict(freq='yearly', interval=1), remindDays=14),
    dict(type='zahrada', title='Zazimování zahradní vody', date='2026-11-15', repeat=dict(freq='yearly', interval=1), remindDays=7),
    dict(type='zvire', title='Očkování proti vzteklině – Rex', date='2027-01-05', repeat=dict(freq='yearly', interval=1), remindDays=7),
    dict(type='zaruka', title='Pračka Bosch', date='2026-11-20', remindDays=28, note='Účtenka v šuplíku v kuchyni'),
    dict(type='zaruka', title='Notebook', date='2026-10-01', remindDays=28),
    dict(type='predplatne', title='Netflix', date='2026-01-12', repeat=dict(freq='monthly', interval=1), remindDays=3, price='329'),
    dict(type='predplatne', title='Spotify Family', date='2025-12-01', repeat=dict(freq='yearly', interval=1), remindDays=7, price='2868'),
    dict(type='udrzba', title='Výměna oleje – lodní motor', date='2027-04-15', repeat=dict(freq='yearly', interval=1), remindDays=14),
]

FAKE_GIS = """window.google={accounts:{oauth2:{
 initTokenClient(c){return {requestAccessToken(o){setTimeout(()=>c.callback({access_token:'tok',expires_in:3600,scope:o.scope}),30)}}},
 hasGrantedAllScopes(){return true}, revoke(t,cb){cb()} }}};"""


class FakeCalendar:
    """Minimální napodobenina Google Calendar API v3 (jen to, co aplikace používá)."""

    def __init__(self):
        self.cals, self.events, self.n = {}, {}, 0

    @staticmethod
    def expand(e, tmin, tmax):
        s = dt.date.fromisoformat(e['start']['date'])
        rr = (e.get('recurrence') or [''])[0]
        if not rr:
            return [s] if tmin <= s < tmax else []
        p = dict(x.split('=') for x in rr[6:].split(';'))
        step = (12 if p['FREQ'] == 'YEARLY' else 1) * int(p.get('INTERVAL', 1))
        out, k = [], 0
        while True:
            mi = s.month - 1 + k * step
            y, m = s.year + mi // 12, mi % 12 + 1
            k += 1
            try:
                d = dt.date(y, m, s.day)
            except ValueError:
                continue
            if d >= tmax:
                return out
            if d >= tmin:
                out.append(d)

    def handle(self, route):
        req = route.request
        u = urlparse(req.url)
        q = {k: v[0] for k, v in parse_qs(u.query).items()}
        path = u.path.replace('/calendar/v3', '')

        def ok(d, status=200):
            route.fulfill(status=status, content_type='application/json', body=json.dumps(d))

        if path == '/users/me/calendarList':
            return ok({'items': [{'id': k, 'summary': v} for k, v in self.cals.items()]})
        if path == '/calendars' and req.method == 'POST':
            cid = 'lhutnik%d@group.calendar.google.com' % len(self.cals)
            self.cals[cid] = json.loads(req.post_data)['summary']
            return ok({'id': cid})
        mc = re.match(r'^/calendars/([^/]+)$', path)
        if mc:
            cid = unquote(mc.group(1))
            if req.method == 'PATCH':
                self.cals[cid] = json.loads(req.post_data)['summary']
            return ok({'id': cid, 'summary': self.cals.get(cid)})
        m = re.match(r'^/calendars/([^/]+)/events(?:/([^/]+))?$', path)
        if not m:
            return ok({'error': {'message': 'unhandled'}}, 400)
        cid, eid = unquote(m.group(1)), m.group(2)
        if req.method == 'GET':
            mine = [e for e in self.events.values() if e['_cal'] == cid]
            if q.get('singleEvents') == 'true':
                tmin = dt.date.fromisoformat(q['timeMin'][:10])
                tmax = dt.date.fromisoformat(q['timeMax'][:10])
                items = []
                for e in mine:
                    for d in self.expand(e, tmin, tmax):
                        inst = dict(e, start={'date': d.isoformat()})
                        inst.pop('recurrence', None)
                        if e.get('recurrence'):
                            inst['recurringEventId'] = e['id']
                            inst['id'] = e['id'] + '_' + d.strftime('%Y%m%d')
                        items.append(inst)
                items.sort(key=lambda x: x['start']['date'])
                return ok({'items': items})
            return ok({'items': mine})
        if req.method == 'POST':
            self.n += 1
            e = json.loads(req.post_data)
            e.update(id='ev%d' % self.n, _cal=cid)
            self.events[e['id']] = e
            return ok(e)
        if req.method == 'PUT':
            e = json.loads(req.post_data)
            e.update(id=eid, _cal=cid)
            self.events[eid] = e
            return ok(e)
        if req.method == 'DELETE':
            self.events.pop(eid, None)
            return route.fulfill(status=204)


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def main():
    os.makedirs(OUT, exist_ok=True)
    socketserver.TCPServer.allow_reuse_address = True
    srv = socketserver.TCPServer(('127.0.0.1', PORT), functools.partial(QuietHandler, directory=ROOT))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = f'http://localhost:{PORT}/'
    api = FakeCalendar()

    demo_file = os.path.join(tempfile.mkdtemp(), 'lhutnik-ukazka.json')
    with open(demo_file, 'w', encoding='utf-8') as f:
        json.dump({'app': 'lhutnik', 'format': 1, 'exported': FIXED_NOW, 'items': DEMO}, f, ensure_ascii=False)

    def shot(page, name, **kw):
        page.mouse.move(2, 2)  # žádné zvýraznění pod kurzorem
        page.wait_for_timeout(150)
        page.screenshot(path=os.path.join(OUT, name + '.png'), **kw)
        print('  ', name)

    with sync_playwright() as p:
        browser = p.chromium.launch()

        def new_page(width=1000, height=760, scheme='light'):
            ctx = browser.new_context(viewport={'width': width, 'height': height}, locale='cs-CZ',
                                      timezone_id='Europe/Prague', color_scheme=scheme, device_scale_factor=1)
            page = ctx.new_page()
            page.clock.set_fixed_time(FIXED_NOW)
            page.route('https://accounts.google.com/gsi/client',
                       lambda r: r.fulfill(content_type='text/javascript', body=FAKE_GIS))
            page.route('https://www.googleapis.com/**', api.handle)
            return page

        # --- Průvodce ---
        pg = new_page()
        pg.goto(base)
        shot(pg, 'pruvodce-uvod')
        pg.click('#setup-next')
        shot(pg, 'pruvodce-projekt')
        pg.click('#setup-next'); pg.click('#setup-next'); pg.click('#setup-next')
        pg.fill('#client-input', CLIENT_ID)
        shot(pg, 'pruvodce-client-id', full_page=True)
        pg.click('#setup-next')
        shot(pg, 'pruvodce-hotovo')
        pg.click('#setup-next')  # přihlášení
        pg.wait_for_selector('#view-main:not([hidden])')

        # --- Import ukázkových dat (použije funkci aplikace) ---
        pg.click('#btn-settings')
        with pg.expect_file_chooser() as fc:
            pg.click('#btn-import')
        fc.value.set_files(demo_file)
        pg.wait_for_selector('#dlg-import[open]')
        shot(pg, 'import')
        pg.click('#btn-import-go')
        pg.wait_for_selector('#dlg-import', state='hidden')
        pg.wait_for_timeout(3200)  # nechat zmizet oznámení

        # --- Přehled ---
        pg.set_viewport_size({'width': 1000, 'height': 1000})
        shot(pg, 'prehled')
        pg.click('[data-afilter=people]')
        shot(pg, 'prehled-lide')
        pg.click('[data-afilter=all]')

        # --- Formuláře ---
        pg.set_viewport_size({'width': 1000, 'height': 900})
        pg.click('.tabs [data-action=add]')
        pg.click('#type-pick [data-type=narozeniny]')
        pg.fill('[name=title]', 'Eva Svobodová')
        pg.fill('[name=date]', '1990-06-18')
        shot(pg, 'formular-narozeniny')
        pg.click('#type-pick [data-type=svatek]')
        pg.fill('[name=title]', 'Eva Svobodová')
        shot(pg, 'formular-svatek')
        pg.click('#type-pick [data-type=prohlidka]')
        pg.fill('[name=title]', '')
        pg.select_option('#preset-select', label='Zubař')
        pg.fill('[name=date]', '2027-05-20')
        shot(pg, 'formular-prohlidky')
        pg.click('#type-pick [data-type=smlouva]')
        pg.select_option('#preset-select', label='Povinné ručení')
        pg.fill('[name=title]', 'Povinné ručení – Fabia')
        pg.fill('[name=date]', '2027-03-01')
        pg.dispatch_event('[name=date]', 'input')
        shot(pg, 'formular-smlouva')
        pg.click('#type-pick [data-type=lod]')
        pg.fill('[name=title]', '')
        pg.select_option('#preset-select', label='Výměna impeleru')
        shot(pg, 'formular-lod')
        pg.keyboard.press('Escape')

        pg.click('.day li:has-text("Škoda")')
        shot(pg, 'hotovo')
        pg.keyboard.press('Escape')

        # --- Položky ---
        pg.set_viewport_size({'width': 1000, 'height': 1000})
        pg.click('[data-tab=items]')
        shot(pg, 'polozky')
        pg.click('[data-tab=agenda]')

        # --- Nastavení ---
        pg.set_viewport_size({'width': 1000, 'height': 760})
        pg.click('#btn-settings')
        shot(pg, 'nastaveni')
        pg.keyboard.press('Escape')

        # --- Přihlášení (po vypršení) ---
        pg.evaluate("sessionStorage.clear()")
        pg.reload()
        pg.wait_for_selector('#view-signin:not([hidden])')
        shot(pg, 'prihlaseni')

        # --- Mobil a tmavý režim ---
        mob = new_page(width=390, height=844)
        mob.goto(base)
        mob.evaluate(f"localStorage.setItem('jn.clientId', '{CLIENT_ID}')")
        mob.reload()
        mob.click('#btn-signin')
        mob.wait_for_selector('#view-main:not([hidden])')
        shot(mob, 'mobil')
        dark = new_page(scheme='dark')
        dark.goto(base)
        dark.evaluate(f"localStorage.setItem('jn.clientId', '{CLIENT_ID}')")
        dark.reload()
        dark.click('#btn-signin')
        dark.wait_for_selector('#view-main:not([hidden])')
        shot(dark, 'tmavy-rezim')

        browser.close()
    srv.shutdown()
    print('Hotovo:', OUT)


if __name__ == '__main__':
    main()
