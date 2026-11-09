import { initAuth, signIn, signOut, getStoredToken, SCOPES } from './auth.js?v=20261109-1510';
import { ensureCalendar, listItems, listOccurrences, saveItem, deleteItem, TYPES, AuthError } from './calendar.js?v=20261109-1510';
import { nextOccurrence, daysBetween, todayStr, addDays, addMonths, repeatMonths, formatCz, relativeCz, yearsAt, parseDate, formatDate } from './dates.js?v=20261109-1510';
import { findNameDay, nameDayOn } from './svatky.js?v=20261109-1510';

// ---------- Stav ----------
const LS = { client: 'jn.clientId', cal: 'jn.calendarId', step: 'jn.setupStep', range: 'jn.agendaRange', tab: 'jn.tab' };
const store = {
  get: k => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  del: k => { try { localStorage.removeItem(k); } catch {} },
};
const state = {
  items: [], filter: 'all', search: '', calendarId: store.get(LS.cal), editing: null,
  occ: [], agendaFilter: 'all', range: Number(store.get(LS.range)) || 90, tab: store.get(LS.tab) || 'agenda',
};

const $ = sel => document.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- Pohledy ----------
const VIEWS = ['file', 'setup', 'signin', 'main'];
function show(view) {
  for (const v of VIEWS) $(`#view-${v}`).hidden = v !== view;
  $('#btn-refresh').hidden = view !== 'main';
  $('#btn-settings').hidden = view === 'setup' || view === 'file';
}
function busy(on) { $('#loading').hidden = !on; }

let toastTimer;
function toast(msg, kind = '') {
  // Popover leží v horní vrstvě, takže je vidět i nad otevřeným dialogem.
  const t = $('#toast');
  t.textContent = msg; t.className = `toast ${kind}`;
  try { t.hidePopover(); t.showPopover(); } catch { t.hidden = false; }
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { try { t.hidePopover(); } catch { t.hidden = true; } }, kind === 'error' ? 7000 : 3000);
}

