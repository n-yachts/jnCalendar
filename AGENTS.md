# AGENTS.md – Lhůtník

Informace pro AI agenty (a lidi), kteří budou na projektu pracovat: **co** aplikace dělá,
**jak** to dělá a **proč** je to udělané právě takto. Pravidla pro každou úpravu jsou stručně
v [`CLAUDE.md`](CLAUDE.md) – platí pro všechny agenty, nejen pro Claude.

- Web: https://n-yachts.github.io/lhutnik/ (GitHub Pages z větve `main`)
- Nápověda pro uživatele: https://n-yachts.github.io/lhutnik/help.html (`help.html`)
- Jazyk uživatelského rozhraní, nápovědy i dokumentace: **čeština**

---

## 1. Co aplikace dělá

Lhůtník hlídá **opakované a termínované události** a ukládá je do Google kalendáře
i s připomínkami: narozeniny, svátky (jmeniny), výročí, platnost dokladů, STK, výpovědní lhůty
pojistek a smluv, daně a poplatky, preventivní prohlídky a očkování, péči o zvířata, údržbu
auta, lodi, domu a zahrady, předplatná a záruky.

Uživatel je jeden člověk (majitel repozitáře, mimo jiné majitel lodi), aplikace ale zvládne
i další uživatele – každý se přihlásí svým Google účtem a má vlastní kalendář.

Hlavní obrazovky:

| Obrazovka | Co ukazuje |
|---|---|
| Průvodce (1. spuštění) | jak v Google Cloud vytvořit projekt, souhlasovou obrazovku a OAuth Client ID; uživatel vloží Client ID |
| 📋 Přehled | nadcházející výskyty z kalendáře, seskupené po měsících; prázdné dny vynechány; filtr typu/„Lidé“, rozsah 1/3/12 měsíců; kdo má dnes/zítra svátek |
| 🗂️ Položky | každá položka jednou (u opakovaných nejbližší termín), souhrn (počet, do 30 dní, prošlé, předplatná/měsíc), filtr, hledání |
| Formulář | typ (ve skupinách), rychlá volba, název, datum, opakování, připomínka, cena, poznámka; u smluv výpovědní lhůta; u STK/údržby apod. rámeček **✓ Hotovo** |
| Nastavení | export/import JSON, instalace jako aplikace, odhlášení, nový průvodce, verze |

---

## 2. Architektura a proč takto

**Statická stránka bez buildu, bez serveru a bez databáze. Úložištěm je Google kalendář.**

| Rozhodnutí | Proč |
|---|---|
| Čisté HTML + ES moduly, žádný framework ani bundler | jednoduchá údržba, nic se neinstaluje, běží z GitHub Pages i z `server.ps1`; uživatel není vývojář na plný úvazek |
| Data jen v Google kalendáři (`extendedProperties.private` u událostí) | žádný backend = nulové náklady a žádná správa; data zůstávají v účtu uživatele; **připomínky posílá Google Kalendář** i když aplikace neběží (na telefon, e-mail) |
| Samostatný kalendář „Lhůtník“ | uživatel ho může v Google skrýt, přebarvit nebo nasdílet rodině; aplikace nesahá na ostatní kalendáře |
| Oprávnění jen `calendar.app.created` + `calendar.calendarlist.readonly` | nejmenší možný přístup: aplikace smí měnit **jen kalendář, který sama založila**; seznam kalendářů jen čte, aby kalendář našla na novém zařízení. Uživatel výslovně **nechtěl** přehled z ostatních kalendářů |
| Google Identity Services, **token model** (bez client secret) | čistě klientská aplikace; Client ID není tajné |
| Client ID **zadává uživatel** v průvodci (uloží se do `localStorage`) | v repozitáři nejsou žádné klíče; kdokoli může použít vlastní Google Cloud projekt; repozitář je veřejný |
| GitHub Pages (veřejný repozitář) | zdarma; privátní repo by na Free plánu Pages neumožnilo a kód by stejně byl veřejný v prohlížeči |
| PWA (manifest + service worker) místo nativní aplikace / Google Play | instalace do telefonu bez poplatků a bez 14denního testu s 12 testery, aktualizace okamžitě |
| Lokální server `server.ps1` (PowerShell `HttpListener`) | Windows ho má vestavěný; uživatel nemusí nic instalovat |

### Moduly (`js/`)

