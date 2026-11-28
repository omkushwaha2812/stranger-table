'use server';
import {redirect} from 'next/navigation';
import {z} from 'zod';
import {registration, email, password} from '@/lib/validation';
import {read, tx} from '@/lib/store/db';
import {AppError, createAccount, endSession, normalEmail, setPassword, startSession} from '@/lib/store/core';
import {hashPassword, hashToken, newSessionToken, verifyPassword} from '@/lib/store/passwords';
import {clearSessionCookie, requireUser, sessionToken, setSessionCookie} from '@/lib/auth';

const fail = (path: string, message: string): never => redirect(`${path}?error=${encodeURIComponent(message)}`);

// Simple in-memory brute-force guard: 10 failed logins per email per 15 minutes.
const attempts = globalThis as unknown as {__strangerTableLogins?: Map<string, number[]>};
function tooManyAttempts(key: string) {
  const map = attempts.__strangerTableLogins ??= new Map<string, number[]>();
  const recent = (map.get(key) ?? []).filter(t => t > Date.now() - 15 * 60_000);
  map.set(key, recent);
  return recent.length >= 10;
}
function recordFailure(key: string) { attempts.__strangerTableLogins?.get(key)?.push(Date.now()); }

async function signIn(userId: string) {
  const token = newSessionToken();
  tx(d => startSession(d, userId, hashToken(token)));
  await setSessionCookie(token);
}

export async function register(form: FormData) {
  const parsed = registration.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail('/register', parsed.error.issues[0].message);
  const v = parsed.data;
  const password_hash = await hashPassword(v.password);
  let userId: string | null = null;
  let error = '';
  try {
    userId = tx(d => createAccount(d, {email: v.email, password_hash, name: v.name, city: v.city, gender: v.gender}));
  } catch (e) {
    error = e instanceof AppError && e.code === 'exists' ? 'An account with this email already exists. Sign in instead.' : 'Registration failed. Try again.';
  }
  if (!userId) return fail('/register', error);
  await signIn(userId);
  redirect('/onboarding');
}

export async function login(form: FormData) {
  const parsed = z.object({email, password: z.string().min(1).max(72)}).safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail('/login', 'Enter a valid email and password');
  const key = normalEmail(parsed.data.email);
  if (tooManyAttempts(key)) return fail('/login', 'Too many attempts. Wait 15 minutes and try again.');
  const user = read(d => d.users.find(u => u.email === key));
  const ok = await verifyPassword(parsed.data.password, user?.password_hash);
  if (!ok || !user) { recordFailure(key); return fail('/login', 'Incorrect email or password.'); }
  await signIn(user.id);
  redirect('/');
}

export async function logout() {
  const token = await sessionToken();
  if (token) tx(d => endSession(d, hashToken(token)));
  await clearSessionCookie();
  redirect('/');
}

/** Change password while signed in (requires the current password). */
export async function reset(form: FormData) {
  const {user} = await requireUser();
  const parsed = z.object({current: z.string().min(1).max(72), password, confirm: password}).refine(v => v.password === v.confirm).safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail('/reset-password', 'Passwords must match and contain at least 8 characters');
  const stored = read(d => d.users.find(u => u.id === user.id)?.password_hash);
  if (!await verifyPassword(parsed.data.current, stored)) return fail('/reset-password', 'Your current password is incorrect');
  const password_hash = await hashPassword(parsed.data.password);
  const token = await sessionToken();
  tx(d => setPassword(d, user.id, password_hash, token ? hashToken(token) : undefined));
  redirect('/dashboard/settings?notice=' + encodeURIComponent('Password updated. Other devices were signed out.'));
}
