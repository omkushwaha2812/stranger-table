// Business rules for Stranger Table. These are TypeScript ports of the former
// Supabase SQL functions (request_match, respond_match, submit_feedback, ...),
// plus the stranger chat. Functions that change data take the mutable Data
// object handed out by tx(); read-only helpers work with read().
import crypto from 'node:crypto';
import type {Data, ID, MatchRequest, MatchRow, MatchStatus, Message, Profile} from './db';
import {CAMPUS_ID} from './db';

export class AppError extends Error {
  constructor(public code: string, message?: string) { super(message ?? code); }
}

const uuid = () => crypto.randomUUID();
const iso = (ms = Date.now()) => new Date(ms).toISOString();
const ms = (value: string) => Date.parse(value);
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const OPEN: MatchStatus[] = ['pending', 'partially_accepted'];
const REVEALED: MatchStatus[] = ['confirmed', 'completed', 'no_show'];
const ORIGINAL_SIX = ['chai', 'founder', 'deep', 'fun', 'walk', 'mystery'];

// ---------------------------------------------------------------- helpers
export function logActivity(d: Data, actor: ID | null, subject: ID | null, event: string, state: string | null = null) {
  d.counters.activity += 1;
  d.portal_activity.push({id: d.counters.activity, occurred_at: iso(), actor_id: actor, subject_id: subject, event, state});
  if (d.portal_activity.length > 5000) d.portal_activity.splice(0, d.portal_activity.length - 5000);
}

function notify(d: Data, user_id: ID, kind: string, message: string, match_id: ID | null = null, peer_id: ID | null = null) {
  d.notifications.push({id: uuid(), user_id, kind, message, match_id, peer_id, read_at: null, created_at: iso()});
}

function participants(d: Data, match_id: ID) { return d.match_participants.filter(p => p.match_id === match_id); }

function notifyMatch(d: Data, match_id: ID, kind: string, message: string) {
  for (const p of participants(d, match_id)) notify(d, p.user_id, kind, message, match_id);
}

export function profileOf(d: Data, id: ID | null | undefined) { return id ? d.profiles.find(p => p.id === id) : undefined; }

export function isAdmin(d: Data, id: ID) {
  const p = profileOf(d, id);
  return !!p && p.role === 'admin' && p.active && p.verification === 'approved';
}

export function eligible(d: Data, id: ID | null | undefined) {
  const p = profileOf(d, id);
  if (!p || !p.active || p.verification !== 'approved' || !p.onboarding_complete || p.role !== 'student') return false;
  return true;
}

export function isBlocked(d: Data, a: ID, b: ID) {
  return d.blocked_users.some(x => (x.user_id === a && x.blocked_id === b) || (x.user_id === b && x.blocked_id === a));
}

function busy(d: Data, user: ID, start: number, end: number, now = Date.now()) {
  return d.match_participants.some(p => {
    if (p.user_id !== user) return false;
    const m = d.matches.find(x => x.id === p.match_id);
    if (!m) return false;
    const live = m.status === 'confirmed' || (OPEN.includes(m.status) && ms(m.expires_at) > now);
    return live && ms(m.starts_at) < end && ms(m.ends_at) > start;
  });
}

function setOf<T>(values: T[]) { return new Set(values); }

function overlapRatio(a: Set<ID>, b: Set<ID>) {
  const union = new Set([...a, ...b]);
  if (!union.size) return 0;
  let both = 0; for (const x of a) if (b.has(x)) both++;
  return both / union.size;
}

export function compatibility(d: Data, a: ID, b: ID) {
  const pa = profileOf(d, a), pb = profileOf(d, b);
  if (!pa || !pb) return 0;
  const interests = (u: ID) => setOf(d.user_interests.filter(x => x.user_id === u).map(x => x.interest_id));
  const prefs = (u: ID) => setOf(d.user_conversation_preferences.filter(x => x.user_id === u).map(x => x.preference_id));
  const score = 50 * overlapRatio(interests(a), interests(b)) + 30 * overlapRatio(prefs(a), prefs(b))
    + (pa.department !== pb.department ? 10 : 0) + (pa.academic_year !== pb.academic_year ? 10 : 0);
  return Math.round(score * 100) / 100;
}

function invitationExpiry(d: Data, start: number) {
  return iso(Math.min(start, Date.now() + d.settings.invitation_hours * HOUR));
}

function firstLocation(d: Data, college: ID, preferred?: ID) {
  const active = d.meetup_locations.filter(l => l.college_id === college && l.active)
    .sort((x, y) => x.created_at.localeCompare(y.created_at));
  return active.find(l => l.id === preferred) ?? active[0];
}

/** Matches in which both a and b take part. */
function pairMatches(d: Data, a: ID, b: ID) {
  const mine = setOf(d.match_participants.filter(p => p.user_id === a).map(p => p.match_id));
  return d.match_participants.filter(p => p.user_id === b && mine.has(p.match_id))
    .map(p => d.matches.find(m => m.id === p.match_id)).filter((m): m is MatchRow => !!m);
}

function bothAccepted(d: Data, match_id: ID) {
  const ps = participants(d, match_id);
  return ps.length === 2 && ps.every(p => p.accepted_at);
}

// ---------------------------------------------------------------- scheduled jobs
export function expireMatches(d: Data) {
  const now = Date.now();
  for (const m of d.matches) {
    if (OPEN.includes(m.status) && ms(m.expires_at) <= now) {
      m.status = 'expired';
      notifyMatch(d, m.id, 'match_expired', 'Your table invitation expired.');
      logActivity(d, null, m.id, 'Table', 'expired');
    }
  }
  for (const r of d.match_requests) if (r.status === 'waiting' && ms(r.starts_at) <= now) r.status = 'expired';
}