```
app.js ── UI, průvodce, přehled, položky, formulář, Hotovo, export/import, PWA instalace
 ├─ catalog.js   typy, skupiny, výchozí hodnoty, rychlá volba (čistá data)
 ├─ calendar.js  REST volání Calendar API v3, převod položka ↔ událost
 │   ├─ auth.js     přihlášení (GIS), token v sessionStorage
 │   └─ dates.js
 ├─ dates.js     data jako řetězce YYYY-MM-DD, opakování, připomínky
 └─ svatky.js    český kalendář jmen (data z npm balíčku `namedays`, MIT)
```

**Pozor na importy s verzí:** importy mají tvar `from './auth.js?v=20261109-1820'`.
Moduly s jiným query stringem jsou pro prohlížeč **jiné instance** – kdyby `app.js`
a `calendar.js` importovaly `auth.js` s různou verzí, existovaly by dva oddělené stavy
přihlášení. Proto verze nastavuje vždy najednou `tools/stamp.py`.

---

## 3. Datový model

### Položka (v aplikaci)

```js
{
  id,              // ID události v Google kalendáři (u opakovaných ID hlavní události)
  type,            // klíč z TYPES (catalog.js)
  title,           // název bez prefixu
  date,            // YYYY-MM-DD – u smluv VÝROČÍ (viz níže), jinak první/aktuální termín
  repeat: { freq: 'none'|'monthly'|'yearly', interval },
  remindDays,      // 0–28
  emailReminder,   // bool
  price, currency, note,
  noYear,          // narozeniny/výročí bez známého roku (svátky vždy)
  lastDone,        // YYYY-MM-DD posledního „Hotovo“
  what,            // „druh“ z rychlé volby, např. 'očkování', 'preventivní prohlídka'
  noticeWeeks,     // jen smlouvy: výpovědní lhůta v týdnech
}
```

### Událost v Google kalendáři

- **Celodenní** (`start.date`, `end.date` = další den), `transparency: transparent` (neblokuje čas).
- Opakování jako `RRULE:FREQ=MONTHLY|YEARLY;INTERVAL=n`.
- `colorId` podle typu (Google má jen 11 barev, některé typy je sdílejí).
- **Název (summary):** `Prefix: Název`, kde prefix = `what` (s velkým písmenem) nebo `TYPES[type].prefix`.
  U smluv s lhůtou: `Poslední den výpovědi: Název (výročí D. M.)`.
- **Popis:** cena, poznámka a patička „— spravováno aplikací Lhůtník“ (jen pro člověka; aplikace z něj nečte).
- **Data aplikace** v `extendedProperties.private` (limit 1024 znaků na hodnotu, proto `jnNote` ořez na 900):

| Klíč | Obsah |
|---|---|
| `jnApp` | `'1'` – značka „událost patří aplikaci“; podle ní se filtruje (`privateExtendedProperty=jnApp=1`) |
| `jnType`, `jnTitle` | typ a název bez prefixu |
| `jnPrice`, `jnCurrency`, `jnNote` | cena, měna, poznámka |
| `jnNoYear` | `'1'` když rok není znám |
| `jnLastDone` | datum posledního Hotovo |
| `jnWhat` | druh z rychlé volby |
| `jnNotice` | výpovědní lhůta v týdnech (jen smlouvy) |

Prefix `jn` je z původního názvu aplikace; **neměnit** – existující události by se ztratily.

### Klíčová pravidla převodu

- **Připomínka** u celodenní události se počítá v minutách před půlnocí začátku:
  `N dní předem v 9:00 = N*1440 − 540`. Google povoluje max. 40320 min → **max. 28 dní**.
- **Smlouvy s výpovědní lhůtou:** do kalendáře se zapisuje **poslední den pro výpověď**
  (`výročí − 7*noticeWeeks` dní), položka v aplikaci nese výročí (`eventStartDate()` /
  `eventToItem()` přepočítávají oběma směry). Proč: Google neumí připomínku víc než 28 dní
  předem a uživatele zajímá hlavně, do kdy musí vypovědět (pojistky: 6 týdnů před výročím).
- **`noYear`:** datum se uloží do letošního roku (29. 2. do nejbližšího přestupného).
- **Svátky** mají vždy `noYear`, datum se doplňuje podle jména (`findNameDay`).

### Data a čas

