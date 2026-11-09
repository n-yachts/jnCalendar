// Katalog typů položek: názvy, barvy, výchozí hodnoty formuláře a rychlé volby.
// Nový typ = záznam v TYPES + DEFAULTS (+ případně PRESETS a OCCASION), barva .item.t-… ve styles.css.

// color = colorId události v Google kalendáři (1–11).
export const TYPES = {
  // Lidé
  narozeniny: { label: 'Narozeniny', prefix: 'Narozeniny', color: '3', icon: '🎂', yearly: true },
  svatek:     { label: 'Svátek', prefix: 'Svátek', color: '2', icon: '💐', yearly: true, noYear: true },
  vyroci:     { label: 'Výročí', prefix: 'Výročí', color: '4', icon: '💍', yearly: true },
  // Termíny a platnost
  doklad:     { label: 'Doklady', prefix: 'Konec platnosti', color: '11', icon: '🪪' },
  stk:        { label: 'Technická kontrola', short: 'STK', prefix: 'Technická kontrola', color: '7', icon: '🚗' },
  smlouva:    { label: 'Pojištění a smlouvy', short: 'Smlouvy', prefix: 'Smlouva', color: '1', icon: '📄', notice: true },
  dane:       { label: 'Daně a poplatky', short: 'Daně', prefix: 'Daně a poplatky', color: '6', icon: '🏛️' },
  // Zdraví
  prohlidka:  { label: 'Zdraví a prohlídky', short: 'Zdraví', prefix: 'Zdraví', color: '5', icon: '🩺' },
  zvire:      { label: 'Zvířata', prefix: 'Zvíře', color: '2', icon: '🐾' },
  // Údržba
  auto:       { label: 'Auto', prefix: 'Auto', color: '7', icon: '🚙' },
  lod:        { label: 'Loď', prefix: 'Loď', color: '9', icon: '⛵' },
  dum:        { label: 'Domácnost', prefix: 'Domácnost', color: '1', icon: '🏠' },
  zahrada:    { label: 'Zahrada', prefix: 'Zahrada', color: '10', icon: '🌳' },
  udrzba:     { label: 'Údržba', prefix: 'Údržba', color: '10', icon: '🔧' },
  // Platby a nákupy
  predplatne: { label: 'Předplatné', prefix: 'Předplatné', color: '6', icon: '🔁' },
  zaruka:     { label: 'Záruka', prefix: 'Konec záruky', color: '9', icon: '🛡️' },
  jine:       { label: 'Jiné', prefix: '', color: '8', icon: '📌' },
};

// Skupiny pro výběr typu ve formuláři.
export const TYPE_GROUPS = [
  ['Lidé', ['narozeniny', 'svatek', 'vyroci']],
  ['Termíny a platnost', ['doklad', 'stk', 'smlouva', 'dane']],
  ['Zdraví', ['prohlidka', 'zvire']],
  ['Údržba', ['auto', 'lod', 'dum', 'zahrada', 'udrzba']],
  ['Platby a ostatní', ['predplatne', 'zaruka', 'jine']],
];

// Typy s tlačítkem ✓ Hotovo (opakované úkony, termín se posune od data provedení).
export const DONE_TYPES = ['stk', 'prohlidka', 'zvire', 'auto', 'lod', 'dum', 'zahrada', 'udrzba'];

