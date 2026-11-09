// Práce s daty bez časové zóny (formát YYYY-MM-DD).
// Všechny výpočty běží v UTC, aby je neovlivnil letní/zimní čas.

export function parseDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return { y, m, d };
}

export function formatDate({ y, m, d }) {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function todayStr() {
  const n = new Date();
  return formatDate({ y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate() });
}

function toUtc(s) {
  const { y, m, d } = parseDate(s);
  return Date.UTC(y, m - 1, d);
}

export function addDays(s, days) {
  const t = new Date(toUtc(s) + days * 86400000);
  return formatDate({ y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() });
}

export function daysBetween(from, to) {
  return Math.round((toUtc(to) - toUtc(from)) / 86400000);
}

// Přičte měsíce. Vrací null, pokud den v cílovém měsíci neexistuje
// (např. 31. v dubnu) – stejně jako pravidlo RRULE v Google kalendáři,
// které takový výskyt přeskočí.
function addMonthsStrict(s, months) {
  const { y, m, d } = parseDate(s);
  const idx = (m - 1) + months;
  const ny = y + Math.floor(idx / 12);
  const nm = ((idx % 12) + 12) % 12 + 1;
  const daysInMonth = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  if (d > daysInMonth) return null;
  return formatDate({ y: ny, m: nm, d });
}

/**
 * Najde nejbližší výskyt (>= ode dne `from`).
 * repeat: { freq: 'none' | 'monthly' | 'yearly', interval: number }
 * Vrací YYYY-MM-DD; u neopakovaných položek vrátí start i v minulosti.
 */
export function nextOccurrence(start, repeat, from = todayStr()) {
  if (!repeat || repeat.freq === 'none' || start >= from) return start;
  const stepMonths = (repeat.freq === 'yearly' ? 12 : 1) * Math.max(1, repeat.interval || 1);
  // Odhad počtu kroků, ať neprocházíme stovky let po jednom.
  const { y: sy, m: sm } = parseDate(start);
  const { y: fy, m: fm } = parseDate(from);
  const monthsDiff = (fy - sy) * 12 + (fm - sm);
  let k = Math.max(0, Math.floor(monthsDiff / stepMonths) - 1);
  for (let guard = 0; guard < 2000; guard++, k++) {
    const c = addMonthsStrict(start, k * stepMonths);
    if (c && c >= from) return c;
  }
  return start;
}

export function toRRule(repeat) {
  if (!repeat || repeat.freq === 'none') return null;
  const freq = repeat.freq === 'yearly' ? 'YEARLY' : 'MONTHLY';
  const interval = Math.max(1, repeat.interval || 1);
  return interval > 1 ? `RRULE:FREQ=${freq};INTERVAL=${interval}` : `RRULE:FREQ=${freq}`;
}

export function fromRRule(recurrence) {
  const rule = (recurrence || []).find(r => r.startsWith('RRULE:'));
  if (!rule) return { freq: 'none', interval: 1 };
  const parts = Object.fromEntries(rule.slice(6).split(';').map(p => p.split('=')));
  const freq = parts.FREQ === 'YEARLY' ? 'yearly' : parts.FREQ === 'MONTHLY' ? 'monthly' : 'none';
  return { freq, interval: Number(parts.INTERVAL || 1) };
}

// Připomínka u celodenní události se počítá od půlnoci začátku.
// "N dní předem v 9:00" = N*1440 − 540 minut. Google povoluje max. 40320 min (28 dní).
export const REMIND_HOUR = 9;
export const MAX_REMIND_DAYS = 28;

export function remindDaysToMinutes(days) {
  const n = Math.min(MAX_REMIND_DAYS, Math.max(0, Math.round(days)));
  if (n === 0) return 0; // o půlnoci v den události
  return n * 1440 - REMIND_HOUR * 60;
}

export function minutesToRemindDays(minutes) {
  if (!minutes) return 0;
  return Math.round((minutes + REMIND_HOUR * 60) / 1440);
}

export function formatCz(s) {
  const { y, m, d } = parseDate(s);
  return `${d}. ${m}. ${y}`;
}

export function relativeCz(days) {
  if (days === 0) return 'dnes';
  if (days === 1) return 'zítra';
  if (days === -1) return 'včera';
  const abs = Math.abs(days);
  const unit = abs === 1 ? 'den' : abs >= 2 && abs <= 4 ? 'dny' : 'dní';
  return days > 0 ? `za ${abs} ${unit}` : `před ${abs} ${abs === 1 ? 'dnem' : 'dny'}`;
}

/** Kolikáté výročí/narozeniny připadá na datum `next` (od roku v `start`). */
export function yearsAt(start, next) {
  return parseDate(next).y - parseDate(start).y;
}

/** Přičte měsíce; když den v cílovém měsíci neexistuje, použije poslední den měsíce. */
export function addMonths(s, months) {
  const { y, m, d } = parseDate(s);
  const idx = (m - 1) + months;
  const ny = y + Math.floor(idx / 12);
  const nm = ((idx % 12) + 12) % 12 + 1;
  const dim = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return formatDate({ y: ny, m: nm, d: Math.min(d, dim) });
}

/** Délka opakování v měsících (0 = neopakuje se). */
export function repeatMonths(repeat) {
  if (!repeat || repeat.freq === 'none') return 0;
  return (repeat.freq === 'yearly' ? 12 : 1) * Math.max(1, repeat.interval || 1);
}
