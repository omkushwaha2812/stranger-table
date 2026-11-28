// Usage: npm run make-admin -- someone@example.com
// Promotes an existing account to campus admin in the local database.
import fs from 'node:fs';
import path from 'node:path';

const email = (process.argv[2] ?? '').trim().toLowerCase();
if (!email) { console.error('Usage: npm run make-admin -- <email>'); process.exit(1); }
const file = path.join(path.resolve(process.env.DATA_DIR || 'data'), 'db.json');
if (!fs.existsSync(file)) { console.error(`No database at ${file}. Start the app and register the account first.`); process.exit(1); }
const db = JSON.parse(fs.readFileSync(file, 'utf8'));
const user = db.users.find(u => u.email === email);
const profile = user && db.profiles.find(p => p.id === user.id);
if (!profile) { console.error(`No account for ${email}. Register it in the app first.`); process.exit(1); }
profile.role = 'admin';
profile.active = true;
profile.verification = 'approved';
profile.updated_at = new Date().toISOString();
fs.writeFileSync(file, JSON.stringify(db, null, 1));
console.log(`${email} is now an admin. Sign out and sign in again.`);
