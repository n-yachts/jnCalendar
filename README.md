# jnCalendar

Malá webová aplikace na **narozeniny, svátky, výročí, platnost dokladů, technické kontroly,
lékařské prohlídky, záruky, předplatná a údržbu** (třeba lodi).
Každá položka se uloží jako celodenní událost do samostatného Google kalendáře **jnCalendar**
a dostane připomínku. Připomínky tak chodí z Google kalendáře do telefonu i počítače,
ať je aplikace spuštěná, nebo ne.

## Co umí

- **Přehled:** nadcházející události z kalendáře jnCalendar seřazené podle data a seskupené po měsících.
  Dny, kdy nic není, se vynechají. Filtr podle typu (nebo jen *Lidé*: narozeniny, svátky, výročí)
  a rozsah měsíc / 3 měsíce / rok. Nahoře je vidět, kdo má dnes a zítra svátek.
- **Narozeniny a výročí:** opakují se každý rok a přehled ukazuje, kolikáté jsou („40. narozeniny“,
  „10. výročí“). Když rok neznáte, zaškrtněte *rok neznám*.
- **Svátky:** stačí napsat jméno, datum se doplní samo podle českého kalendáře jmen.
- **Doklady a STK:** konec platnosti pasu, občanky, řidičáku, průkazu vůdce plavidla nebo technické
  kontroly. STK se ve výchozím stavu opakuje každé 2 roky; po kontrole stačí upravit datum.
  Připomínka chodí 28 dní předem (víc Google nedovolí), v přehledu ale termín vidíte i dřív.
- **Lékařské prohlídky:** rychlá volba běžných preventivních prohlídek s obvyklými intervaly
  (praktický lékař každé 2 roky, zubař 2× ročně, gynekolog každý rok, mamografie každé 2 roky
  od 45 let). Po návštěvě stačí upravit datum na nový termín.
- **Položky:** správa všeho, co je v kalendáři, se souhrnem prošlých záruk a měsíční ceny předplatných.

## Spuštění

### Na webu (počítač i mobil)

**https://n-yachts.github.io/jnCalendar/**

Běží na GitHub Pages z tohoto repozitáře. Na mobilu si ji přidejte na plochu přes menu
prohlížeče → *Přidat na plochu*.

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
| 1 | [Nový projekt](https://console.cloud.google.com/projectcreate) | Název `jnCalendar` → Vytvořit |
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
- `calendar.calendarlist.readonly`: přečíst seznam kalendářů, aby našla už založený „jnCalendar“.

Do ostatních kalendářů nevidí a nic v nich nemění. Přehled čte jen kalendář jnCalendar.

## Jak to funguje

- Běží jen v prohlížeči (HTML + JavaScript), bez vlastního serveru a databáze.
  **Úložištěm je samotný Google kalendář**: data aplikace jsou ve skrytých vlastnostech událostí.
- Přihlášení: Google Identity Services, *token model*. Přístupový token platí asi hodinu a uchovává se
  jen v záložce prohlížeče (`sessionStorage`). Po vypršení stačí kliknout, Google si souhlas pamatuje.
- V `localStorage` se ukládá jen Client ID a ID kalendáře.
- Připomínka přijde v **9:00** zvolený počet dní předem (Google dovoluje nejvýš 28 dní).
- Opakování: měsíčně nebo ročně, s intervalem (např. každé 2 roky). Událost v kalendáři má odpovídající pravidlo RRULE.

## Další lidé

Aplikace v režimu „In production“ bez ověření zvládne až 100 uživatelů. Každý se přihlásí svým účtem
a dostane vlastní kalendář jnCalendar. Pro sdílení jednoho kalendáře (třeba s rodinou) stačí
kalendář „jnCalendar“ nasdílet v Google kalendáři.

## Aktualizace webu

Webová verze se nasazuje automaticky z větve `main`: po `git push` je změna
na https://n-yachts.github.io/jnCalendar/ zhruba do minuty.

## Soubory

```
index.html      rozvržení stránky
styles.css      vzhled (světlý i tmavý režim)
js/app.js       průvodce, přehled, formulář
js/auth.js      přihlášení přes Google
js/calendar.js  volání Calendar API, převod položka ↔ událost
js/dates.js     práce s daty, opakování, připomínky
js/svatky.js    český kalendář jmen (data z balíčku namedays, MIT licence)
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