/** Replaces pg_cron: expiry plus a one-time reminder within an hour of a confirmed table. */
export function runScheduledJobs(d: Data) {
  expireMatches(d);
  const now = Date.now();
  for (const m of d.matches) {
    if (m.status !== 'confirmed' || ms(m.starts_at) <= now || ms(m.starts_at) > now + HOUR) continue;
    for (const p of participants(d, m.id)) {
      if (!d.notifications.some(n => n.user_id === p.user_id && n.match_id === m.id && n.kind === 'meetup_reminder'))
        notify(d, p.user_id, 'meetup_reminder', 'Your table starts within one hour.', m.id);
    }
  }
}

export function needsJobs(d: Data) {
  const now = Date.now();
  return d.matches.some(m => (OPEN.includes(m.status) && ms(m.expires_at) <= now) ||
      (m.status === 'confirmed' && ms(m.starts_at) > now && ms(m.starts_at) <= now + HOUR &&
        participants(d, m.id).some(p => !d.notifications.some(n => n.user_id === p.user_id && n.match_id === m.id && n.kind === 'meetup_reminder'))))
    || d.match_requests.some(r => r.status === 'waiting' && ms(r.starts_at) <= now);
}

// ---------------------------------------------------------------- accounts
export function normalEmail(email: string) { return email.trim().toLowerCase(); }

export function adminEmails() {
  return new Set((process.env.ADMIN_EMAILS ?? '').split(',').map(normalEmail).filter(Boolean));
}

export function createAccount(d: Data, v: {email: string; password_hash: string; name: string; city: string; gender: string}) {
  const email = normalEmail(v.email);
  if (d.users.some(u => u.email === email)) throw new AppError('exists', 'An account with this email already exists');
  const now = iso();
  const id = uuid();
  d.users.push({id, email, password_hash: v.password_hash, created_at: now, last_sign_in_at: null});
  d.profiles.push({
    id, college_id: CAMPUS_ID, display_name: v.name.trim(), department: "", academic_year: 0, city: v.city, gender: v.gender, bio: '',
    role: adminEmails().has(email) ? 'admin' : 'student', verification: 'approved', active: true,
    adult_confirmed: false, terms_accepted: true, photo_path: null, onboarding_complete: false,
    preferred_duration: 30, meetup_mode: 'one-to-one', preferred_category: null, created_at: now, updated_at: now
  });
  logActivity(d, id, id, 'Account registered');
  return id;
}

/** Recreates a missing profile for an existing login (legacy onboarding step 0). */
export function createProfile(d: Data, me: ID, v: {name: string; city: string; gender: string}) {
  if (!d.users.some(u => u.id === me)) throw new AppError('forbidden');
  if (profileOf(d, me)) return;
  const now = iso();
  const email = d.users.find(u => u.id === me)!.email;
  d.profiles.push({
    id: me, college_id: CAMPUS_ID, display_name: v.name.trim(), department: "", academic_year: 0, city: v.city, gender: v.gender, bio: '',
    role: adminEmails().has(email) ? 'admin' : 'student', verification: 'approved', active: true, adult_confirmed: false,
    terms_accepted: true, photo_path: null, onboarding_complete: false, preferred_duration: 30, meetup_mode: 'one-to-one',
    preferred_category: null, created_at: now, updated_at: now
  });
  logActivity(d, me, me, 'Profile', 'insert');
}

export function startSession(d: Data, user_id: ID, token_hash: string) {
  const now = Date.now();
  d.sessions = d.sessions.filter(s => ms(s.expires_at) > now);
  d.sessions.push({token_hash, user_id, created_at: iso(now), expires_at: iso(now + 30 * DAY)});
  const user = d.users.find(u => u.id === user_id);
  if (user) {
    user.last_sign_in_at = iso(now);
    const profile = profileOf(d, user_id);
    if (profile && profile.role !== 'admin' && adminEmails().has(user.email)) { profile.role = 'admin'; profile.updated_at = iso(now); }
  }
  logActivity(d, user_id, user_id, 'Signed in');
}

export function sessionUser(d: Data, token_hash: string) {
  const s = d.sessions.find(x => x.token_hash === token_hash);
  if (!s || ms(s.expires_at) <= Date.now()) return null;
  const u = d.users.find(x => x.id === s.user_id);
  return u ? {id: u.id, email: u.email} : null;
}

export function endSession(d: Data, token_hash: string) {
  d.sessions = d.sessions.filter(s => s.token_hash !== token_hash);
}

export function setPassword(d: Data, user_id: ID, password_hash: string, keepSession?: string) {
  const user = d.users.find(u => u.id === user_id);
  if (!user) throw new AppError('not_found');
  user.password_hash = password_hash;
  d.sessions = d.sessions.filter(s => s.user_id !== user_id || s.token_hash === keepSession);
  logActivity(d, user_id, user_id, 'Password', 'changed');
}

// ---------------------------------------------------------------- onboarding
export function getDraft(d: Data, me: ID) {
  return (d.onboarding_drafts.find(x => x.user_id === me)?.data ?? {}) as Record<string, unknown>;
}

export function saveDraft(d: Data, me: ID, data: Record<string, unknown>) {
  if (JSON.stringify(data).length > 16000) throw new AppError('draft_too_large');
  const row = d.onboarding_drafts.find(x => x.user_id === me);
  if (row) { row.data = data; row.updated_at = iso(); } else d.onboarding_drafts.push({user_id: me, data, updated_at: iso()});
  logActivity(d, me, me, 'Matching preferences', row ? 'update' : 'insert');
}

