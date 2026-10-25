# DJ TOMK Music Website

## Local run
1. Install Node.js 18 or newer.
2. Run `npm install`.
3. Set `ADMIN_PASSWORD` in your hosting environment. For local testing the fallback password is `TOMK-change-me`.
4. Run `npm start` and open http://localhost:3000.

## Render deployment
- Build command: `npm install`
- Start command: `npm start`
- Add environment variables `ADMIN_PASSWORD` (choose your own strong password) and `SESSION_SECRET` (a long random string).
- The site is served from `public/`; the admin page is at `/admin`.

## Adding music
Open `/admin`, sign in, and add an audio URL that is publicly reachable (for example, a direct MP3 URL). Render's local filesystem may be ephemeral on free services, so this starter uses external audio URLs rather than file uploads.
