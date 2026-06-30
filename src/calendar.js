import { google } from 'googleapis';
import { config } from '../config.js';

export function getCalendarClient() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return google.calendar({ version: 'v3', auth });
}

function toDateTimeLocal(dateStr, hour) {
  // dateStr is YYYY-MM-DD; build a local-time ISO string for the given timezone
  return `${dateStr}T${String(hour).padStart(2, '0')}:00:00`;
}

function endDateTime(dateStr, hour, durationMin) {
  const totalMinutes = hour * 60 + durationMin;
  const endHour = Math.floor(totalMinutes / 60);
  const endMin = totalMinutes % 60;
  return `${dateStr}T${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}:00`;
}

function buildEventBody(set, label, emoji, extKey) {
  const dateStr = set.released_at;
  return {
    summary: `${emoji} ${set.name}`,
    description: `MTG set release — ${set.name} (${set.code.toUpperCase()})\nhttps://scryfall.com/sets/${set.code}`,
    start: {
      dateTime: toDateTimeLocal(dateStr, config.eventHour),
      timeZone: config.eventTimeZone,
    },
    end: {
      dateTime: endDateTime(dateStr, config.eventHour, config.eventDurationMin),
      timeZone: config.eventTimeZone,
    },
    transparency: 'transparent',
    reminders: {
      useDefault: false,
      overrides: [{ method: 'popup', minutes: 0 }],
    },
    extendedProperties: {
      private: { mtgWatcher: extKey },
    },
  };
}

async function findExistingEvent(cal, extKey) {
  const res = await cal.events.list({
    calendarId: config.calendarId,
    privateExtendedProperty: `mtgWatcher=${extKey}`,
    maxResults: 5,
    singleEvents: true,
  });
  return res.data.items?.[0] ?? null;
}

async function upsertEvent(cal, set, label, emoji, dateStr) {
  const extKey = `${set.code}:${label}`;
  const body = buildEventBody({ ...set, released_at: dateStr }, label, emoji, extKey);

  const existing = await findExistingEvent(cal, extKey);

  if (existing) {
    const existingDate = existing.start?.dateTime?.slice(0, 10) ?? existing.start?.date;
    if (existingDate !== dateStr) {
      await cal.events.patch({
        calendarId: config.calendarId,
        eventId: existing.id,
        requestBody: {
          start: body.start,
          end: body.end,
        },
      });
    }
    return;
  }

  await cal.events.insert({
    calendarId: config.calendarId,
    requestBody: body,
  });
}

export async function upsertReleaseEvents(cal, set) {
  const today = new Date().toISOString().slice(0, 10);
  const releaseDate = set.released_at;

  if (releaseDate >= today) {
    await upsertEvent(cal, set, 'street', '🎴', releaseDate);
  }

  if (config.createPreorderHeadsup) {
    const preorderDate = new Date(releaseDate);
    preorderDate.setDate(preorderDate.getDate() - config.preorderLeadDays);
    const preorderStr = preorderDate.toISOString().slice(0, 10);

    if (preorderStr >= today) {
      // Build a modified set object pointing at the preorder date
      const preorderSet = {
        ...set,
        released_at: preorderStr,
        name: `Pre-order: ${set.name}`,
      };
      await upsertEvent(cal, preorderSet, 'preorder', '🛒', preorderStr);
    }
  }
}