export function saveOnboarding(d: Data, me: ID, v: {
  name: string; bio: string; city: string; gender: string; interests: ID[]; preferences: ID[];
  category: ID; duration: number; mode: 'one-to-one' | 'group'; slots: {weekday: number; start_time: string; end_time: string}[];
}) {
  const p = profileOf(d, me);
  if (!p || !p.active) throw new AppError('forbidden');
  if (!v.interests.length || !v.preferences.length || v.slots.length > 70) throw new AppError('incomplete');
  const interestIds = setOf(d.interests.map(x => x.id)), prefIds = setOf(d.conversation_preferences.map(x => x.id));
  if (!v.interests.every(x => interestIds.has(x)) || !v.preferences.every(x => prefIds.has(x))) throw new AppError('invalid_selection');
  const wasComplete = p.onboarding_complete;
  Object.assign(p, {display_name: v.name, bio: v.bio, city: v.city, gender: v.gender, preferred_category: v.category,
    preferred_duration: v.duration, meetup_mode: v.mode, onboarding_complete: true, updated_at: iso()});
  d.user_interests = d.user_interests.filter(x => x.user_id !== me).concat([...new Set(v.interests)].map(interest_id => ({user_id: me, interest_id})));
  d.user_conversation_preferences = d.user_conversation_preferences.filter(x => x.user_id !== me)
    .concat([...new Set(v.preferences)].map(preference_id => ({user_id: me, preference_id})));
  d.availability_slots = d.availability_slots.filter(x => x.user_id !== me).concat(v.slots.map(s => ({user_id: me, ...s})));
  logActivity(d, me, me, 'Profile', wasComplete ? 'updated' : 'preferences completed');
}

export function setAvatar(d: Data, me: ID, path: string | null) {
  const p = profileOf(d, me);
  if (!p || !p.active) throw new AppError('forbidden');
  if (path !== null && path.split('/')[0] !== me) throw new AppError('invalid_avatar');
  const previous = p.photo_path;
  p.photo_path = path; p.updated_at = iso();
  return previous;
}

export function canViewAvatar(d: Data, me: ID, path: string) {
  if (path.split('/')[0] === me) return true;
  if (!eligible(d, me)) return false;
  const owner = d.profiles.find(p => p.photo_path === path);
  if (!owner || !eligible(d, owner.id) || isBlocked(d, me, owner.id)) return false;
  return canChat(d, me, owner.id);
}

// ---------------------------------------------------------------- matching
export type MatchView = {
  id: ID; status: MatchStatus; category: string; starts_at: string; ends_at: string; expires_at: string; location: string;
  accepted: boolean; stranger_id: string; common_interests: string[];
  profile: {id: ID; display_name: string; photo_path: string | null; department: string; academic_year: number; bio: string} | null;
};

export function myMatches(d: Data, me: ID): MatchView[] {
  if (!eligible(d, me)) throw new AppError('not_eligible', 'Approved student required');
  const now = Date.now();
  const names = new Map(d.interests.map(i => [i.id, i.name]));
  const mineInterests = setOf(d.user_interests.filter(x => x.user_id === me).map(x => x.interest_id));
  const views: MatchView[] = [];
  for (const a of d.match_participants.filter(p => p.user_id === me)) {
    const m = d.matches.find(x => x.id === a.match_id);
    const b = m && d.match_participants.find(p => p.match_id === m.id && p.user_id !== me);
    const peer = b && profileOf(d, b.user_id);
    if (!m || !b || !peer) continue;
    const reveal = REVEALED.includes(m.status) && !!a.accepted_at && !!b.accepted_at && !isBlocked(d, me, b.user_id);
    views.push({
      id: m.id,
      status: OPEN.includes(m.status) && ms(m.expires_at) <= now ? 'expired' : m.status,
      category: d.table_categories.find(c => c.id === m.category_id)?.name ?? 'Table',
      starts_at: m.starts_at, ends_at: m.ends_at, expires_at: m.expires_at,
      location: d.meetup_locations.find(l => l.id === m.location_id)?.name ?? 'Campus location',
      accepted: !!a.accepted_at, stranger_id: m.id.slice(0, 8),
      common_interests: d.user_interests.filter(x => x.user_id === b.user_id && mineInterests.has(x.interest_id)).map(x => names.get(x.interest_id) ?? ''),
      profile: reveal ? {id: peer.id, display_name: peer.display_name, photo_path: peer.photo_path, department: peer.department, academic_year: peer.academic_year, bio: peer.bio} : null
    });
  }
  return views.sort((x, y) => y.starts_at.localeCompare(x.starts_at));
}

export function waitingRequests(d: Data, me: ID) {
  const now = Date.now();
  return d.match_requests.filter(r => r.user_id === me && r.status === 'waiting' && ms(r.starts_at) > now)
    .map(r => ({...r, category: d.table_categories.find(c => c.id === r.category_id)?.name ?? 'Table'}));
}

