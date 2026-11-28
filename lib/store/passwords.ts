import crypto from 'node:crypto';

const KEY_LENGTH = 64;

function scrypt(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) =>
    crypto.scrypt(password.normalize('NFKC'), salt, KEY_LENGTH, {N: 16384, r: 8, p: 1}, (err, key) => err ? reject(err) : resolve(key)));
}

export async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt);
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}

// Used when the email is unknown so a failed login takes the same time either way.
const DUMMY = 'scrypt$AAAAAAAAAAAAAAAAAAAAAA==$' + Buffer.alloc(KEY_LENGTH).toString('base64');

export async function verifyPassword(password: string, stored: string | undefined) {
  const [scheme, saltB64, keyB64] = (stored ?? DUMMY).split('$');
  if (scheme !== 'scrypt' || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, 'base64');
  const actual = await scrypt(password, Buffer.from(saltB64, 'base64'));
  return stored !== undefined && expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

export function newSessionToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