Všechna data jsou řetězce `YYYY-MM-DD` bez časové zóny, výpočty v UTC (`dates.js`) –
kvůli letnímu/zimnímu času. `nextOccurrence()` napodobuje RRULE: měsíční opakování 31. dne
**přeskočí** měsíce bez 31. dne (jako Google), roční 29. 2. jen přestupné roky.
`addMonths()` (pro Hotovo) naopak den **ořízne** na konec měsíce.

---

## 4. Hlavní toky

### Přihlášení (`auth.js`)
1. `initAuth(clientId)` načte `https://accounts.google.com/gsi/client` a vytvoří token client.
2. `signIn()` musí běžet **přímo z kliknutí** (jinak prohlížeč zablokuje okno). Proto
   `ensureAuth()` v `app.js` volá přihlášení na začátku obsluhy kliknutí (Uložit, Smazat,
   Hotovo, Obnovit…) – rozepsaný formulář se při vypršení tokenu neztratí.
3. Token (≈1 h) a udělená oprávnění se ukládají do `sessionStorage`. Refresh token v token
   modelu neexistuje; obnovení = nové kliknutí, Google si souhlas pamatuje.
4. Aplikace v Google Cloud musí být **publikovaná** („In production“), jinak v režimu Testing
   vyprší souhlas po 7 dnech. Neověřená aplikace = varování „Google tuto aplikaci neověřil“
   a limit 100 uživatelů.

### Kalendář (`ensureCalendar`)
ID kalendáře je v `localStorage` (`lhutnik.calendarId`). Když chybí nebo nefunguje, hledá se
v `calendarList` podle názvu (`CALENDAR_NAME` nebo `LEGACY_NAMES`), jinak se založí nový.
Kalendář se starým názvem (`jnCalendar`) se přejmenuje (`renameIfLegacy`, chyby se ignorují).

### Načtení dat
- **Položky:** `listItems()` = hlavní události (`singleEvents=false`, filtr `jnApp=1`);
  nejbližší termín se dopočítá v prohlížeči (`nextOccurrence`).
- **Přehled:** `listOccurrences()` = jednotlivé výskyty (`singleEvents=true`, `orderBy=startTime`)
  v rozsahu; výskyt se přes `recurringEventId` spáruje s položkou. Díky tomu přehled ukazuje
  i úpravy jednotlivých výskytů provedené přímo v Google Kalendáři.

### Hotovo
U typů v `DONE_TYPES` s opakováním: nový termín = **datum provedení + interval**
(`addMonths`), uloží se `lastDone`. Odpovídá realitě (STK platí od data kontroly).

### Export / import
JSON `{ app: 'lhutnik', format: 1, exported, items: [...] }` s poli z `EXPORT_FIELDS`.
Import přijme i `app: 'jnCalendar'`, validuje každé pole (`cleanImported`), u ročních typů
vynutí roční opakování, přeskočí duplicity (stejný typ + název) a ukládá postupně.
Export z Google (.ics) **nepoužívat** – ztratí `extendedProperties`.

---

## 5. Katalog typů (`js/catalog.js`)

- `TYPES` – label, short (krátký popisek do čipů), prefix, colorId, ikona; příznaky
  `yearly` (vždy ročně, skryje opakování a cenu), `noYear`, `notice` (výpovědní lhůta).
- `TYPE_GROUPS` – skupiny ve formuláři (Lidé, Termíny a platnost, Zdraví, Údržba, Platby a ostatní).
- `DEFAULTS` – výchozí opakování, připomínka, popisky a placeholdery formuláře.
- `PRESETS` – rychlá volba: `title`, `freq`, `interval`, `hint`, volitelně `what`, `remind`,
  `md: [měsíc, den]` (navržené datum), `notice`; `{ group }` = nadpis skupiny (optgroup).
- `OCCASION` – výchozí popis v přehledu; `DONE_TYPES` – typy s Hotovo.

**Zařazení podle druhu, ne podle předmětu:** pojištění lodi/auta je ve *Smlouvách*
(kvůli výpovědní lhůtě), průkaz vůdce plavidla v *Dokladech*, stání v marině v *Předplatném*.

**Intervaly a lhůty v rychlé volbě jsou ověřené** (VZP – preventivní prohlídky, NZIP/FN Motol –
očkování, vyhl. 34/2016 Sb. – komíny, Finanční správa – daň z nemovitých věcí, občanský zákoník –
výpověď pojistky 6 týdnů). Při změně je znovu ověř a uveď v nápovědě, že jsou orientační.

---