/** Anonymous list of slots other students are waiting in, so a second student can join with identical choices. */
export function openSlots(d: Data, me: ID) {
  const now = Date.now();
  const slots = new Map<string, {category_id: ID; category: string; starts_at: string; duration: number; mode: 'interest' | 'mystery'; waiting: number}>();
  for (const r of d.match_requests) {
    if (r.status !== 'waiting' || r.user_id === me || ms(r.starts_at) <= now || !eligible(d, r.user_id) || isBlocked(d, me, r.user_id)) continue;
    const duration = Math.round((ms(r.ends_at) - ms(r.starts_at)) / 60000);
    const key = [r.category_id, r.starts_at, duration, r.mode].join('|');
    const slot = slots.get(key);
    if (slot) slot.waiting++;
    else slots.set(key, {category_id: r.category_id, category: d.table_categories.find(c => c.id === r.category_id)?.name ?? 'Table', starts_at: r.starts_at, duration, mode: r.mode, waiting: 1});
  }
  return [...slots.values()].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

export function requestMatch(d: Data, me: ID, v: {category: ID; start: string; duration: number; mode: 'interest' | 'mystery'}) {
  expireMatches(d);
  if (!eligible(d, me)) throw new AppError('not_eligible');
  const now = Date.now();
  const start = ms(v.start);
  if (!Number.isFinite(start) || start <= now || start > now + 30 * DAY || ![15, 30, 45, 60].includes(v.duration) || !['interest', 'mystery'].includes(v.mode))
    throw new AppError('invalid');
  if (!d.table_categories.some(c => c.id === v.category && c.active && !c.is_group)) throw new AppError('invalid');
  if (d.match_requests.some(r => r.user_id === me && r.status === 'waiting')) throw new AppError('waiting');
  if (d.match_requests.filter(r => r.user_id === me && ms(r.created_at) > now - HOUR).length >= 10) throw new AppError('limit');
  const college = profileOf(d, me)!.college_id;
  const finish = start + v.duration * 60000;
  if (busy(d, me, start, finish)) throw new AppError('busy');
  const location = firstLocation(d, college);
  if (!location) throw new AppError('location');

  const request: MatchRequest = {id: uuid(), user_id: me, category_id: v.category, starts_at: iso(start), ends_at: iso(finish), mode: v.mode, status: 'waiting', created_at: iso()};
  d.match_requests.push(request);
  logActivity(d, me, me, 'Table request', 'waiting');

  const metBefore = (other: ID) => pairMatches(d, me, other).length > 0;
  const candidates = d.match_requests.filter(r => r.status === 'waiting' && r.user_id !== me && profileOf(d, r.user_id)?.college_id === college
      && r.category_id === v.category && r.mode === v.mode && ms(r.starts_at) === start && ms(r.ends_at) === finish
      && eligible(d, r.user_id) && !isBlocked(d, me, r.user_id) && !busy(d, r.user_id, start, finish))
    .map(r => ({r, met: metBefore(r.user_id), score: v.mode === 'interest' ? compatibility(d, me, r.user_id) : 0, luck: Math.random()}))
    .sort((x, y) => Number(x.met) - Number(y.met) || y.score - x.score || (v.mode === 'mystery' ? x.luck - y.luck : 0) || x.r.created_at.localeCompare(y.r.created_at));
  const pick = candidates[0];
  let matchId: ID | null = null;
  if (pick) {
    matchId = uuid();
    d.matches.push({id: matchId, college_id: college, category_id: v.category, location_id: location.id, starts_at: iso(start), ends_at: iso(finish),
      expires_at: invitationExpiry(d, start), status: 'pending', score: v.mode === 'interest' ? pick.score : null, created_at: iso()});
    d.match_participants.push({match_id: matchId, user_id: me, request_id: request.id, accepted_at: null},
      {match_id: matchId, user_id: pick.r.user_id, request_id: pick.r.id, accepted_at: null});
    request.status = 'matched'; pick.r.status = 'matched';
    notifyMatch(d, matchId, 'new_match', 'A stranger is waiting at your table. Accept to reveal names and open the chat.');
    logActivity(d, me, matchId, 'Table', 'pending');
  }
  return {requestId: request.id, matchId};
}

export function cancelRequest(d: Data, me: ID, id: ID) {
  const r = d.match_requests.find(x => x.id === id && x.user_id === me && x.status === 'waiting');
  if (!r) throw new AppError('no_request');
  r.status = 'cancelled';
  logActivity(d, me, me, 'Table request', 'cancelled');
}

export function respondMatch(d: Data, me: ID, id: ID, accept: boolean) {
  expireMatches(d);
  const m = d.matches.find(x => x.id === id);
  const mine = d.match_participants.find(p => p.match_id === id && p.user_id === me);
  if (!m || !mine) throw new AppError('forbidden');
  if (m.status === 'expired') return 'expired';
  if (!OPEN.includes(m.status)) throw new AppError('invalid_transition');
  const other = d.match_participants.find(p => p.match_id === id && p.user_id !== me);
  if (!other || !eligible(d, me) || !eligible(d, other.user_id) || isBlocked(d, me, other.user_id)) throw new AppError('ineligible');
  let result: MatchStatus;
  if (!accept) result = 'declined';
  else {
    mine.accepted_at ??= iso();
    result = participants(d, id).filter(p => p.accepted_at).length === 2 ? 'confirmed' : 'partially_accepted';
  }
  m.status = result;
  logActivity(d, me, id, 'Invitation', 'responded');
  notifyMatch(d, id, 'match_' + result, result === 'confirmed'
    ? 'Your table is confirmed. Names are revealed and you can now chat with each other.'
    : result === 'declined' ? 'A table invitation was declined.' : 'One student accepted. Waiting for the other response.');
  return result;
}

export function cancelMatch(d: Data, me: ID, id: ID) {
  const m = d.matches.find(x => x.id === id);
  if (!m || !['pending', 'partially_accepted', 'confirmed'].includes(m.status) || ms(m.starts_at) <= Date.now()
    || !d.match_participants.some(p => p.match_id === id && p.user_id === me)) throw new AppError('cannot_cancel');
  m.status = 'cancelled';
  notifyMatch(d, id, 'match_cancelled', 'Your table was cancelled.');
  logActivity(d, me, id, 'Table', 'cancelled');
}

export function blockStudent(d: Data, me: ID, target: ID) {
  if (target === me || !(canChat(d, me, target) || d.rooms.some(r=>r.members.includes(me) && r.members.includes(target)))) throw new AppError('forbidden');
  const connected=canChat(d,me,target);
  const pair=threadKey(me,target);
  d.requests=d.requests.filter(r=>threadKey(r.sender,r.recipient)!==pair);
  d.notifications=d.notifications.filter(n=>!n.peer_id || threadKey(n.user_id,n.peer_id)!==pair);
  if (!d.blocked_users.some(b => b.user_id === me && b.blocked_id === target)) d.blocked_users.push({user_id: me, blocked_id: target, knownName:connected?profileOf(d,target)?.display_name:undefined, hadChat:connected, created_at: iso()});
  d.connections = d.connections.filter(c => !((c.user_a === me && c.user_b === target) || (c.user_b === me && c.user_a === target)));
  for (const m of pairMatches(d, me, target)) {
    if (['pending', 'partially_accepted', 'confirmed'].includes(m.status)) { m.status = 'cancelled'; notifyMatch(d, m.id, 'match_cancelled', 'Your table was cancelled.'); }
  }
  logActivity(d, me, me, 'Student block', 'insert');
}

export function reportMatch(d: Data, me: ID, match: ID, category: string, details: string) {
  if (!d.rooms.some(r=>r.id===match && r.members.includes(me)) && !d.match_participants.some(p => p.match_id === match && p.user_id === me)) throw new AppError('forbidden');
  if (d.reports.filter(r => r.reporter_id === me && ms(r.created_at) > Date.now() - HOUR).length >= 5) throw new AppError('limit');
  const other = d.match_participants.find(p => p.match_id === match && p.user_id !== me)?.user_id ?? null;
  d.reports.push({id: uuid(), reporter_id: me, reported_id: other, match_id: match, category, details, status: 'open', created_at: iso()});
  logActivity(d, me, me, 'Safety report', 'open');
}

// ---------------------------------------------------------------- after the meetup
export function myFeedback(d: Data, me: ID, match: ID) { return d.meetup_feedback.find(f => f.match_id === match && f.user_id === me) ?? null; }
export function myVote(d: Data, me: ID, match: ID) { return d.connection_votes.find(v => v.match_id === match && v.user_id === me) ?? null; }

function refreshAchievements(d: Data, user: ID) {
  const history: {department: string; slug: string}[] = [];
  for (const a of d.match_participants.filter(p => p.user_id === user)) {
    const m = d.matches.find(x => x.id === a.match_id && x.status === 'completed');
    const b = m && d.match_participants.find(p => p.match_id === m.id && p.user_id !== user);
    const peer = b && profileOf(d, b.user_id);
    const cat = m && d.table_categories.find(c => c.id === m.category_id);
    if (peer && cat) history.push({department: peer.department.trim().toLowerCase(), slug: cat.slug});
  }
  for(const room of d.rooms.filter(r=>r.replies.some(reply=>reply.author===user) || d.connections.some(c=>c.match_id===r.id && (c.user_a===user || c.user_b===user)))) {
    const slug=d.table_categories.find(c=>c.id===room.category)?.slug??'';
    history.push({department:'',slug});
  }
  const total = history.length;
  const departments = new Set([...history.map(h => h.department), ...myConnections(d,user).map(c=>profileOf(d,c.student_id)?.city?.trim().toLowerCase())].filter(Boolean)).size;
  const categories = new Set(history.map(h => h.slug).filter(s => ORIGINAL_SIX.includes(s))).size;
  const chai = history.filter(h => h.slug === 'chai').length;
  return {total, departments, categories, chai};
}

const GOALS: Record<string, {metric: 'completed' | 'departments' | 'categories' | 'chai'; target: number}> = {
  'first-hello': {metric: 'completed', target: 1}, 'social-butterfly': {metric: 'completed', target: 5},
  'beyond-borders': {metric: 'departments', target: 3}, 'chai-enthusiast': {metric: 'chai', target: 5},
  'explorer': {metric: 'categories', target: 6}, 'campus-connector': {metric: 'completed', target: 20}
};

function awardAchievements(d: Data, user: ID) {
  const t = refreshAchievements(d, user);
  const value = {completed: t.total, departments: t.departments, categories: t.categories, chai: t.chai};
  for (const a of d.achievements) {
    const goal = GOALS[a.slug];
    if (!goal || value[goal.metric] < goal.target || d.user_achievements.some(u => u.user_id === user && u.achievement_id === a.id)) continue;
    d.user_achievements.push({user_id: user, achievement_id: a.id, created_at: iso()});
    notify(d, user, 'achievement_unlocked', 'You earned ' + a.name);
  }
}

export function myPassport(d: Data, me: ID) {
  const t = refreshAchievements(d, me);
  const value = {completed: t.total, departments: t.departments, categories: t.categories, chai: t.chai};
  const badges = d.achievements.filter(a => GOALS[a.slug]).map(a => ({
    slug: a.slug, name: a.name, description: a.description, target: GOALS[a.slug].target, progress: value[GOALS[a.slug].metric],
    earned: d.user_achievements.some(u => u.user_id === me && u.achievement_id === a.id)
  })).sort((x, y) => x.target - y.target || x.name.localeCompare(y.name));
  return {completed: t.total, departments: t.departments, categories: t.categories, badges};
}

export function submitFeedback(d: Data, me: ID, match: ID, v: {happened: boolean; experience: number | null; comfortable: boolean | null; again: boolean | null; note: string}) {
  const m = d.matches.find(x => x.id === match);
  if (!eligible(d, me) || !m || !d.match_participants.some(p => p.match_id === match && p.user_id === me)
    || !REVEALED.includes(m.status) || ms(m.ends_at) > Date.now()) throw new AppError('unavailable');
  if (myFeedback(d, me, match)) return;
  if (m.status !== 'confirmed') throw new AppError('closed');
  if (v.happened && (v.experience === null || v.comfortable === null || v.again === null)) throw new AppError('incomplete');
  d.meetup_feedback.push({id: uuid(), match_id: match, user_id: me, happened: v.happened, experience: v.experience, comfortable: v.comfortable,
    meet_again: v.again, private_feedback: v.note ?? '', created_at: iso()});
  logActivity(d, me, me, 'Meetup feedback', 'insert');
  const responses = d.meetup_feedback.filter(f => f.match_id === match);
  if (responses.length !== 2) return;
  const attended = responses.filter(f => f.happened).length;
  if (attended === 2) {
    m.status = 'completed';
    for (const p of participants(d, match)) awardAchievements(d, p.user_id);
    notifyMatch(d, match, 'match_completed', 'Your table is complete. Open it to choose whether to stay connected.');
  } else if (attended === 0) m.status = 'no_show';
  else logActivity(d, null, match, 'Attendance review', 'Conflicting confirmations');
}

export function voteConnection(d: Data, me: ID, match: ID, yes: boolean) {
  const m = d.matches.find(x => x.id === match && x.status === 'completed');
  const peer = m && d.match_participants.find(p => p.match_id === match && p.user_id !== me && d.match_participants.some(q => q.match_id === match && q.user_id === me))?.user_id;
  if (!peer || !eligible(d, me) || !eligible(d, peer) || isBlocked(d, me, peer)) throw new AppError('unavailable');
  if (!myVote(d, me, match)) d.connection_votes.push({match_id: match, user_id: me, interested: yes});
  if (d.connection_votes.filter(v => v.match_id === match && v.interested).length === 2) {
    const [a, b] = [me, peer].sort();
    if (!d.connections.some(c => c.user_a === a && c.user_b === b)) {
      d.connections.push({id: uuid(), user_a: a, user_b: b, match_id: match, contact_text_a: null, contact_text_b: null, last_invited_at: null, created_at: iso()});
      notifyMatch(d, match, 'new_connection', 'You both chose a second table. Open Connections.');
      logActivity(d, me, match, 'Connection', 'insert');
    }
  }
}

function visibleConnections(d: Data, me: ID) {
  return d.connections.filter(c => (c.user_a === me || c.user_b === me) && eligible(d, c.user_a) && eligible(d, c.user_b) && !isBlocked(d, c.user_a, c.user_b));
}

export function myConnections(d: Data, me: ID) {
  return visibleConnections(d, me).sort((x, y) => y.created_at.localeCompare(x.created_at)).map(c => {
    const mineA = c.user_a === me;
    const p = profileOf(d, mineA ? c.user_b : c.user_a)!;
    return {id: c.id, student_id: p.id, display_name: p.display_name, department: p.department, academic_year: p.academic_year, bio: p.bio,
      photo_path: p.photo_path, my_contact: mineA ? c.contact_text_a : c.contact_text_b,
      shared_contact: c.contact_text_a && c.contact_text_b ? (mineA ? c.contact_text_b : c.contact_text_a) : null};
  });
}

export function setConnectionContact(d: Data, me: ID, id: ID, contact: string) {
  const c = visibleConnections(d, me).find(x => x.id === id);
  if (!c) throw new AppError('unavailable');
  const value = contact.trim().slice(0, 120) || null;
  if (c.user_a === me) c.contact_text_a = value; else c.contact_text_b = value;
}

export function inviteConnection(d: Data, me: ID, id: ID, startIso: string) {
  expireMatches(d);
  const c = visibleConnections(d, me).find(x => x.id === id);
  if (!c) throw new AppError('unavailable');
  const pa = profileOf(d, c.user_a)!, pb = profileOf(d, c.user_b)!;
  const previous = d.matches.find(m => m.id === c.match_id);
  if (pa.college_id !== pb.college_id || !previous || !d.table_categories.some(t => t.id === previous.category_id && t.active && !t.is_group)) throw new AppError('unavailable');
  const now = Date.now();
  const start = ms(startIso);
  if (!Number.isFinite(start) || start <= now || start > now + 30 * DAY || (c.last_invited_at && ms(c.last_invited_at) > now - HOUR)) throw new AppError('time');
  const finish = start + (ms(previous.ends_at) - ms(previous.starts_at));
  if (busy(d, c.user_a, start, finish) || busy(d, c.user_b, start, finish)
    || pairMatches(d, c.user_a, c.user_b).some(m => OPEN.includes(m.status) && ms(m.expires_at) > now)) throw new AppError('time');
  const location = firstLocation(d, pa.college_id, previous.location_id);
  if (!location) throw new AppError('location');
  const matchId = uuid();
  d.matches.push({id: matchId, college_id: pa.college_id, category_id: previous.category_id, location_id: location.id, starts_at: iso(start), ends_at: iso(finish),
    expires_at: invitationExpiry(d, start), status: 'partially_accepted', score: null, created_at: iso()});
  d.match_participants.push({match_id: matchId, user_id: c.user_a, request_id: null, accepted_at: c.user_a === me ? iso() : null},
    {match_id: matchId, user_id: c.user_b, request_id: null, accepted_at: c.user_b === me ? iso() : null});
  c.last_invited_at = iso();
  notifyMatch(d, matchId, 'new_match', 'A second table has been proposed. Open My Tables for details.');
  logActivity(d, me, matchId, 'Table', 'partially_accepted');
  return matchId;
}

// ---------------------------------------------------------------- cards & notifications
export function setFavourite(d: Data, me: ID, card: ID, save: boolean) {
  if (!profileOf(d, me)?.active) throw new AppError('forbidden');
  const has = d.favourite_cards.some(f => f.user_id === me && f.card_id === card);
  if (save && !has && d.conversation_cards.some(c => c.id === card && c.active)) d.favourite_cards.push({user_id: me, card_id: card});
  if (!save) d.favourite_cards = d.favourite_cards.filter(f => !(f.user_id === me && f.card_id === card));
}

export function readNotification(d: Data, me: ID, id: ID | null) {
  const now = iso();
  for (const n of d.notifications) if (n.user_id === me && (id === null || n.id === id)) n.read_at ??= now;
}

export function myNotifications(d: Data, me: ID, opts: {unreadOnly?: boolean; offset?: number; limit?: number} = {}) {
  return d.notifications.filter(n => n.user_id === me && (!opts.unreadOnly || !n.read_at))
    .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id))
    .slice(opts.offset ?? 0, (opts.offset ?? 0) + (opts.limit ?? 20));
}

