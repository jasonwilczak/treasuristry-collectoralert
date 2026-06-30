import { config } from '../config.js';

export async function fetchWatchedSets() {
  const sets = [];
  let url = config.scryfallSetsUrl;

  while (url) {
    const res = await fetch(url, {
      headers: {
        'User-Agent': config.userAgent,
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Scryfall /sets request failed: ${res.status} ${res.statusText}`);
    }

    const body = await res.json();

    for (const set of body.data) {
      if (!set.released_at) continue;
      if (set.digital && !config.includeDigital) continue;
      if (config.excludedSetTypes.includes(set.set_type)) continue;
      sets.push(set);
    }

    url = body.has_more ? body.next_page : null;
  }

  return sets;
}