// ---------- Průvodce prvním spuštěním ----------
const CONSOLE = 'https://console.cloud.google.com';
const PUBLIC_URL = 'https://n-yachts.github.io/jnCalendar/';
const SETUP = [
  {
    title: 'Vítejte',
    html: () => `
      <h1>Vítejte v jnCalendar</h1>
      <a class="help-card" href="help.html" target="_blank" rel="noopener">
        <span class="hc-icon">📖</span>
        <span><b>Podrobná nápověda s obrázky</b><br>
        <span class="muted">Jak aplikaci nastavit a používat, krok za krokem. Otevře se v nové záložce.</span></span>
      </a>
      <p>Aplikace hlídá důležitá data a ukládá je do samostatného Google kalendáře
         <b>jnCalendar</b> včetně připomínek:</p>
      <ul class="features">
        <li>🎂 <b>Narozeniny</b> a 💍 <b>výročí</b>: kolikáté jsou a připomínka předem</li>
        <li>💐 <b>Svátky</b>: stačí napsat jméno, datum se doplní podle českého kalendáře</li>
        <li>🪪 <b>Doklady</b> a 🚗 <b>technické kontroly</b>: kdy končí platnost pasu, řidičáku či STK</li>
        <li>🩺 <b>Lékařské prohlídky</b>: praktik, zubař, gynekolog… s obvyklými intervaly</li>
        <li>🛡️ <b>Záruky</b>, 🔁 <b>předplatná</b> a 🔧 <b>údržba</b>: konce záruk, platby, servisní termíny</li>
        <li>📋 <b>Přehled</b>: všechno nadcházející seřazené podle data na jednom místě</li>
      </ul>
      <p>Data zůstávají jen ve vašem Google účtu. Aplikace běží na webu
         <a href="${PUBLIC_URL}" target="_blank" rel="noopener">${PUBLIC_URL.replace('https://', '')}</a>
         i lokálně na počítači (<code>start.cmd</code>).</p>
      <p>Než začneme, je potřeba jednou (asi 10 minut) připravit přístup v <b>Google Cloud</b>.
         Je to zdarma a nepotřebujete platební kartu. Průvodce vás provede krok za krokem.</p>
      <p><button type="button" class="ghost small" data-goto="4">Už mám Client ID, přeskočit nastavení →</button></p>
      <p class="hint">Tip: odkazy se otevírají v nové záložce. Pokud máte víc Google účtů,
         zkontrolujte vpravo nahoře v konzoli, že jste ve správném.</p>`,
  },
  {
    title: 'Projekt',
    html: () => `
      <h2>1. Založte projekt</h2>
      <ol>
        <li>Otevřete <a href="${CONSOLE}/projectcreate" target="_blank" rel="noopener">vytvoření projektu</a>.</li>
        <li>Název třeba <code>jnCalendar</code>, organizaci ponechte „Bez organizace“ a klikněte na <b>Vytvořit</b>.</li>
        <li>Počkejte, až se projekt vytvoří, a nahoře ho vyberte.</li>
      </ol>`,
  },
  {
    title: 'API',
    html: () => `
      <h2>2. Zapněte Google Calendar API</h2>
      <ol>
        <li>Otevřete <a href="${CONSOLE}/apis/library/calendar-json.googleapis.com" target="_blank" rel="noopener">Google Calendar API</a> (se zvoleným projektem).</li>
        <li>Klikněte na <b>Povolit</b> (Enable).</li>
      </ol>`,
  },
  {
    title: 'Souhlas',
    html: () => `
      <h2>3. Nastavte souhlasovou obrazovku</h2>
      <ol>
        <li>Otevřete <a href="${CONSOLE}/auth/overview" target="_blank" rel="noopener">Google Auth Platform</a> a klikněte na <b>Začít</b> (Get started).</li>
        <li><b>Název aplikace:</b> <code>jnCalendar</code>, <b>e-mail podpory:</b> váš e-mail.</li>
        <li><b>Cílová skupina (Audience):</b> zvolte <b>Externí</b> (External).</li>
        <li>Kontaktní e-mail vyplňte znovu svůj, odsouhlaste podmínky a dokončete.</li>
        <li>V sekci <a href="${CONSOLE}/auth/audience" target="_blank" rel="noopener">Audience</a> klikněte na
            <b>Publikovat aplikaci</b> (Publish app) a potvrďte.</li>
      </ol>
      <div class="callout">
        <b>Proč publikovat?</b> V režimu „Testing“ Google přihlášení po 7 dnech zruší a museli byste
        znovu odsouhlasit přístup. Publikování nevyžaduje ověření od Googlu; jen se při přihlášení
        objeví varování „Google tuto aplikaci neověřil“, které odkliknete.
        <br><br>Pokud chcete zůstat v testovacím režimu, přidejte se tamtéž do <b>Test users</b>.
      </div>
      <details>
        <summary>Volitelně: přidat oprávnění (Data access)</summary>
        <p>V sekci <a href="${CONSOLE}/auth/scopes" target="_blank" rel="noopener">Data access</a> → <b>Add or remove scopes</b>
           můžete vložit tato oprávnění. Aplikace funguje i bez toho, ale souhlasová obrazovka bude přehlednější.</p>
        <pre class="mono">${SCOPES.join('\n')}</pre>
      </details>`,
  },
  {
    title: 'Client ID',
    html: () => `
      <h2>4. Vytvořte Client ID</h2>
      <ol>
        <li>Otevřete <a href="${CONSOLE}/auth/clients/create" target="_blank" rel="noopener">vytvoření klienta</a>.</li>
        <li><b>Typ aplikace:</b> Webová aplikace (Web application), název třeba <code>jnCalendar web</code>.</li>
        <li>Do <b>Autorizované zdroje JavaScriptu</b> (Authorized JavaScript origins) přidejte přesně:
          <div class="copyline"><code id="origin-val">${esc(location.origin)}</code>
            <button type="button" class="ghost small" data-copy="#origin-val">Kopírovat</button></div>
        </li>
        <li>Používáte-li aplikaci na webu i lokálně, přidejte obě adresy:
            <code>https://n-yachts.github.io</code> a <code>http://localhost:8080</code>
            (vždy jen doménu, bez cesty a bez lomítka na konci).</li>
        <li>Pole <b>Autorizované URI přesměrování</b> nechte prázdné a klikněte na <b>Vytvořit</b>.</li>
        <li>Zkopírujte <b>Client ID</b> (končí na <code>.apps.googleusercontent.com</code>) a vložte ho sem:</li>
      </ol>
      <input id="client-input" class="mono" placeholder="123456789-abc….apps.googleusercontent.com"
             value="${esc(store.get(LS.client) || '')}" spellcheck="false" autocomplete="off">
      <p id="client-err" class="error" hidden></p>
      <p class="hint">Client ID není tajný, client secret aplikace nepotřebuje. Nové nastavení se někdy projeví až za pár minut.
         Pokud už Client ID máte (třeba z jiného počítače nebo z lokální verze), stačí ho sem vložit a předchozí kroky přeskočit.</p>`,
    validate: () => {
      const v = $('#client-input').value.trim();
      const ok = /^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/i.test(v);
      $('#client-err').hidden = ok;
      $('#client-err').textContent = ok ? '' : 'Tohle nevypadá jako Client ID. Mělo by mít tvar 123456789-xxxx.apps.googleusercontent.com.';
      if (ok) store.set(LS.client, v);
      return ok;
    },
  },
  {
    title: 'Hotovo',
    html: () => `
      <h2>5. Přihlaste se</h2>
      <p>Hotovo. Teď se přihlaste svým Google účtem. Při prvním přihlášení:</p>
      <ol>
        <li>Pokud se objeví „Google tuto aplikaci neověřil“, klikněte na <b>Pokračovat</b>
            (případně nejdřív na <b>Rozšířené</b> a pak <b>Přejít na jnCalendar</b>).</li>
        <li>Zaškrtněte obě oprávnění ke kalendáři.</li>
      </ol>
      <p>Aplikace pak založí kalendář <b>jnCalendar</b> a můžete přidávat položky.</p>`,
    nextLabel: 'Přihlásit se přes Google',
  },
];

let setupIdx = 0;
function renderSetup() {
  const step = SETUP[setupIdx];
  $('#setup-steps').innerHTML = SETUP.map((s, i) =>
    `<span class="step ${i < setupIdx ? 'done' : ''} ${i === setupIdx ? 'current' : ''}">${i < setupIdx ? '✓' : i + 1}<em>${s.title}</em></span>`
  ).join('');
  $('#setup-body').innerHTML = step.html();
  $('#setup-back').style.visibility = setupIdx === 0 ? 'hidden' : 'visible';
  $('#setup-next').textContent = step.nextLabel || 'Pokračovat →';
  store.set(LS.step, String(setupIdx));
  $('#client-input')?.focus();
}