export function unreadNotifications(d: Data, me: ID) { return d.notifications.filter(n => n.user_id === me && !n.read_at).length; }

export function publicStats(d: Data) {
  return {completed_meetups: d.rooms.length,
    active_categories: d.table_categories.filter(c => c.active).length,
    conversation_cards: d.conversation_cards.filter(c => c.active).length};
}

// ---------------------------------------------------------------- admin
function audit(d: Data, admin: ID, action: string, target: ID | null, details: Record<string, unknown> = {}) {
  d.admin_audit_logs.push({id: uuid(), admin_id: admin, action, target_id: target, details, created_at: iso()});
}

export function adminStudent(d: Data, admin: ID, user: ID, verification: 'approved' | 'pending' | 'rejected', active: boolean) {
  if (!isAdmin(d, admin)) throw new AppError('forbidden');
  const p = profileOf(d, user);
  if (!p || p.role !== 'student') throw new AppError('not_found');
  const wasActive = p.active;
  p.verification = verification; p.active = active; p.updated_at = iso();
  audit(d, admin, 'student_status', user, {verification, active});
  logActivity(d, admin, user, 'Profile', wasActive === active ? 'updated' : active ? 'restored' : 'suspended');
  if (!active || verification !== 'approved') {
    for (const r of d.match_requests) if (r.user_id === user && r.status === 'waiting') r.status = 'cancelled';
    for (const m of d.matches) {
      if (['pending', 'partially_accepted', 'confirmed'].includes(m.status) && ms(m.starts_at) > Date.now() && d.match_participants.some(x => x.match_id === m.id && x.user_id === user)) {
        m.status = 'cancelled';
        notifyMatch(d, m.id, 'match_cancelled', 'Your table was cancelled.');
      }
    }
  }
}

