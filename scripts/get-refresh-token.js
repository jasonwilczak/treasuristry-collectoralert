// One-time helper to obtain a Google OAuth2 refresh token.
// Prerequisites:
//   1. Create a "Desktop app" OAuth 2.0 client in Google Cloud Console.
//   2. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your environment (or a .env file).
//   3. Run: node scripts/get-refresh-token.js
//   4. Open the printed URL in a browser, authorise, then paste the code back here.
//   5. Copy the printed refresh_token into your GitHub Actions secrets.

import http from 'http';
import { google } from 'googleapis';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:5858';
const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET before running this script.');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: SCOPES,
});

console.log('\nOpen this URL in your browser:\n');
console.log(authUrl);
console.log('\nWaiting for the OAuth callback on http://localhost:5858 ...\n');

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI);
  const code = url.searchParams.get('code');

  if (!code) {
    res.writeHead(400);
    res.end('Missing code parameter');
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Authorization complete. You can close this tab.');

  server.close();

  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log('\nSuccess! Add the following to your GitHub Actions secrets:\n');
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
  } catch (err) {
    console.error('Failed to exchange code for tokens:', err.message);
    process.exit(1);
  }
});

server.listen(5858);
