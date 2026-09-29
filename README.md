# TLS Pulse

Internal shoot planning and resource tracking for **The Lightscape Studio**: a calendar-first
tool for scheduling Social Media Shoots and Real Time Visits, deploying crew, and tracking workload.

## Features

- **Calendar** (Mon–Sun month grid, mobile agenda): shoot cards, hover preview, “+N more”, drag & drop,
  details panel with **Cancel Shoot** / **Reschedule Shoot** (calendar + time picker).
- **Shoots**: brand, type, date/time, **Google Maps location pin**, crew, rich-text notes, status
  (Planned / Rescheduled / Cancelled — cancelling is final), audit history.
- **Crew clashes**: a person can't be booked on overlapping shoots unless it's the same brand, same
  location and the other shoot type; other overlaps only warn.
- **Masters**: Brands (filters, Admin-only add, deactivate), Resources with mobile/email, Internal/External teams, Users.
- **Reports**: Day / Week / Month / custom range; by resource, team (with shoot times), brand; unassigned shoots; CSV.
- **Public pages**: `/bookings` read-only studio calendar (Admin on/off switch) and `/crew`, where crew enter
  their mobile or email to see only their own shoots.
- **Roles**: Admin and User log in. (A Crew login role exists but is switched off: `CREW_LOGIN_ENABLED` in `src/lib/permissions.ts`.)

Stack: Next.js 15 (App Router, TypeScript), Tailwind CSS 4, Prisma 6, PostgreSQL 16, TipTap, Google Maps JS API.

## Run locally

Requires Node 20+ and PostgreSQL 16 on localhost.

```bash
createdb tlspulse
cp .env.example .env        # fill in DATABASE_URL and SESSION_SECRET (openssl rand -base64 32)
npm install
npx prisma migrate deploy
npm run db:seed             # sample month + temporary logins → seed-credentials.local.txt (gitignored)
npm run dev                 # http://localhost:3000
```

Re-running the seed wipes app data and issues new temporary passwords.

### Environment

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Signs login and crew-view cookies (long random string) |
| `APP_URL` | Base URL used in the seed output |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Optional. Enables map search/pins. Enable Maps JavaScript API, Places API (New) and Geocoding API, turn on billing, and **restrict the key by HTTP referrer**. |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | Optional Map ID for advanced markers (defaults to Google's `DEMO_MAP_ID`). |

## Checks

```bash
npm test                    # unit tests: conflicts, report counting, periods, dates
npm run lint
NEXT_DIST_DIR=.next-build npx next build   # production build without disturbing `npm run dev`
```