export function adminResetPassword(d: Data, admin: ID, user: ID, password_hash: string) {
  if (!isAdmin(d, admin)) throw new AppError('forbidden');
  setPassword(d, user, password_hash);
  audit(d, admin, 'password_reset', user);
}

export function adminSaveLocation(d: Data, admin: ID, v: {id: ID | null; name: string; description: string; active: boolean}) {
  if (!isAdmin(d, admin)) throw new AppError('forbidden');
  const name = v.name.trim(), description = v.description.trim();
  if (name.length < 2 || name.length > 100 || description.length > 500) throw new AppError('invalid');
  const college = profileOf(d, admin)!.college_id;
  if (d.meetup_locations.some(l => l.college_id === college && l.name.toLowerCase() === name.toLowerCase() && l.id !== v.id)) throw new AppError('duplicate');
  let location;
  if (!v.id) {
    location = {id: uuid(), college_id: college, name, description, active: v.active, created_at: iso()};
    d.meetup_locations.push(location);
  } else {
    location = d.meetup_locations.find(l => l.id === v.id && l.college_id === college);
    if (!location) throw new AppError('not_found');
    Object.assign(location, {name, description, active: v.active});
  }
  if (!v.active) {
    for (const m of d.matches) {
      if (m.location_id === location.id && ['pending', 'partially_accepted', 'confirmed'].includes(m.status) && ms(m.starts_at) > Date.now()) {
        m.status = 'cancelled';
        notifyMatch(d, m.id, 'match_cancelled', 'Your approved location is unavailable. Request a new table.');
      }
    }
  }
  logActivity(d, admin, location.id, 'Meetup location', v.id ? 'update' : 'insert');
  return location.id;
}