## 6. PWA, mezipaměť a verze

- `manifest.webmanifest` (název, ikony vč. `maskable`, zkratky *Přidat položku* = `?akce=pridat`
  a *Nápověda*), `icons/` generuje `tools/icons.py`.
- `sw.js` – **„nejdřív síť“**: vždy nová verze, mezipaměť jen záloha pro offline;
  cizí domény (Google API, přihlášení) se nikdy neukládají. Mezipaměť `lhutnik-<VERSION>`.
- GitHub Pages posílá `Cache-Control: max-age=600`, ES moduly se jinak drží v cache.
  Proto **`python tools/stamp.py`** před každým nasazením doplní `?v=…` k CSS, modulům
  a obrázkům nápovědy a změní `VERSION` v `sw.js`. Verze je vidět v *Nastavení*.

---

## 7. Lokální běh, testy, nasazení

| Co | Jak |
|---|---|
| Lokálně (Windows) | `start.cmd` → `server.ps1` na `http://localhost:8080` (port je pevný, je zapsaný v OAuth originu). Server posílá jen soubory s povolenou příponou uvnitř složky. `server.ps1` má UTF-8 s BOM a CRLF (Windows PowerShell 5.1). |
| Lokálně (jinde) | jakýkoli statický server na portu 8080, např. `python -m http.server 8080` |
| Unit testy dat | `node tests/dates.test.mjs` |
| Smoke test + náhledy | `python tools/screenshots.py` – spustí aplikaci v Playwrightu proti **napodobenému Googlu** (`FakeCalendar`, `FAKE_GIS`), naimportuje ukázková data, projde průvodce, formuláře, Hotovo, nastavení a uloží náhledy do `help/img/`. Pevné datum 9. 11. 2026. Snímky si vždy prohlédni. |
| Skutečný Google | automaticky testovat nejde (OAuth). Změny přihlášení a API ověř ručně s uživatelem. |
| Nasazení | commit + push do `main` → GitHub Pages (≈1 min). Stav: `gh api repos/n-yachts/lhutnik/deployments`. |

Pracovní kopie u uživatele: `C:\Users\jnovacek\source\repos\jnCalendar` (Windows, Visual Studio).

---

## 8. Konvence

- Texty pro uživatele česky, srozumitelně, bez žargonu. Kód a komentáře česky.
- Žádné závislosti a build; nové knihovny jen s velmi dobrým důvodem.
- Žádné `alert()/confirm()` – mazání potvrzuje druhé kliknutí, hlášky přes toast (`popover`, je i nad dialogy).
- Světlý i tmavý režim přes CSS proměnné, mobil od 390 px, ovládání klávesnicí.
- Uživatelská data z Googlu vkládat do HTML jen přes `esc()`.
- Každá změna funkcí = aktualizace `help.html`, náhledů, README a verze (viz `CLAUDE.md`).

---

## 9. Známá omezení

- Připomínka max. 28 dní předem (limit Google); delší výhled řeší přehled s rozsahem *Rok*
  a u smluv posun události na poslední den výpovědi.
- Neověřená OAuth aplikace: varovná obrazovka, max. 100 uživatelů.
- Token ≈1 h, pak nové kliknutí na přihlášení.
- iPhone: aplikace na ploše má vlastní úložiště → znovu zadat Client ID.
- Offline se aplikace spustí, ale data nenačte (jsou v Googlu).
- `Položky` počítají nejbližší termín z hlavní události; výjimky jednotlivých výskytů
  upravené v Google Kalendáři zohlední jen *Přehled*.

## 10. Historie a nápady

- Dříve **jnCalendar** (adresa `/jnCalendar/`). Kompatibilita: `LEGACY_NAMES`, import
  `app: 'jnCalendar'`, přenos klíčů `jn.*` → `lhutnik.*` v `localStorage` (začátek `app.js`); klíče `jn*`
  v událostech zůstávají. `LEGACY_NAMES`,
  přenos klíčů `jn.*` a import starého formátu lze odstranit, až uživatel potvrdí, že kalendář je přejmenovaný.
- Zvažované a zatím neudělané: zabalení PWA pro Google Play (TWA; vyžaduje vlastní doménu
  kvůli `assetlinks.json`, účet $25 a 14denní test s 12 testery), nativní aplikace (nepřínosné –
  notifikace řeší Google Kalendář), přehled z ostatních kalendářů (uživatel nechce).
