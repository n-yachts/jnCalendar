// Tenká vrstva nad Google Calendar REST API (v3) a převod položek na události.
import { TYPES } from './catalog.js?v=20261109-1745';
import { getStoredToken, clearToken } from './auth.js?v=20261109-1745';
import { addDays, toRRule, fromRRule, remindDaysToMinutes, minutesToRemindDays } from './dates.js?v=20261109-1745';

const API = 'https://www.googleapis.com/calendar/v3';
export const CALENDAR_NAME = 'jnCalendar';

export class AuthError extends Error {}

async function call(path, { method = 'GET', body, query } = {}) {
  const token = getStoredToken();
  if (!token) throw new AuthError('Přihlášení vypršelo.');
  const url = new URL(API + path);
  if (query) for (const [k, v] of Object.entries(query)) if (v !== undefined) url.searchParams.set(k, v);
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) { clearToken(); throw new AuthError('Přihlášení vypršelo.'); }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data?.error?.message || res.statusText;
    const err = new Error(`Google Calendar: ${msg}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// ---------- Kalendář ----------

/** Najde kalendář jnCalendar, ke kterému máme přístup, nebo ho založí. */
export async function ensureCalendar(knownId) {
  if (knownId && await canAccess(knownId)) return knownId;

  let pageToken;
  do {
    const list = await call('/users/me/calendarList', { query: { pageToken, minAccessRole: 'owner' } });
    for (const c of list.items || []) {
      if (c.summary === CALENDAR_NAME && await canAccess(c.id)) return c.id;
    }
    pageToken = list.nextPageToken;
  } while (pageToken);

  const created = await call('/calendars', {
    method: 'POST',
    body: {
      summary: CALENDAR_NAME,
      description: 'Narozeniny, svátky, termíny, pojistky, zdraví, údržba auta, lodi a domu – spravuje aplikace jnCalendar (https://n-yachts.github.io/jnCalendar/).',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Prague',
    },
  });
  return created.id;
}

async function canAccess(id) {
  try {
    await call(`/calendars/${encodeURIComponent(id)}/events`, { query: { maxResults: 1 } });
    return true;
  } catch (e) {
    if (e instanceof AuthError) throw e;
    return false;
  }
}

// ---------- Položky ----------

export { TYPES };

/** Datum, na které se událost v kalendáři skutečně zapisuje.
 *  U smluv s výpovědní lhůtou je to poslední den pro výpověď (výročí − lhůta). */
export function eventStartDate(item) {
  const weeks = Number(item.noticeWeeks) || 0;
  return weeks ? addDays(item.date, -7 * weeks) : item.date;
}

function eventSummary(item) {
  const t = TYPES[item.type] || TYPES.jine;
  if (item.type === 'smlouva' && Number(item.noticeWeeks) > 0) {
    const [, m, d] = item.date.split('-').map(Number);
    return `Poslední den výpovědi: ${item.title} (výročí ${d}. ${m}.)`;
  }
  const prefix = item.what ? item.what.charAt(0).toUpperCase() + item.what.slice(1) : t.prefix;
  return prefix ? `${prefix}: ${item.title}` : item.title;
}

export function itemToEvent(item) {
  const t = TYPES[item.type] || TYPES.jine;
  const summary = eventSummary(item);
  const start = eventStartDate(item);
  const lines = [];
  if (item.price) lines.push(`Cena: ${item.price} ${item.currency || 'Kč'}`);
  if (item.note) lines.push(item.note);
  lines.push('', '— spravováno aplikací jnCalendar');

  const minutes = remindDaysToMinutes(item.remindDays ?? 7);
  const overrides = [{ method: 'popup', minutes }];
  if (item.emailReminder) overrides.push({ method: 'email', minutes });

  const rrule = toRRule(item.repeat);
  return {
    summary,
    description: lines.join('\n'),
    start: { date: start },
    end: { date: addDays(start, 1) },
    colorId: t.color,
    transparency: 'transparent', // nezobrazovat jako "zaneprázdněn"
    reminders: { useDefault: false, overrides },
    recurrence: rrule ? [rrule] : [],
    extendedProperties: {
      private: {
        jnApp: '1',
        jnType: item.type,
        jnTitle: item.title,
        jnPrice: item.price ? String(item.price) : '',
        jnCurrency: item.currency || '',
        jnNote: (item.note || '').slice(0, 900), // limit hodnoty je 1024 znaků
        jnNoYear: item.noYear ? '1' : '',
        jnLastDone: item.lastDone || '',
        jnWhat: item.what || '',
        jnNotice: Number(item.noticeWeeks) ? String(Number(item.noticeWeeks)) : '',
      },
    },
  };
}

export function eventToItem(ev) {
  const p = ev.extendedProperties?.private || {};
  const popup = (ev.reminders?.overrides || []).find(o => o.method === 'popup');
  return {
    id: ev.id,
    type: p.jnType || 'jine',
    title: p.jnTitle || ev.summary || '(bez názvu)',
    // U smluv je v kalendáři poslední den výpovědi; položka nese výročí smlouvy.
    date: addDays(ev.start?.date || (ev.start?.dateTime || '').slice(0, 10), 7 * (Number(p.jnNotice) || 0)),
    repeat: fromRRule(ev.recurrence),
    remindDays: popup ? minutesToRemindDays(popup.minutes) : 0,
    emailReminder: (ev.reminders?.overrides || []).some(o => o.method === 'email'),
    price: p.jnPrice || '',
    currency: p.jnCurrency || 'Kč',
    note: p.jnNote || '',
    noYear: p.jnNoYear === '1',
    lastDone: p.jnLastDone || '',
    what: p.jnWhat || '',
    noticeWeeks: Number(p.jnNotice) || 0,
    link: ev.htmlLink,
  };
}

export async function listItems(calendarId) {
  const items = [];
  let pageToken;
  do {
    const res = await call(`/calendars/${encodeURIComponent(calendarId)}/events`, {
      query: { privateExtendedProperty: 'jnApp=1', singleEvents: 'false', maxResults: 2500, pageToken },
    });
    for (const ev of res.items || []) {
      if (ev.status === 'cancelled' || ev.recurringEventId) continue; // jen hlavní události
      items.push(eventToItem(ev));
    }
    pageToken = res.nextPageToken;
  } while (pageToken);
  return items;
}

export async function saveItem(calendarId, item) {
  const body = itemToEvent(item);
  const base = `/calendars/${encodeURIComponent(calendarId)}/events`;
  const ev = item.id
    ? await call(`${base}/${encodeURIComponent(item.id)}`, { method: 'PUT', body })
    : await call(base, { method: 'POST', body });
  return eventToItem(ev);
}

export async function deleteItem(calendarId, id) {
  await call(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ---------- Přehled: jednotlivé výskyty v kalendáři jnCalendar ----------

/**
 * Vrátí výskyty událostí z kalendáře jnCalendar v rozsahu dat [fromDate, toDate)
 * (YYYY-MM-DD), opakované události rozložené na jednotlivé dny.
 * Každý výskyt nese `masterId` – ID položky, ze které vznikl.
 */
export async function listOccurrences(calendarId, fromDate, toDate) {
  const out = [];
  let pageToken;
  // Celodenní události: hranice bereme s rezervou a přesně ořízneme podle start.date.
  const timeMin = new Date(addDays(fromDate, -1) + 'T00:00:00Z').toISOString();
  const timeMax = new Date(addDays(toDate, 1) + 'T00:00:00Z').toISOString();
  do {
    const res = await call(`/calendars/${encodeURIComponent(calendarId)}/events`, {
      query: {
        timeMin, timeMax, pageToken,
        singleEvents: 'true', orderBy: 'startTime', maxResults: 2500,
        fields: 'nextPageToken,items(id,status,summary,start,recurringEventId,htmlLink,extendedProperties)',
      },
    });
    for (const ev of res.items || []) {
      if (ev.status === 'cancelled') continue;
      const date = ev.start?.date || (ev.start?.dateTime || '').slice(0, 10);
      if (!date || date < fromDate || date >= toDate) continue;
      out.push({
        date,
        masterId: ev.recurringEventId || ev.id,
        summary: ev.summary || '(bez názvu)',
        link: ev.htmlLink,
        ownItem: ev.extendedProperties?.private?.jnApp === '1',
      });
    }
    pageToken = res.nextPageToken;
  } while (pageToken);
  return out;
}