// ---------------------------------------------------------------- stranger chat
// One conversation per pair of students. It opens once both have accepted a
// table (names are revealed at that point) and stays available for completed
// tables and mutual connections. Blocking or suspension closes it.
export const MESSAGE_MAX = 1000;

export function threadKey(a: ID, b: ID) { return [a, b].sort().join(':'); }

export function canChat(d: Data, me: ID, peer: ID) {
  if (me === peer || !eligible(d, me) || !eligible(d, peer) || isBlocked(d, me, peer)) return false;
  const [a, b] = [me, peer].sort();
  return d.connections.some(c => c.user_a === a && c.user_b === b);
}

function lastRead(d: Data, me: ID, thread: string) { return d.chat_reads.find(r => r.thread === thread && r.user_id === me)?.last_seq ?? 0; }

export type ChatMessage = {id: ID; seq: number; mine: boolean; body: string; created_at: string};
const view = (me: ID) => (m: Message): ChatMessage => ({id: m.id, seq: m.seq, mine: m.sender_id === me, body: m.body, created_at: m.created_at});

export function chatPeer(d: Data, me: ID, peer: ID) {
  if (!canChat(d, me, peer)) return null;
  const p = profileOf(d, peer)!;
  return {id: p.id, display_name: p.display_name, department: p.department, academic_year: p.academic_year, photo_path: p.photo_path};
}