// Výchozí hodnoty formuláře podle typu.
export const DEFAULTS = {
  narozeniny: { freq: 'yearly', remindDays: 7, dateLabel: 'Datum narození', placeholder: 'např. Jana Nováková' },
  svatek:     { freq: 'yearly', remindDays: 1, dateLabel: 'Den svátku', placeholder: 'jméno, např. Jana Nováková' },
  vyroci:     { freq: 'yearly', remindDays: 7, dateLabel: 'Datum (první rok)', placeholder: 'např. Svatba Jany a Petra' },
  doklad:     { freq: 'none', remindDays: 28, dateLabel: 'Platnost do', placeholder: 'např. Cestovní pas – Jan',
                notePlaceholder: 'číslo dokladu, kde se vyřizuje, co s sebou…' },
  stk:        { freq: 'yearly', interval: 2, remindDays: 28, dateLabel: 'Platnost STK do', placeholder: 'např. Škoda Octavia 1AB 2345',
                notePlaceholder: 'STK stanice, číslo protokolu, závady k opravě…' },
  smlouva:    { freq: 'yearly', remindDays: 14, noticeWeeks: 6, dateLabel: 'Výročí smlouvy',
                placeholder: 'např. Povinné ručení – Octavia', notePlaceholder: 'pojišťovna, číslo smlouvy, cena…' },
  dane:       { freq: 'yearly', remindDays: 14, dateLabel: 'Termín', placeholder: 'např. Daňové přiznání',
                notePlaceholder: 'kam se platí, variabilní symbol, částka…' },
  prohlidka:  { freq: 'yearly', interval: 2, remindDays: 14, dateLabel: 'Termín', placeholder: 'např. Zubař – Jan',
                notePlaceholder: 'jméno lékaře, telefon, adresa ordinace…' },
  zvire:      { freq: 'yearly', remindDays: 7, dateLabel: 'Termín', placeholder: 'např. Očkování – Rex',
                notePlaceholder: 'veterinář, telefon, přípravek…' },
  auto:       { freq: 'yearly', remindDays: 14, dateLabel: 'Termín', placeholder: 'např. Přezutí na zimní pneu – Octavia',
                notePlaceholder: 'servis, telefon, stav km…' },
  lod:        { freq: 'yearly', remindDays: 14, dateLabel: 'Termín', placeholder: 'např. Servis motoru',
                notePlaceholder: 'marina, servis, díly, telefon…' },
  dum:        { freq: 'yearly', remindDays: 14, dateLabel: 'Termín', placeholder: 'např. Servis plynového kotle',
                notePlaceholder: 'technik, telefon, číslo protokolu…' },
  zahrada:    { freq: 'yearly', remindDays: 7, dateLabel: 'Termín', placeholder: 'např. Stříhání živého plotu' },
  udrzba:     { freq: 'yearly', remindDays: 14, dateLabel: 'Termín', placeholder: 'např. Servis kola' },
  predplatne: { freq: 'monthly', remindDays: 3, dateLabel: 'Další platba', placeholder: 'např. Netflix' },
  zaruka:     { freq: 'none', remindDays: 28, dateLabel: 'Konec záruky', placeholder: 'např. Pračka Bosch' },
  jine:       { freq: 'none', remindDays: 7, dateLabel: 'Datum' },
};

// Rychlá volba. Položka: title, freq ('none'|'monthly'|'yearly'), interval, hint,
// volitelně what (druh – zobrazí se v přehledu a v názvu události), remind (dní předem),
// md: [měsíc, den] – navržené datum, notice (výpovědní lhůta v týdnech).
// { group: '…' } vloží nadpis skupiny.
const Y = (interval = 1) => ({ freq: 'yearly', interval });
const M = (interval = 1) => ({ freq: 'monthly', interval });
const ONCE = { freq: 'none', interval: 1 };

