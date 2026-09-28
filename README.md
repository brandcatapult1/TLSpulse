# TLS Pulse

Internal shoot planning & resource tracking for The Lightscape Studio.
Spec: `../docs/handbook.html` (PDF: `../TLS Pulse - Build Handbook.pdf`). Progress: `../docs/module-status.json`.

## Run locally

Requires Node 20+ and PostgreSQL 16 on localhost.

```bash
createdb tlspulse
cp .env.example .env        # set DATABASE_URL, and SESSION_SECRET=$(openssl rand -base64 32)
npm install
npx prisma migrate dev
npm run db:seed             # writes temp logins + public link to seed-credentials.local.txt
npm run dev                 # http://localhost:3000
```

Re-running the seed wipes app data and issues new temporary passwords.