export function chatMessages(d: Data, me: ID, peer: ID, afterSeq = 0, limit = 200) {
  if (!canChat(d, me, peer)) throw new AppError('chat_unavailable');
  const thread = threadKey(me, peer);
  const rows = d.messages.filter(m => m.thread === thread && m.seq > afterSeq);
  return rows.slice(-limit).map(view(me));
}

/** Marks everything up to the newest message as read. Returns true when something changed. */
export function markChatRead(d: Data, me: ID, peer: ID) {
  const thread = threadKey(me, peer);
  const newest = d.messages.filter(m => m.thread === thread).reduce((max, m) => Math.max(max, m.seq), 0);
  const row = d.chat_reads.find(r => r.thread === thread && r.user_id === me);
  if ((row?.last_seq ?? 0) >= newest) return false;
  if (row) row.last_seq = newest; else d.chat_reads.push({thread, user_id: me, last_seq: newest});
  for (const n of d.notifications) if (n.user_id === me && n.kind === 'new_message' && n.peer_id === peer) n.read_at ??= iso();
  return true;
}

export function hasUnreadFrom(d: Data, me: ID, peer: ID) {
  const thread = threadKey(me, peer);
  const seen = lastRead(d, me, thread);
  return d.messages.some(m => m.thread === thread && m.sender_id === peer && m.seq > seen);
}

export function sendMessage(d: Data, me: ID, peer: ID, body: string) {
  if (!canChat(d, me, peer)) throw new AppError('chat_unavailable');
  const text = body.replace(/\r\n/g, '\n').trim();
  if (!text || text.length > MESSAGE_MAX) throw new AppError('invalid_message');
  const now = Date.now();
  if (d.messages.filter(m => m.sender_id === me && ms(m.created_at) > now - 60000).length >= 30) throw new AppError('slow_down');
  const thread = threadKey(me, peer);
  const peerHadUnread = hasUnreadFrom(d, peer, me);
  d.counters.message += 1;
  const message: Message = {id: uuid(), seq: d.counters.message, thread, sender_id: me, body: text, created_at: iso(now)};
  d.messages.push(message);
  // Sender has obviously read the thread up to their own message.
  const row = d.chat_reads.find(r => r.thread === thread && r.user_id === me);
  if (row) row.last_seq = message.seq; else d.chat_reads.push({thread, user_id: me, last_seq: message.seq});
  // One inbox notification per unread burst, not one per message.
  if (!peerHadUnread) notify(d, peer, 'new_message', `${profileOf(d, me)!.display_name} sent you a message.`, null, me);
  logActivity(d, me, peer, 'Chat message', 'sent');
  return view(me)(message);
}

export function maskedThread(d:Data,me:ID,peer:ID) {
  const key=threadKey(me,peer);
  return isBlocked(d,me,peer) && (d.messages.some(m=>m.thread===key) || d.blocked_users.some(b=>b.hadChat && threadKey(b.user_id,b.blocked_id)===key));
}

export function chatThreads(d: Data, me: ID) {
  const peers = new Set<ID>();
  for (const p of d.match_participants) {
    if (p.user_id !== me) continue;
    const other = d.match_participants.find(q => q.match_id === p.match_id && q.user_id !== me);
    if (other) peers.add(other.user_id);
  }
  for (const c of d.connections) if (c.user_a === me) peers.add(c.user_b); else if (c.user_b === me) peers.add(c.user_a);
  for(const b of d.blocked_users){
    if(b.user_id===me)peers.add(b.blocked_id);
    if(b.blocked_id===me)peers.add(b.user_id);
  }
  const threads = [];
  for (const peer of peers) {
    if(maskedThread(d,me,peer)){
      threads.push({masked:true,peer:{id:peer,display_name:'Account not found',photo_path:null}, last:{body:'Account not found',mine:false,seq:0,created_at:d.blocked_users.find(b=>threadKey(b.user_id,b.blocked_id)===threadKey(me,peer))!.created_at},unread:0});
      continue;
    }
    const info = chatPeer(d, me, peer);
    if (!info) continue;
    const thread = threadKey(me, peer);
    const msgs = d.messages.filter(m => m.thread === thread);
    const last = msgs[msgs.length - 1];
    const seen = lastRead(d, me, thread);
    threads.push({masked:false,peer: info, last: last ? view(me)(last) : null, unread: msgs.filter(m => m.sender_id === peer && m.seq > seen).length});
  }
  return threads.sort((x, y) => (y.last?.seq ?? 0) - (x.last?.seq ?? 0) || x.peer.display_name.localeCompare(y.peer.display_name));
}

export function unreadChats(d: Data, me: ID) {
  return chatThreads(d, me).filter(t => t.unread > 0).length;
}

export type {Profile};

export {awardAchievements as awardRoomStamps, notify as roomNotice};
