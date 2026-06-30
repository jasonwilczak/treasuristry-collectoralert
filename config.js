export const config = {
  includeDigital: false,
  excludedSetTypes: ['token', 'memorabilia', 'minigame', 'promo'],
  calendarId: process.env.GOOGLE_CALENDAR_ID,
  createPreorderHeadsup: true,
  preorderLeadDays: 21,
  eventTimeZone: 'America/New_York',
  eventHour: 9,
  eventDurationMin: 30,
  scryfallSetsUrl: 'https://api.scryfall.com/sets',
  userAgent: 'mtg-release-watcher/1.0 (github.com/jasonwilczak/treasuristry-collectoralert; jason.wilczak@gmail.com)',
};
