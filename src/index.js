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

async function main() {
  if (!config.calendarId) {
    throw new Error('GOOGLE_CALENDAR_ID environment variable is required');
  }

  const state = await loadState();
  const sets = await fetchWatchedSets();
  const cal = getCalendarClient();
  const today = new Date().toISOString().slice(0, 10);

  for (const set of sets) {
    state.sets[set.code] = {
      name: set.name,
      released_at: set.released_at,
      set_type: set.set_type,
      seenAt: new Date().toISOString(),
    };

    // Only create/update calendar events for future-dated sets
    if (set.released_at >= today) {
      await upsertReleaseEvents(cal, set);
    }
  }

  await saveState(state);
  console.log(`Done. Processed ${sets.length} sets.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