$('#setup-body').addEventListener('click', e => {
  const b = e.target.closest('[data-goto]');
  if (b) { setupIdx = Number(b.dataset.goto); renderSetup(); }
});
$('#setup-back').onclick = () => { if (setupIdx > 0) { setupIdx--; renderSetup(); } };
$('#setup-next').onclick = async () => {
  const step = SETUP[setupIdx];
  if (step.validate && !step.validate()) return;
  if (setupIdx < SETUP.length - 1) { setupIdx++; renderSetup(); return; }
  await doSignIn(); // poslední krok – rovnou přihlásit (je to kliknutí uživatele)
};
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id === 'client-input') $('#setup-next').click();
});
document.addEventListener('click', async e => {
  const btn = e.target.closest('[data-copy]');
  if (!btn) return;
  const text = $(btn.dataset.copy).textContent;
  try { await navigator.clipboard.writeText(text); toast('Zkopírováno'); } catch { toast(text); }
});

// ---------- Přihlášení a načtení ----------
async function doSignIn() {
  try {
    await initAuth(store.get(LS.client));
    busy(true);
    await signIn();
    store.del(LS.step);
    await loadAll();
  } catch (e) {
    busy(false);
    toast(e.message, 'error');
    if (!$('#view-setup').hidden) return; // zůstat v průvodci
    show('signin');
  }
}
$('#btn-signin').onclick = doSignIn;

async function loadAll() {
  busy(true);
  try {
    const id = await ensureCalendar(state.calendarId);
    if (id !== state.calendarId) { state.calendarId = id; store.set(LS.cal, id); }
    const today = todayStr();
    [state.items, state.occ] = await Promise.all([
      listItems(id),
      listOccurrences(id, today, addDays(today, state.range)),
    ]);
    show('main');
    renderAll();
  } catch (e) {
    handleError(e);
  } finally {
    busy(false);
  }
}
$('#btn-refresh').onclick = async () => {
  try { await ensureAuth(); } catch (e) { return toast(e.message, 'error'); }
  loadAll();
};

// Před akcí z kliknutí: když token vypršel, obnovíme ho hned (v rámci kliknutí,
// jinak by prohlížeč zablokoval přihlašovací okno). Rozepsaný formulář se tak neztratí.
async function ensureAuth() {
  if (!getStoredToken()) await signIn();
}

function handleError(e) {
  if (e instanceof AuthError) document.querySelectorAll('dialog[open]').forEach(d => d.close());
  if (e instanceof AuthError) { show('signin'); toast('Přihlášení vypršelo, přihlaste se prosím znovu.'); return; }
  console.error(e);
  toast(e.message || String(e), 'error');
}

// ---------- Přehled ----------
function enrich(it) {
  const today = todayStr();
  const next = nextOccurrence(it.date, it.repeat, today);
  return { ...it, next, days: daysBetween(today, next) };
}

function monthlyCost(it) {
  const p = parseFloat(it.price);
  if (!p || it.repeat.freq === 'none') return 0;
  const months = (it.repeat.freq === 'yearly' ? 12 : 1) * (it.repeat.interval || 1);
  return p / months;
}

function renderMain() {
  const all = state.items.map(enrich);

  // Souhrn
  const soon = all.filter(i => i.days >= 0 && i.days <= 30).length;
  const expired = all.filter(i => i.days < 0).length;
  const costs = {};
  for (const i of all) {
    const c = monthlyCost(i);
    if (c) costs[i.currency || 'Kč'] = (costs[i.currency || 'Kč'] || 0) + c;
  }
  const costStr = Object.entries(costs).map(([cur, v]) => `${v.toLocaleString('cs-CZ', { maximumFractionDigits: 0 })} ${cur}`).join(' + ') || '—';
  $('#stats').innerHTML = `
    <div class="stat"><b>${all.length}</b><span>položek</span></div>
    <div class="stat ${soon ? 'warn' : ''}"><b>${soon}</b><span>do 30 dní</span></div>
    <div class="stat ${expired ? 'bad' : ''}"><b>${expired}</b><span>prošlé</span></div>
    <div class="stat"><b>${costStr}</b><span>předplatná / měsíc</span></div>`;

  // Filtry
  const counts = { all: all.length };
  for (const i of all) counts[i.type] = (counts[i.type] || 0) + 1;
  $('#filters').innerHTML = [['all', 'Vše', ''], ...Object.entries(TYPES).map(([k, t]) => [k, t.short || t.label, t.icon])]
    .map(([k, label, icon]) => `<button class="chip ${state.filter === k ? 'on' : ''}" data-filter="${k}">${icon} ${label} <small>${counts[k] || 0}</small></button>`)
    .join('');

  // Seznam
  const q = state.search.trim().toLowerCase();
  const shown = all
    .filter(i => state.filter === 'all' || i.type === state.filter)
    .filter(i => !q || `${i.title} ${i.note}`.toLowerCase().includes(q))
    .sort((a, b) => (a.days < 0) - (b.days < 0) || (a.days < 0 ? b.days - a.days : a.days - b.days));

  if (!all.length) {
    $('#list').innerHTML = `<div class="empty"><p>Zatím tu nic není.</p><p class="muted">Přidejte narozeniny, svátek, výročí, doklad, STK, prohlídku, záruku, předplatné nebo úkon údržby.</p>
      <button class="primary" data-action="add">+ Přidat první položku</button></div>`;
    return;
  }
  if (!shown.length) { $('#list').innerHTML = `<div class="empty muted">Nic neodpovídá filtru.</div>`; return; }

  $('#list').innerHTML = shown.map(i => {
    const t = TYPES[i.type] || TYPES.jine;
    const cls = i.days < 0 ? 'bad' : i.days <= 7 ? 'warn' : i.days <= 30 ? 'soon' : '';
    const rep = t.yearly || i.repeat.freq === 'none' ? '' :
      i.repeat.freq === 'monthly' ? (i.repeat.interval > 1 ? `každé ${i.repeat.interval} měs.` : 'měsíčně')
      : (i.repeat.interval > 4 ? `každých ${i.repeat.interval} let` : i.repeat.interval > 1 ? `každé ${i.repeat.interval} roky` : 'ročně');
    const price = i.price ? `${Number(i.price).toLocaleString('cs-CZ')} ${esc(i.currency)}` : '';
    const label = i.type === 'zaruka' ? (i.days < 0 ? 'záruka skončila' : 'záruka končí')
      : i.type === 'doklad' ? (i.days < 0 ? 'platnost skončila' : 'platnost končí')
      : i.type === 'stk' ? (i.days < 0 ? 'STK propadla' : 'STK do')
      : TYPES[i.type]?.yearly ? occasion(i, i.next) : '';
    return `
      <article class="item t-${i.type}" data-id="${esc(i.id)}" tabindex="0">
        <div class="icon">${t.icon}</div>
        <div class="body">
          <div class="name">${esc(i.title)}</div>
          <div class="meta">${t.label}${rep ? ` · ${rep}` : ''}${i.lastDone ? ` · naposledy ${formatCz(i.lastDone)}` : ''}${price ? ` · ${price}` : ''}${i.note ? ` · <span class="note">${esc(i.note)}</span>` : ''}</div>
        </div>
        <div class="when ${cls}">
          <b>${relativeCz(i.days)}</b>
          <span>${label ? label + ' ' : ''}${formatCz(i.next)}</span>
        </div>
      </article>`;
  }).join('');
}

