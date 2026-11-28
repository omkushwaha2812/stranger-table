# Stranger Table

An online conversation community. Choose a table, connect with another member, and message privately after mutual acceptance. Joining never grants private chat or profile access.

## Upgrading from the local edition

Stop the old server and back up the whole data directory. Use the same DATA_DIR and .env.local when starting this version. Existing accounts keep their IDs and passwords. Active legacy invitations become online tables on first use. Unmatched time-slot requests and finished meetups remain historical records. Update city and gender in Profile → Edit preferences.

## Run it

Requires Node.js 20+ (22 recommended).

```bash
npm install
cp .env.example .env.local      # Windows: copy .env.example .env.local
npm run dev                      # http://localhost:3000
```

To let other phones/laptops on the same Wi-Fi join (e.g. 10 friends testing together):

```bash
npm run dev:lan                  # then open http://<your-computer-IP>:3000 on each device
```

For a faster, production-style run: `npm run build` then `npm run start:lan`.
(The build downloads the Inter / Playfair fonts from Google once; without internet the dev server falls back to system fonts.)

## Admin

Admins are normal accounts with the admin role. Either:

- put the email in `ADMIN_EMAILS` in `.env.local` (comma-separated) before registering / signing in, or
- after registering, run `npm run make-admin -- you@example.com`, then sign out and in again.

The admin panel (`/admin`) lets you suspend/restore members, **set a temporary password** for a student who
forgot theirs (there is no email service), and read the activity log.


Use a single Node server with persistent, writable storage. Every device must connect to that server to share tables. The JSON store rewrites the database on each transaction and is intended for small deployments.
