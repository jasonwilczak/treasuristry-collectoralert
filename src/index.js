import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { config } from '../config.js';
import { fetchWatchedSets } from './scryfall.js';
import { getCalendarClient, upsertReleaseEvents } from './calendar.js';

const STATE_PATH = new URL('../state.json', import.meta.url).pathname;

async function loadState() {
  if (!existsSync(STATE_PATH)) {
    return { sets: {}, meta: { lastRun: null } };
  }
  const raw = await readFile(STATE_PATH, 'utf8');
  return JSON.parse(raw);
}

async function saveState(state) {
  state.meta.lastRun = new Date().toISOString();
  await writeFile(STATE_PATH, JSON.stringify(state, null, 2) + '\n', 'utf8');
}

const calendarEnabled =
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_REFRESH_TOKEN &&
  process.env.GOOGLE_CALENDAR_ID;

async function main() {
  const state = await loadState();
  const sets = await fetchWatchedSets();
  const cal = calendarEnabled ? getCalendarClient() : null;
  const today = new Date().toISOString().slice(0, 10);

  if (!calendarEnabled) {
    console.log('Calendar credentials not set — skipping calendar updates.');
  }

  for (const set of sets) {
    state.sets[set.code] = {
      name: set.name,
      released_at: set.released_at,
      set_type: set.set_type,
      seenAt: new Date().toISOString(),
    };

    if (cal && set.released_at >= today) {
      try {
        await upsertReleaseEvents(cal, set);
      } catch (err) {
        console.warn(`Calendar upsert failed for ${set.code}: ${err.message}`);
      }
    }
  }

  await saveState(state);
  console.log(`Done. Processed ${sets.length} sets.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