$('#filters').onclick = e => {
  const b = e.target.closest('[data-filter]');
  if (b) { state.filter = b.dataset.filter; renderMain(); }
};
$('#search').oninput = e => { state.search = e.target.value; renderMain(); };
$('#list').onclick = e => {
  const a = e.target.closest('.item');
  if (a) openItem(state.items.find(i => i.id === a.dataset.id));
};
$('#list').onkeydown = e => {
  if (e.key === 'Enter' && e.target.classList.contains('item')) e.target.click();
};
document.addEventListener('click', e => {
  if (e.target.closest('[data-action="add"]')) openItem(null);
});

// Když rok neznáme, uložíme datum do letošního roku (29. 2. do nejbližšího přestupného).
function yearlessDate(date) {
  const { m, d } = parseDate(date);
  let y = parseDate(todayStr()).y;
  if (m === 2 && d === 29) while (!(y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0))) y++;
  return formatDate({ y, m, d });
}

// Popis příležitosti: "40. narozeniny", "15. výročí", "svátek"…
function occasion(item, onDate) {
  const n = item.noYear ? 0 : yearsAt(item.date, onDate);
  switch (item.type) {
    case 'narozeniny': return n > 0 ? `${n}. narozeniny` : 'narozeniny';
    case 'vyroci':     return n > 0 ? `${n}. výročí` : 'výročí';
    case 'svatek':     return 'svátek';
    case 'zaruka':     return 'konec záruky';
    case 'doklad':     return 'konec platnosti';
    case 'stk':        return 'termín technické kontroly';
    case 'predplatne': return item.price ? `platba ${Number(item.price).toLocaleString('cs-CZ')} ${item.currency || 'Kč'}` : 'platba';
    case 'udrzba':     return 'údržba';
    case 'prohlidka':  return 'preventivní prohlídka';
    default:           return '';
  }
}

// ---------- Přehled (agenda) ----------
const RANGES = [[30, 'Měsíc'], [90, '3 měsíce'], [365, 'Rok']];
const AGENDA_FILTERS = [
  ['all', 'Vše', ''],
  ['people', 'Lidé', '👥'],
  ...Object.entries(TYPES).map(([k, t]) => [k, t.short || t.label, t.icon]),
];
const PEOPLE = ['narozeniny', 'svatek', 'vyroci'];
const MONTHS = ['leden', 'únor', 'březen', 'duben', 'květen', 'červen', 'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec'];
const WEEKDAYS = ['ne', 'po', 'út', 'st', 'čt', 'pá', 'so'];

async function refreshAgenda() {
  const today = todayStr();
  state.occ = await listOccurrences(state.calendarId, today, addDays(today, state.range));
}

function renderAll() {
  for (const b of document.querySelectorAll('.tab')) b.classList.toggle('on', b.dataset.tab === state.tab);
  $('#pane-agenda').hidden = state.tab !== 'agenda';
  $('#pane-items').hidden = state.tab !== 'items';
  renderAgenda();
  renderMain();
}

