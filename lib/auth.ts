// Local authentication: email + password (scrypt) and an httpOnly session cookie.
// No external auth provider, no email verification, works fully offline.
import {cache} from 'react';
import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {read} from './store/db';
import {sessionUser as findSessionUser} from './store/core';
import {hashToken} from './store/passwords';

export const SESSION_COOKIE = 'st_session';
const SESSION_DAYS = 30;

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: SESSION_DAYS * 86400,
    // Plain http on a laptop or LAN needs secure=false. Set COOKIE_SECURE=true behind https.
    secure: process.env.COOKIE_SECURE === 'true'
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function sessionToken() {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

/** The signed-in user ({id, email}) or null. */
export const currentUser = cache(async function currentUser() {
  const token = await sessionToken();
  if (!token) return null;
  return read(d => findSessionUser(d, hashToken(token)));
});

export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect('/login');
  return {user};
}

export const requireProfile = cache(async function requireProfile() {
  const {user} = await requireUser();
  const profile = read(d => d.profiles.find(p => p.id === user.id));
  if (!profile) redirect('/onboarding');
  return {user, profile: {...profile}};
});

export async function requireStudent() {
  const ctx = await requireProfile();
  if (!ctx.profile.active || ctx.profile.verification !== 'approved') redirect('/onboarding');
  if (ctx.profile.role === 'admin') redirect('/admin');
  return ctx;
}

export async function requireAdmin() {
  const ctx = await requireProfile();
  if (ctx.profile.role !== 'admin' || !ctx.profile.active || ctx.profile.verification !== 'approved') redirect('/onboarding');
  return ctx;
}

/** API-route variant: returns null instead of redirecting. */
export async function apiStudent() {
  const user = await currentUser();
  if (!user) return null;
  const profile = read(d => d.profiles.find(p => p.id === user.id));
  if (!profile || !profile.active || profile.verification !== 'approved' || profile.role !== 'student') return null;
  return {user, profile};
}


