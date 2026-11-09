# Lhůtník – pokyny pro úpravy

Statická webová aplikace (HTML + JS moduly, bez buildu) nad Google Calendar API.
Nasazuje se přes GitHub Pages z větve `main`: https://n-yachts.github.io/lhutnik/

## Při každé změně aplikace

1. **Aktualizuj nápovědu `help.html`** – nové funkce, změněné texty, popisky tlačítek, tabulky typů.
   Nápověda musí odpovídat tomu, co aplikace skutečně dělá.
2. **Přegeneruj náhledy** do `help/img/`: `python tools/screenshots.py`
   (Playwright, napodobený Google, ukázková data, pevné datum 9. 11. 2026).
   Nová obrazovka nebo funkce → přidej snímek do skriptu i do `help.html`. Snímky si prohlédni.
3. **README.md** – stručný přehled funkcí drž v souladu s nápovědou.
4. **Verze**: `python tools/stamp.py` – doplní `?v=…` k CSS, JS modulům a obrázkům nápovědy
   a změní `VERSION` v `sw.js` (nová mezipaměť), jinak prohlížeče drží staré soubory.
   Nový soubor, který má fungovat offline, přidej do `SHELL` v `sw.js`.
5. Uživatelské texty jsou česky. Nový typ položky = `TYPES`, `TYPE_GROUPS`, `DEFAULTS`
   (+ `PRESETS`, `OCCASION`, `DONE_TYPES`) v `js/catalog.js`, barva `.item.t-…` ve `styles.css`,
   úvod průvodce, nápověda (tabulka typů), README. Intervaly a lhůty v rychlé volbě ověř ve zdrojích.

## Dřívější název

Aplikace se dříve jmenovala **jnCalendar** (repozitář i adresa `/jnCalendar/`). Kvůli kompatibilitě:
kalendář se najde i pod starým názvem a přejmenuje se (`LEGACY_NAMES` v `js/calendar.js`),
import přijímá soubory s `app: 'jnCalendar'`, klíče v `localStorage` zůstávají `jn.*`.

## Struktura

- `index.html`, `styles.css` – aplikace; `help.html` – nápověda (odkaz v hlavičce, v 1. kroku průvodce a u přihlášení)
- `js/app.js` – UI, průvodce, přehled, formulář, Hotovo, export/import
- `js/catalog.js` – typy, skupiny, výchozí hodnoty, rychlá volba
- `js/calendar.js` – REST volání, převod položka ↔ událost (data v `extendedProperties.private`;
  u smluv s výpovědní lhůtou se zapisuje poslední den výpovědi, položka nese výročí)
- `js/auth.js` – Google Identity Services (token model), oprávnění `calendar.app.created` + `calendar.calendarlist.readonly`
- `js/dates.js` – data bez časové zóny, opakování, připomínky; `js/svatky.js` – český kalendář jmen
- `manifest.webmanifest`, `sw.js` (service worker „nejdřív síť“), `icons/` – instalace jako aplikace (PWA);
  ikony generuje `tools/icons.py`
- `server.ps1` + `start.cmd` – lokální server na `http://localhost:8080`
- `tools/` – `screenshots.py` (náhledy do nápovědy), `stamp.py` (verze souborů)