function renderAgenda() {
  const today = todayStr();
  const tomorrow = addDays(today, 1);
  const nd = [['Dnes', nameDayOn(today)], ['zítra', nameDayOn(tomorrow)]].filter(([, n]) => n);
  $('#nameday').innerHTML = nd.length ? '💐 ' + nd.map(([w, n]) => `${w} má svátek <b>${esc(n)}</b>`).join(' · ') : '';

  const byId = new Map(state.items.map(i => [i.id, i]));
  const rows = state.occ.map(o => ({ ...o, item: byId.get(o.masterId) }));
  const counts = { all: rows.length, people: 0 };
  for (const r of rows) {
    const t = r.item?.type || 'jine';
    counts[t] = (counts[t] || 0) + 1;
    if (PEOPLE.includes(t)) counts.people++;
  }
  $('#agenda-types').innerHTML = AGENDA_FILTERS
    .filter(([k]) => k === 'all' || k === state.agendaFilter || counts[k])
    .map(([k, label, icon]) => `<button class="chip ${state.agendaFilter === k ? 'on' : ''}" data-afilter="${k}">${icon} ${label} <small>${counts[k] || 0}</small></button>`)
    .join('');
  $('#agenda-range').innerHTML = RANGES
    .map(([d, label]) => `<button class="${state.range === d ? 'on' : ''}" data-range="${d}">${label}</button>`).join('');

  const f = state.agendaFilter;
  const shown = rows.filter(r => {
    const t = r.item?.type || 'jine';
    return f === 'all' || (f === 'people' ? PEOPLE.includes(t) : t === f);
  });

  if (!shown.length) {
    const what = state.items.length ? 'V tomto období nic není.' : 'Zatím tu nic není. Přidejte narozeniny, svátky, doklady, STK…';
    $('#agenda').innerHTML = `<div class="empty"><p>${what}</p>
      ${state.items.length ? '' : '<button class="primary" data-action="add">+ Přidat první položku</button>'}</div>`;
    return;
  }

  // Seskupit po dnech (prázdné dny se tak vůbec neobjeví), dny po měsících.
  const days = new Map();
  for (const r of shown) {
    if (!days.has(r.date)) days.set(r.date, []);
    days.get(r.date).push(r);
  }
  let html = '';
  let lastMonth = '';
  for (const [date, list] of [...days.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const { y, m, d } = parseDate(date);
    const monthKey = `${y}-${m}`;
    if (monthKey !== lastMonth) {
      html += `<h3 class="month">${MONTHS[m - 1]} ${y !== parseDate(today).y ? y : ''}</h3>`;
      lastMonth = monthKey;
    }
    const wd = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
    const diff = daysBetween(today, date);
    const rel = diff <= 1 ? relativeCz(diff) : diff < 14 ? relativeCz(diff) : '';
    html += `
      <div class="day ${diff === 0 ? 'today' : ''} ${wd === 'so' || wd === 'ne' ? 'weekend' : ''}">
        <div class="date"><b>${d}. ${m}.</b><span>${wd}${rel ? ` · ${rel}` : ''}</span></div>
        <ul>${list.map(r => {
          const it = r.item;
          const t = TYPES[it?.type] || TYPES.jine;
          const title = it ? it.title : r.summary;
          const what = it ? occasion(it, date) : '';
          return `<li class="t-${it?.type || 'jine'}" ${it ? `data-id="${esc(it.id)}"` : ''} tabindex="0">
            <span class="ic">${t.icon}</span><span class="tt">${esc(title)}</span>${what ? `<span class="what">${esc(what)}</span>` : ''}</li>`;
        }).join('')}</ul>
      </div>`;
  }
  $('#agenda').innerHTML = html;
}

document.querySelector('.tabs').addEventListener('click', e => {
  const b = e.target.closest('[data-tab]');
  if (!b) return;
  state.tab = b.dataset.tab; store.set(LS.tab, state.tab);
  renderAll();
});
$('#agenda-types').onclick = e => {
  const b = e.target.closest('[data-afilter]');
  if (b) { state.agendaFilter = b.dataset.afilter; renderAgenda(); }
};
$('#agenda-range').onclick = async e => {
  const b = e.target.closest('[data-range]');
  if (!b || Number(b.dataset.range) === state.range) return;
  try { await ensureAuth(); } catch (err) { return toast(err.message, 'error'); }
  state.range = Number(b.dataset.range); store.set(LS.range, String(state.range));
  busy(true);
  try { await refreshAgenda(); renderAgenda(); } catch (err) { handleError(err); } finally { busy(false); }
};
$('#agenda').onclick = e => {
  const li = e.target.closest('li[data-id]');
  if (li) openItem(state.items.find(i => i.id === li.dataset.id));
};
$('#agenda').onkeydown = e => { if (e.key === 'Enter' && e.target.matches('li')) e.target.click(); };

// ---------- Formulář ----------
const DEFAULTS = {
  zaruka:     { freq: 'none',    remindDays: 28, dateLabel: 'Konec záruky' },
  doklad:     { freq: 'none',    remindDays: 28, dateLabel: 'Platnost do', placeholder: 'např. Cestovní pas – Jan, Řidičský průkaz, Průkaz vůdce plavidla', notePlaceholder: 'číslo dokladu, kde se vyřizuje, co s sebou…' },
  stk:        { freq: 'yearly', interval: 2, remindDays: 28, dateLabel: 'Platnost STK do', placeholder: 'např. Škoda Octavia 1AB 2345, přívěs', notePlaceholder: 'STK stanice, číslo protokolu, závady k opravě…' },
  predplatne: { freq: 'monthly', remindDays: 3,  dateLabel: 'Další platba' },
  udrzba:     { freq: 'yearly',  remindDays: 14, dateLabel: 'Termín' },
  prohlidka:  { freq: 'yearly', interval: 2, remindDays: 14, dateLabel: 'Termín další prohlídky',
                placeholder: 'např. Praktický lékař – Jan', notePlaceholder: 'jméno lékaře, telefon, adresa ordinace…' },
  narozeniny: { freq: 'yearly',  remindDays: 7,  dateLabel: 'Datum narození', placeholder: 'např. Jana Nováková' },
  vyroci:     { freq: 'yearly',  remindDays: 7,  dateLabel: 'Datum (první rok)', placeholder: 'např. Svatba Jany a Petra' },
  svatek:     { freq: 'yearly',  remindDays: 1,  dateLabel: 'Den svátku', placeholder: 'jméno, např. Jana Nováková' },
  jine:       { freq: 'none',    remindDays: 7,  dateLabel: 'Datum' },
};

const form = $('#form-item');
let currentType = 'zaruka';

function setType(type, applyDefaults) {
  currentType = type;
  $('#type-pick').innerHTML = Object.entries(TYPES).map(([k, t]) =>
    `<button type="button" class="chip ${k === type ? 'on' : ''}" data-type="${k}">${t.icon} ${t.short || t.label}</button>`).join('');
  const d = DEFAULTS[type];
  const t = TYPES[type];
  $('#date-label').textContent = d.dateLabel;
  form.title.placeholder = d.placeholder || 'např. Pračka Bosch, Netflix, Výměna oleje';
  // Narozeniny, výročí a svátky se opakují každý rok – volba opakování a cena nemají smysl.
  document.querySelectorAll('.repeat-wrap').forEach(el => { el.hidden = !!t.yearly; });
  $('.price-row').hidden = !!t.yearly;
  $('.noyear-wrap').hidden = !t.yearly || !!t.noYear;
  form.note.placeholder = d.notePlaceholder || (t.yearly ? 'co má rád/a, nápady na dárek…' : 'číslo účtenky, kde je uložená, kontakt na servis…');
  renderPresets();
  if (applyDefaults) { form.freq.value = d.freq; form.interval.value = d.interval || 1; form.remindDays.value = d.remindDays; }
  syncInterval();
  updateNameDayHint(applyDefaults);
}

// Rychlá volba běžných preventivních prohlídek (dospělí, hrazeno pojišťovnou dle vyhl. 70/2012 Sb.).
const PRESETS = {
  prohlidka: [
    { title: 'Praktický lékař', freq: 'yearly',  interval: 2, hint: 'každé 2 roky' },
    { title: 'Zubař',           freq: 'monthly', interval: 6, hint: '2× ročně' },
    { title: 'Gynekolog',       freq: 'yearly',  interval: 1, hint: 'každý rok' },
    { title: 'Mamografie',      freq: 'yearly',  interval: 2, hint: 'ženy od 45 let, každé 2 roky' },
    { title: 'Pracovnělékařská prohlídka', freq: 'yearly', interval: 2, hint: 'interval podle posudku' },
  ],
};
let lastPresetTitle = '';
function renderPresets() {
  const list = state.editing ? null : PRESETS[currentType];
  const box = $('#presets');
  box.hidden = !list;
  if (!list) return;
  box.innerHTML = '<span class="hint">Rychlá volba:</span>' + list.map((p, i) =>
    `<button type="button" class="chip small" data-preset="${i}" title="${esc(p.hint)}">${esc(p.title)} <small>${esc(p.hint)}</small></button>`).join('');
}
$('#presets').onclick = e => {
  const b = e.target.closest('[data-preset]');
  if (!b) return;
  const p = PRESETS[currentType][Number(b.dataset.preset)];
  // Název přepíšeme jen tehdy, když je prázdný nebo z předchozí rychlé volby.
  if (!form.title.value.trim() || form.title.value === lastPresetTitle) form.title.value = p.title;
  lastPresetTitle = p.title;
  form.freq.value = p.freq; form.interval.value = p.interval;
  syncInterval();
  for (const c of $('#presets').querySelectorAll('.chip')) c.classList.toggle('on', c === b);
  form.title.focus();
};

// U svátku doplníme datum podle jména (dokud ho uživatel nezmění ručně).
function updateNameDayHint(fill = true) {
  const hint = $('#nameday-hint');
  if (currentType !== 'svatek') { hint.hidden = true; return; }
  const nd = findNameDay(form.title.value);
  hint.hidden = !form.title.value.trim();
  if (!nd) { hint.textContent = 'Jméno v kalendáři svátků nenajdu, zadejte datum ručně.'; return; }
  hint.textContent = `${nd.name} má svátek ${nd.day}. ${nd.month}.`;
  if (fill && form.date.dataset.manual !== '1') {
    form.date.value = formatDate({ y: parseDate(todayStr()).y, m: nd.month, d: nd.day });
  }
}
form.title.addEventListener('input', () => updateNameDayHint(true));
form.date.addEventListener('input', () => { form.date.dataset.manual = '1'; });
$('#type-pick').onclick = e => {
  const b = e.target.closest('[data-type]');
  if (b) setType(b.dataset.type, !state.editing);
};
function syncInterval() { $('.interval-wrap').hidden = form.freq.value === 'none' || !!TYPES[currentType]?.yearly; }
form.freq.onchange = syncInterval;

function openItem(item) {
  state.editing = item || null;
  form.reset();
  form.date.dataset.manual = item ? '1' : '';
  $('#item-title').textContent = item ? 'Upravit položku' : 'Nová položka';
  $('#btn-delete').hidden = !item;
  if (item) {
    setType(item.type, false);
    form.title.value = item.title;
    form.date.value = item.date;
    form.freq.value = item.repeat.freq;
    form.interval.value = item.repeat.interval || 1;
    form.remindDays.value = item.remindDays;
    form.emailReminder.checked = item.emailReminder;
    form.price.value = item.price;
    form.currency.value = item.currency || 'Kč';
    form.note.value = item.note;
    form.noYear.checked = !!item.noYear;
    updateNameDayHint(false);
  } else {
    const pref = state.tab === 'agenda' ? (state.agendaFilter === 'people' ? 'narozeniny' : state.agendaFilter) : state.filter;
    setType(pref in TYPES ? pref : 'zaruka', true);
    form.date.value = todayStr();
  }
  syncInterval();
  setupDone(item);
  $('#dlg-item').showModal();
  form.title.focus();
}

// ---------- Hotovo (STK, prohlídky, údržba) ----------
// Po provedení posune termín: datum provedení + interval opakování.
const DONE_TYPES = ['stk', 'prohlidka', 'udrzba'];

function doneNext(item, doneDate) {
  const months = repeatMonths(item.repeat);
  return months ? addMonths(doneDate, months) : null;
}

function setupDone(item) {
  const box = $('#done-box');
  const ok = item && DONE_TYPES.includes(item.type) && repeatMonths(item.repeat) > 0;
  box.hidden = !ok;
  if (!ok) return;
  $('#done-date').value = todayStr();
  updateDoneInfo();
}

function updateDoneInfo() {
  const it = state.editing;
  const d = $('#done-date').value;
  if (!it || !d) { $('#done-info').textContent = ''; return; }
  const next = doneNext(it, d);
  const what = it.type === 'stk' ? 'Nová platnost STK do' : 'Další termín';
  $('#done-info').innerHTML = `${what} <b>${formatCz(next)}</b>` +
    (it.lastDone ? ` · naposledy provedeno ${formatCz(it.lastDone)}` : '');
}
$('#done-date').addEventListener('input', updateDoneInfo);

$('#btn-done').onclick = async () => {
  const it = state.editing;
  const doneDate = $('#done-date').value;
  if (!it || !doneDate) return;
  try { await ensureAuth(); } catch (err) { return toast(err.message, 'error'); }
  const next = doneNext(it, doneDate);
  busy(true);
  try {
    const saved = await saveItem(state.calendarId, { ...it, date: next, lastDone: doneDate });
    const idx = state.items.findIndex(i => i.id === saved.id);
    if (idx >= 0) state.items[idx] = saved;
    $('#dlg-item').close();
    await refreshAgenda();
    renderAll();
    toast(`Hotovo ✓ Další termín ${formatCz(next)}`);
  } catch (err) { handleError(err); }
  finally { busy(false); }
};

form.onsubmit = async e => {
  e.preventDefault();
  const item = {
    id: state.editing?.id,
    type: currentType,
    title: form.title.value.trim(),
    date: form.date.value,
    repeat: { freq: form.freq.value, interval: Math.max(1, parseInt(form.interval.value, 10) || 1) },
    remindDays: Math.min(28, Math.max(0, parseInt(form.remindDays.value, 10) || 0)),
    emailReminder: form.emailReminder.checked,
    price: form.price.value,
    currency: form.currency.value,
    note: form.note.value.trim(),
    lastDone: state.editing?.lastDone || '',
  };
  if (!item.title || !item.date) return;
  const t = TYPES[item.type];
  if (t.yearly) {
    item.repeat = { freq: 'yearly', interval: 1 };
    item.price = '';
    item.noYear = !!t.noYear || form.noYear.checked;
    if (item.noYear) item.date = yearlessDate(item.date);
  }
  try { await ensureAuth(); } catch (err) { return toast(err.message, 'error'); }
  const submit = form.querySelector('[type=submit]');
  submit.disabled = true; submit.textContent = 'Ukládám…';
  busy(true);
  try {
    const saved = await saveItem(state.calendarId, item);
    const idx = state.items.findIndex(i => i.id === saved.id);
    if (idx >= 0) state.items[idx] = saved; else state.items.push(saved);
    $('#dlg-item').close();
    await refreshAgenda();
    renderAll();
    toast(item.id ? 'Uloženo' : 'Přidáno do kalendáře');
  } catch (err) { handleError(err); }
  finally { busy(false); submit.disabled = false; submit.textContent = 'Uložit'; }
};

$('#btn-delete').onclick = async () => {
  const it = state.editing;
  if (!it) return;
  const btn = $('#btn-delete');
  if (btn.dataset.confirm !== '1') { // dvojklik místo confirm() dialogu
    btn.dataset.confirm = '1'; btn.textContent = 'Opravdu smazat?';
    setTimeout(() => { btn.dataset.confirm = ''; btn.textContent = 'Smazat'; }, 3000);
    return;
  }
  btn.dataset.confirm = ''; btn.textContent = 'Smazat';
  try { await ensureAuth(); } catch (err) { return toast(err.message, 'error'); }
  busy(true);
  try {
    await deleteItem(state.calendarId, it.id);
    state.items = state.items.filter(i => i.id !== it.id);
    $('#dlg-item').close();
    await refreshAgenda();
    renderAll();
    toast('Smazáno');
  } catch (err) { handleError(err); }
  finally { busy(false); }
};

// ---------- Nastavení ----------
$('#btn-settings').onclick = () => {
  $('#set-client').textContent = store.get(LS.client) || '—';
  $('#set-origin').textContent = location.origin;
  $('#set-cal').textContent = state.calendarId || '—';
  $('#set-ver').textContent = new URL(import.meta.url).searchParams.get('v') || 'vývojová';
  $('#dlg-settings').showModal();
};
$('#btn-open-cal').onclick = () => {
  const url = state.calendarId
    ? `https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(state.calendarId)}`
    : 'https://calendar.google.com/';
  window.open(url, '_blank', 'noopener');
};
$('#btn-signout').onclick = async () => {
  await signOut();
  $('#dlg-settings').close();
  state.items = [];
  show('signin');
  toast('Odhlášeno');
};
$('#btn-reset').onclick = async () => {
  await signOut();
  store.del(LS.cal);
  state.calendarId = null;
  $('#dlg-settings').close();
  setupIdx = 4; // rovnou na krok s Client ID
  show('setup'); renderSetup();
};
document.addEventListener('click', e => {
  if (e.target.matches('[data-close]')) e.target.closest('dialog').close();
});

// ---------- Export / import ----------
const EXPORT_FIELDS = ['type', 'title', 'date', 'repeat', 'remindDays', 'emailReminder', 'price', 'currency', 'note', 'noYear', 'lastDone'];
const itemKey = i => `${i.type}|${String(i.title).trim().toLowerCase()}`;
let importQueue = [];

$('#btn-export').onclick = () => {
  const data = {
    app: 'jnCalendar',
    format: 1,
    exported: new Date().toISOString(),
    items: state.items.map(i => Object.fromEntries(EXPORT_FIELDS.map(k => [k, i[k]]))),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `jnCalendar-${todayStr()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast(`Exportováno ${data.items.length} položek`);
};

$('#btn-import').onclick = () => { $('#import-file').value = ''; $('#import-file').click(); };

function cleanImported(raw) {
  if (!raw || typeof raw.title !== 'string' || !raw.title.trim()) return null;
  if (typeof raw.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw.date)) return null;
  const type = raw.type in TYPES ? raw.type : 'jine';
  const freq = ['none', 'monthly', 'yearly'].includes(raw.repeat?.freq) ? raw.repeat.freq : 'none';
  const t = TYPES[type];
  if (t.yearly) { // narozeniny, výročí a svátky se vždy opakují každý rok
    const base = cleanImported({ ...raw, type: 'jine' });
    return base && {
      ...base, type,
      repeat: { freq: 'yearly', interval: 1 }, price: '', noYear: !!t.noYear || !!raw.noYear,
    };
  }
  return {
    type,
    title: raw.title.trim().slice(0, 120),
    date: raw.date,
    repeat: { freq, interval: Math.min(60, Math.max(1, parseInt(raw.repeat?.interval, 10) || 1)) },
    remindDays: Math.min(28, Math.max(0, parseInt(raw.remindDays, 10) || 0)),
    emailReminder: !!raw.emailReminder,
    price: raw.price ? String(raw.price) : '',
    currency: ['Kč', '€', '$'].includes(raw.currency) ? raw.currency : 'Kč',
    note: typeof raw.note === 'string' ? raw.note.slice(0, 900) : '',
    noYear: !!raw.noYear,
    lastDone: typeof raw.lastDone === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.lastDone) ? raw.lastDone : '',
  };
}

$('#import-file').onchange = async e => {
  const file = e.target.files[0];
  if (!file) return;
  let data;
  try { data = JSON.parse(await file.text()); } catch { return toast('Soubor nejde přečíst. Je to export z jnCalendar?', 'error'); }
  if (data?.app !== 'jnCalendar' || !Array.isArray(data.items)) return toast('Tohle není export z jnCalendar.', 'error');

  const existing = new Set(state.items.map(itemKey));
  const valid = data.items.map(cleanImported).filter(Boolean);
  const invalid = data.items.length - valid.length;
  importQueue = valid.filter(i => !existing.has(itemKey(i)));
  const dup = valid.length - importQueue.length;

  const byType = {};
  for (const i of importQueue) byType[i.type] = (byType[i.type] || 0) + 1;
  $('#import-summary').innerHTML = `
    <p>Soubor <b>${esc(file.name)}</b>${data.exported ? `, exportováno ${formatCz(data.exported.slice(0, 10))}` : ''}.</p>
    <p><b>${importQueue.length}</b> položek se přidá do kalendáře jnCalendar tohoto účtu:</p>
    <p class="muted">${Object.entries(byType).map(([k, n]) => `${TYPES[k].icon} ${esc(TYPES[k].short || TYPES[k].label)} ${n}`).join(' · ') || '—'}</p>
    ${dup ? `<p class="hint">${dup} položek tu už je (stejný typ a název), ty se přeskočí.</p>` : ''}
    ${invalid ? `<p class="hint">${invalid} položek je poškozených a nenačtou se.</p>` : ''}`;
  $('#btn-import-go').disabled = !importQueue.length;
  $('#btn-import-go').textContent = 'Importovat';
  $('#dlg-settings').close();
  $('#dlg-import').showModal();
};

$('#btn-import-go').onclick = async () => {
  if (!importQueue.length) return;
  try { await ensureAuth(); } catch (err) { return toast(err.message, 'error'); }
  const btn = $('#btn-import-go');
  btn.disabled = true; $('#btn-import-cancel').disabled = true;
  let done = 0, failed = 0;
  for (const item of importQueue) {
    btn.textContent = `Importuji ${done + failed + 1}/${importQueue.length}…`;
    try {
      state.items.push(await saveItem(state.calendarId, item));
      done++;
    } catch (err) {
      if (err instanceof AuthError) { handleError(err); break; }
      failed++;
    }
  }
  $('#btn-import-cancel').disabled = false;
  $('#dlg-import').close();
  importQueue = [];
  try { await refreshAgenda(); } catch {}
  renderAll();
  toast(failed ? `Importováno ${done}, nepodařilo se ${failed}.` : `Importováno ${done} položek ✓`, failed ? 'error' : '');
};

// ---------- Start ----------
async function start() {
  if (location.protocol === 'file:') return show('file');
  const clientId = store.get(LS.client);
  if (!clientId) {
    setupIdx = Math.min(Number(store.get(LS.step) || 0), SETUP.length - 1);
    show('setup'); renderSetup();
    return;
  }
  try { await initAuth(clientId); } catch (e) { toast(e.message, 'error'); }
  if (getStoredToken()) await loadAll();
  else show('signin');
}
start();
