# Lhůtník

Malá webová aplikace, která hlídá periodické události: **narozeniny, svátky, výročí, platnost dokladů,
STK, pojistky a smlouvy, daně, prohlídky a očkování, péči o zvířata, údržbu auta, lodi, domu
a zahrady, předplatná a záruky**.
Každá položka se uloží jako celodenní událost do samostatného Google kalendáře **Lhůtník**
a dostane připomínku. Připomínky tak chodí z Google kalendáře do telefonu i počítače,
ať je aplikace spuštěná, nebo ne.

📖 **Podrobná nápověda s obrázky:** [n-yachts.github.io/lhutnik/help.html](https://n-yachts.github.io/lhutnik/help.html)
(v aplikaci tlačítko *❓ Nápověda* a odkaz na první stránce průvodce).

## Co umí

- **Přehled:** nadcházející události z kalendáře Lhůtník seřazené podle data a seskupené po měsících.
  Dny, kdy nic není, se vynechají. Filtr podle typu (nebo jen *Lidé*: narozeniny, svátky, výročí)
  a rozsah měsíc / 3 měsíce / rok. Nahoře je vidět, kdo má dnes a zítra svátek.
- **17 typů položek ve skupinách:**
  - *Lidé* – narozeniny (věk), svátky (datum podle jména), výročí
  - *Termíny a platnost* – doklady, STK, pojištění a smlouvy, daně a poplatky
  - *Zdraví* – prohlídky, očkování, čočky; zvířata
  - *Údržba* – auto, loď, domácnost, zahrada, ostatní údržba
  - *Platby a ostatní* – předplatné, záruky, jiné
- **Rychlá volba:** u většiny typů rozbalovací seznam běžných úkonů s obvyklými intervaly
  (např. zubař 2× ročně, výměna impeleru, kontrola komína, přezutí pneu, daň z nemovitých věcí do 31. 5.).
- **Smlouvy a pojištění:** zadáte výročí a výpovědní lhůtu (u pojištění 6 týdnů) a do kalendáře
  se zapíše poslední den pro výpověď.
- **✓ Hotovo** u opakovaných úkonů (STK, zdraví, zvířata, auto, loď, domácnost, zahrada, údržba):
  termín se posune o interval od data provedení a aplikace si pamatuje, kdy to bylo naposledy.
- **Položky:** správa všeho, co je v kalendáři, se souhrnem prošlých položek a měsíční ceny předplatných.
- **Export a import** položek do souboru – přenos k jinému uživateli nebo záloha.
- **Instalace do telefonu i počítače** jako aplikace s vlastní ikonou (PWA), bez Google Play.

## Spuštění

### Na webu (počítač i mobil)

**https://n-yachts.github.io/lhutnik/**

Běží na GitHub Pages z tohoto repozitáře.

**Instalace jako aplikace (PWA):** v Chromu na Androidu tlačítko *📲 Nainstalovat* v aplikaci
nebo menu ⋮ → *Nainstalovat aplikaci*; na iPhonu Safari → Sdílet → *Přidat na plochu*;
na počítači ikona instalace v adresním řádku. Aplikace dostane vlastní ikonu, spouští se
na celou obrazovku a podržením ikony nabídne zkratku *Přidat položku*.

### Lokálně na počítači

1. Dvakrát klikněte na **`start.cmd`**.
2. Otevře se prohlížeč na `http://localhost:8080`. Okno s konzolí nechte otevřené.

Nic se neinstaluje: server je malý skript v PowerShellu (`server.ps1`), který je součástí Windows.
Stránku neotvírejte přímo ze souboru (`file://…`), Google přihlášení tak nefunguje.

Při prvním spuštění na každé adrese (web, localhost) vás provede **průvodce nastavením**.
Google Cloud se nastavuje jen jednou; na další adrese stačí vložit stejné Client ID.
Obě verze pracují se stejným kalendářem, takže data jsou všude stejná.

## Jednorázové nastavení Google Cloud (shrnutí průvodce)

| Krok | Kde | Co udělat |
|---|---|---|
| 1 | [Nový projekt](https://console.cloud.google.com/projectcreate) | Název `Lhutnik` → Vytvořit |
| 2 | [Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com) | Povolit |
| 3 | [Google Auth Platform](https://console.cloud.google.com/auth/overview) | Začít → název, e-mail, cílová skupina **Externí** |
| 3b | [Audience](https://console.cloud.google.com/auth/audience) | **Publikovat aplikaci** (jinak přihlášení po 7 dnech vyprší) |
| 4 | [Nový klient](https://console.cloud.google.com/auth/clients/create) | Webová aplikace, *Authorized JavaScript origins* = `https://n-yachts.github.io` a `http://localhost:8080` |
| 5 | aplikace | Vložit Client ID → Přihlásit se přes Google |

Google Cloud i Calendar API jsou pro takové použití **zdarma**, platební karta není potřeba.
Při přihlášení uvidíte „Google tuto aplikaci neověřil“: je to vaše vlastní aplikace, klikněte na *Pokračovat*.

## Oprávnění

Aplikace žádá jen tato oprávnění:

- `calendar.app.created`: vytvořit vlastní kalendář a spravovat události **pouze v něm**.
- `calendar.calendarlist.readonly`: přečíst seznam kalendářů, aby našla už založený „Lhůtník“.

Do ostatních kalendářů nevidí a nic v nich nemění. Přehled čte jen kalendář Lhůtník.

## Jak to funguje

- Běží jen v prohlížeči (HTML + JavaScript), bez vlastního serveru a databáze.
  **Úložištěm je samotný Google kalendář**: data aplikace jsou ve skrytých vlastnostech událostí.
- Přihlášení: Google Identity Services, *token model*. Přístupový token platí asi hodinu a uchovává se
  jen v záložce prohlížeče (`sessionStorage`). Po vypršení stačí kliknout, Google si souhlas pamatuje.
- V `localStorage` se ukládá jen Client ID a ID kalendáře.
- Připomínka přijde v **9:00** zvolený počet dní předem (Google dovoluje nejvýš 28 dní).
- Opakování: měsíčně nebo ročně, s intervalem (např. každé 2 roky). Událost v kalendáři má odpovídající pravidlo RRULE.

## Přenos položek a záloha

V *Nastavení → Přenos položek*:

- **Exportovat do souboru** uloží všechny položky do souboru `lhutnik-RRRR-MM-DD.json`.
- **Importovat ze souboru** je přidá do kalendáře Lhůtník účtu, který je právě přihlášený.
  Před importem ukáže, co se přidá. Položky se stejným typem a názvem, které už v kalendáři jsou,
  přeskočí, takže import jde klidně spustit znovu.

Postup pro jiného uživatele: vy uděláte export, soubor mu pošlete, on se v aplikaci přihlásí svým
účtem a dá import. Export se hodí i jako záloha.

Export z Google kalendáře (.ics) k tomu nepoužívejte: přenese jen holé události bez údajů
aplikace (typ, rok narození, poslední provedení), takže by je Lhůtník na druhém účtu nepoznal.

## Další lidé

Aplikace v režimu „In production“ bez ověření zvládne až 100 uživatelů. Každý se přihlásí svým účtem
a dostane vlastní kalendář Lhůtník. Pro sdílení jednoho kalendáře (třeba s rodinou) stačí
kalendář „Lhůtník“ nasdílet v Google kalendáři.

## Aktualizace webu

Webová verze se nasazuje automaticky z větve `main`: po `git push` je změna
na https://n-yachts.github.io/lhutnik/ zhruba do minuty.

Soubory se načítají s číslem verze (`?v=…`), aby prohlížeč po nasazení nebral staré soubory
z mezipaměti. Aktuální verzi vidíte v *Nastavení*.

Při změně aplikace (podrobně v `CLAUDE.md`):

```
python tools/screenshots.py   # nové náhledy do nápovědy (Python + Playwright)
python tools/stamp.py         # nové číslo verze souborů
```

## Soubory

```
index.html      rozvržení stránky
styles.css      vzhled (světlý i tmavý režim)
js/app.js       průvodce, přehled, formulář
js/auth.js      přihlášení přes Google
js/calendar.js  volání Calendar API, převod položka ↔ událost
js/catalog.js   typy položek, výchozí hodnoty, rychlá volba
js/dates.js     práce s daty, opakování, připomínky
js/svatky.js    český kalendář jmen (data z balíčku namedays, MIT licence)
help.html       nápověda; náhledy obrazovek v help/img/
manifest.webmanifest, sw.js, icons/   instalace jako aplikace (PWA)
tools/          screenshots.py (náhledy do nápovědy), stamp.py (verze souborů), icons.py (ikony)
AGENTS.md       pro AI agenty a vývojáře: co aplikace dělá, jak a proč (architektura, data, toky)
CLAUDE.md       pravidla pro každou úpravu (nápověda, náhledy, verze)
tests/          unit testy (node tests/dates.test.mjs)
server.ps1      lokální server na portu 8080
start.cmd       spouštěč
```

## Řešení potíží

- **„Port 8080 je obsazený“**: aplikace už nejspíš běží v jiném okně.
- **`redirect_uri_mismatch` / `origin_mismatch`**: v Client ID chybí adresa, ze které aplikaci otevíráte:
  `https://n-yachts.github.io` nebo `http://localhost:8080` (jen doména, bez cesty a bez lomítka na konci).
  Změna se někdy projeví až za několik minut.
- **`access_denied`**: aplikace je v režimu Testing a váš účet není mezi *Test users*, nebo ji publikujte.
- **Přihlašovací okno se neotevře**: povolte vyskakovací okna pro stránku aplikace.
- **Chci začít znovu**: Nastavení → *Znovu spustit průvodce*.