export const PRESETS = {
  doklad: [
    { title: 'Občanský průkaz', ...ONCE, hint: 'datum na dokladu' },
    { title: 'Cestovní pas', ...ONCE, hint: 'vyřízení trvá několik týdnů' },
    { title: 'Řidičský průkaz', ...ONCE, hint: 'datum na dokladu' },
    { title: 'Průkaz vůdce plavidla', ...ONCE, hint: 'datum na průkazu' },
    { title: 'Licence k radiostanici', ...ONCE, hint: 'podle oprávnění' },
    { title: 'Platební karta', ...ONCE, hint: 'měsíc/rok na kartě' },
  ],
  stk: [
    { title: 'Osobní auto', ...Y(2), hint: 'každé 2 roky' },
    { title: 'Nové auto – první STK', ...Y(4), hint: 'po 4 letech, pak každé 2 roky' },
  ],
  smlouva: [
    { group: 'Pojištění' },
    { title: 'Povinné ručení', ...Y(), notice: 6, hint: 'výpověď 6 týdnů před výročím' },
    { title: 'Havarijní pojištění', ...Y(), notice: 6, hint: 'výpověď 6 týdnů před výročím' },
    { title: 'Pojištění domácnosti', ...Y(), notice: 6, hint: 'výpověď 6 týdnů před výročím' },
    { title: 'Pojištění nemovitosti', ...Y(), notice: 6, hint: 'výpověď 6 týdnů před výročím' },
    { title: 'Pojištění plavidla', ...Y(), notice: 6, hint: 'výpověď 6 týdnů před výročím' },
    { title: 'Cestovní pojištění (roční)', ...Y(), notice: 6, hint: 'pokud se samo prodlužuje' },
    { group: 'Smlouvy a úvěry' },
    { title: 'Konec fixace hypotéky', ...ONCE, notice: 13, hint: 'připomene se 3 měsíce předem' },
    { title: 'Energie – konec fixace', ...ONCE, notice: 4, hint: 'lhůtu upravte podle smlouvy' },
    { title: 'Mobil / internet – konec závazku', ...ONCE, notice: 4, hint: 'lhůtu upravte podle smlouvy' },
    { title: 'Leasing / úvěr – konec', ...ONCE, notice: 0, hint: 'poslední splátka' },
  ],
  dane: [
    { title: 'Daňové přiznání', ...Y(), md: [4, 1], remind: 21, hint: 'papírově do 1. 4., elektronicky zhruba do 1. 5.' },
    { title: 'Daň z nemovitých věcí – platba', ...Y(), md: [5, 31], hint: 'do 31. 5.' },
    { title: 'Daň z nemovitých věcí – 2. splátka', ...Y(), md: [11, 30], hint: 'jen daň nad 5 000 Kč, do 30. 11.' },
    { title: 'Přiznání k dani z nemovitostí', ...ONCE, md: [1, 31], hint: 'jen po koupi či změně, do 31. 1.' },
    { title: 'Poplatek za psa', ...Y(), hint: 'termín podle vyhlášky obce' },
    { title: 'Poplatek za odpad', ...Y(), hint: 'termín podle vyhlášky obce' },
  ],
  prohlidka: [
    { group: 'Preventivní prohlídky' },
    { title: 'Praktický lékař', ...Y(2), what: 'preventivní prohlídka', hint: 'každé 2 roky' },
    { title: 'Zubař', ...M(6), what: 'preventivní prohlídka', hint: '2× ročně' },
    { title: 'Dentální hygiena', ...M(6), what: 'preventivní prohlídka', hint: 'doporučeno 1–2× ročně' },
    { title: 'Gynekolog', ...Y(1), what: 'preventivní prohlídka', hint: 'každý rok' },
    { title: 'Mamografie', ...Y(2), what: 'preventivní prohlídka', hint: 'ženy od 45 let, každé 2 roky' },
    { title: 'Pracovnělékařská prohlídka', ...Y(2), what: 'preventivní prohlídka', hint: 'interval podle posudku' },
    { title: 'Oční kontrola', ...Y(2), what: 'preventivní prohlídka', hint: 'doporučeno' },
    { title: 'Kožní – znaménka', ...Y(1), what: 'preventivní prohlídka', hint: 'doporučeno' },
    { group: 'Očkování' },
    { title: 'Tetanus', ...Y(15), what: 'očkování', remind: 28, hint: 'do 60 let po 10–15 letech, pak po 10' },
    { title: 'Klíšťová encefalitida', ...Y(5), what: 'očkování', remind: 28, hint: '1. přeočkování po 3 letech, pak po 5, od 60 let po 3' },
    { title: 'Chřipka', ...Y(1), md: [10, 1], what: 'očkování', hint: 'každý podzim' },
    { title: 'Cestovní očkování', ...ONCE, what: 'očkování', hint: 'podle vakcíny' },
    { group: 'Ostatní' },
    { title: 'Kontaktní čočky – výměna', ...M(1), remind: 1, hint: 'podle typu čoček' },
  ],
  zvire: [
    { title: 'Očkování proti vzteklině', ...Y(1), hint: 'podle vakcíny 1–3 roky' },
    { title: 'Kombinované očkování', ...Y(1), hint: 'podle veterináře' },
    { title: 'Odčervení', ...M(3), hint: 'obvykle 2–4× ročně' },
    { title: 'Ochrana proti klíšťatům', ...M(1), hint: 'podle přípravku' },
    { title: 'Veterinární prohlídka', ...Y(1), hint: 'každý rok' },
  ],
  auto: [
    { title: 'Přezutí na zimní pneu', ...Y(), md: [10, 15], hint: 'zimní pneu 1. 11.–31. 3. při zimních podmínkách' },
    { title: 'Přezutí na letní pneu', ...Y(), md: [4, 1], hint: 'po skončení zimy' },
    { title: 'Servisní prohlídka', ...Y(), hint: 'nebo podle km' },
    { title: 'Výměna oleje', ...Y(), hint: 'nebo podle km' },
    { title: 'Dálniční známka', ...Y(), remind: 7, hint: 'platí 365 dní od zvoleného dne' },
    { title: 'Autolékárnička – expirace', ...ONCE, hint: 'datum na lékárničce' },
    { title: 'Zimní náplň do ostřikovačů', ...Y(), md: [10, 15], hint: 'před mrazy' },
  ],
  lod: [
    { group: 'Sezóna' },
    { title: 'Odzimování a příprava na sezónu', ...Y(), md: [4, 1], hint: 'jaro' },
    { title: 'Spuštění na vodu', ...Y(), md: [4, 15], hint: 'jaro' },
    { title: 'Vytažení z vody', ...Y(), md: [10, 15], hint: 'podzim' },
    { title: 'Zazimování', ...Y(), md: [10, 31], hint: 'před mrazy' },
    { group: 'Údržba' },
    { title: 'Antifouling', ...Y(), md: [3, 31], hint: 'před spuštěním' },
    { title: 'Servis motoru', ...Y(), hint: 'nebo podle motohodin' },
    { title: 'Výměna impeleru', ...Y(), hint: 'obvykle každou sezónu' },
    { title: 'Výměna anod', ...Y(), hint: 'podle opotřebení' },
    { group: 'Bezpečnost' },
    { title: 'Servis záchranných vest', ...Y(), hint: 'automatické vesty podle výrobce' },
    { title: 'Pyrotechnika – expirace', ...ONCE, hint: 'datum na obalu' },
    { title: 'Hasicí přístroj na lodi', ...Y(), hint: 'kontrola' },
    { title: 'Revize plynu na lodi', ...Y(), hint: 'podle předpisů' },
    { title: 'Technická prohlídka plavidla', ...ONCE, remind: 28, hint: 'datum z osvědčení' },
  ],
  dum: [
    { group: 'Vytápění a revize' },
    { title: 'Servis plynového kotle', ...Y(), md: [9, 15], hint: '1× ročně, nejlépe před topnou sezónou' },
    { title: 'Kontrola a čištění komína', ...Y(), md: [9, 15], hint: 'obvykle 1× ročně (vyhl. 34/2016 Sb.)' },
    { title: 'Revize elektroinstalace', ...Y(5), remind: 28, hint: 'doporučeno, interval podle typu' },
    { title: 'Revize hromosvodu', ...Y(5), remind: 28, hint: 'doporučeno, interval podle typu' },
    { group: 'Bezpečnost' },
    { title: 'Hasicí přístroj – kontrola', ...Y(), hint: '1× ročně' },
    { title: 'Detektory kouře a CO – baterie', ...Y(), hint: 'test a výměna baterií' },
    { title: 'Domácí lékárnička – expirace léků', ...Y(), hint: 'projít jednou ročně' },
    { group: 'Údržba a odečty' },
    { title: 'Filtry rekuperace', ...M(6), hint: 'podle výrobce' },
    { title: 'Filtr digestoře', ...M(3), hint: 'podle výrobce' },
    { title: 'Odečet vodoměru a plynoměru', ...Y(), hint: 'pro vyúčtování' },
    { title: 'Vývoz septiku / žumpy', ...Y(), hint: 'podle potřeby' },
  ],
  zahrada: [
    { title: 'Servis sekačky', ...Y(), md: [3, 15], hint: 'před sezónou' },
    { title: 'Hnojení trávníku', ...Y(), md: [4, 15], hint: 'jaro' },
    { title: 'Napuštění bazénu', ...Y(), md: [5, 15], hint: 'začátek léta' },
    { title: 'Stříhání živého plotu', ...Y(), md: [6, 15], hint: 'obvykle v létě' },
    { title: 'Vypuštění a zazimování bazénu', ...Y(), md: [9, 15], hint: 'konec léta' },
    { title: 'Zazimování zahradní vody', ...Y(), md: [10, 31], hint: 'před mrazy' },
  ],
  udrzba: [
    { title: 'Servis kola', ...Y(), md: [3, 31], hint: 'před sezónou' },
    { title: 'Servis motocyklu', ...Y(), md: [3, 31], hint: 'před sezónou' },
  ],
  predplatne: [
    { title: 'Streamovací služba', ...M(1), hint: 'měsíčně' },
    { title: 'Software / aplikace', ...Y(1), hint: 'ročně' },
    { title: 'Doména', ...Y(1), remind: 14, hint: 'prodloužení' },
    { title: 'Stání v marině', ...Y(1), remind: 14, hint: 'roční poplatek' },
    { title: 'Členský příspěvek', ...Y(1), hint: 'spolek, klub' },
  ],
};

// Výchozí popis události v přehledu (když položka nemá vlastní „druh“ z rychlé volby).
export const OCCASION = {
  doklad: 'konec platnosti',
  stk: 'termín technické kontroly',
  dane: 'termín',
  zaruka: 'konec záruky',
  zvire: 'péče o zvíře',
  auto: 'auto',
  lod: 'loď',
  dum: 'domácnost',
  zahrada: 'zahrada',
  udrzba: 'údržba',
};
