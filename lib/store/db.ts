// Local, dependency-free database for Stranger Table.
// All data lives in one JSON file (default: ./data/db.json). Every write goes
// through tx(), which is fully synchronous: inside one Node process no two
// transactions can interleave, so there are no race conditions for the
// matching queue. Comfortably handles a small campus pilot (tens of users).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {seedAchievements, seedCards, seedCategories, seedInterests, seedPreferences} from './seed';

export type ID = string;
export type MatchStatus = 'pending' | 'partially_accepted' | 'confirmed' | 'declined' | 'expired' | 'cancelled' | 'completed' | 'no_show';

export type User = {id: ID; email: string; password_hash: string; created_at: string; last_sign_in_at: string | null};
export type Session = {token_hash: string; user_id: ID; created_at: string; expires_at: string};
export type College = {id: ID; name: string; active: boolean; created_at: string};
export type Profile = {
  id: ID; college_id: ID; city?: string; gender?: string; display_name: string; department: string; academic_year: number; bio: string;
  role: 'student' | 'admin'; verification: 'pending' | 'approved' | 'rejected'; active: boolean;
  adult_confirmed: boolean; terms_accepted: boolean; photo_path: string | null; onboarding_complete: boolean;
  preferred_duration: number; meetup_mode: 'one-to-one' | 'group'; preferred_category: ID | null;
  created_at: string; updated_at: string;
};
export type Named = {id: ID; name: string};
export type Category = {id: ID; slug: string; name: string; description: string; icon: string; duration: number; is_group: boolean; active: boolean};
export type Location = {id: ID; college_id: ID; name: string; description: string; active: boolean; created_at: string};
export type Slot = {user_id: ID; weekday: number; start_time: string; end_time: string};
export type MatchRequest = {id: ID; user_id: ID; category_id: ID; starts_at: string; ends_at: string; mode: 'interest' | 'mystery'; status: 'waiting' | 'matched' | 'cancelled' | 'expired'; created_at: string};
export type MatchRow = {id: ID; college_id: ID; category_id: ID; location_id: ID; starts_at: string; ends_at: string; expires_at: string; status: MatchStatus; score: number | null; created_at: string};
export type Participant = {match_id: ID; user_id: ID; request_id: ID | null; accepted_at: string | null};
export type Feedback = {id: ID; match_id: ID; user_id: ID; happened: boolean; experience: number | null; comfortable: boolean | null; meet_again: boolean | null; private_feedback: string; created_at: string};
export type Vote = {match_id: ID; user_id: ID; interested: boolean};
export type Connection = {id: ID; user_a: ID; user_b: ID; match_id: ID | null; contact_text_a: string | null; contact_text_b: string | null; last_invited_at: string | null; created_at: string};
export type Card = {id: ID; category: string; question: string; active: boolean};
export type Achievement = {id: ID; slug: string; name: string; description: string};
export type Notification = {id: ID; user_id: ID; kind: string; message: string; match_id: ID | null; peer_id: ID | null; read_at: string | null; created_at: string};
export type Report = {id: ID; reporter_id: ID; reported_id: ID | null; match_id: ID | null; category: string; details: string; status: 'open' | 'reviewing' | 'resolved' | 'dismissed'; created_at: string};
export type Activity = {id: number; occurred_at: string; actor_id: ID | null; subject_id: ID | null; event: string; state: string | null};
export type Audit = {id: ID; admin_id: ID; action: string; target_id: ID | null; details: Record<string, unknown>; created_at: string};
export type Message = {id: ID; seq: number; thread: string; sender_id: ID; body: string; created_at: string};
export type ChatRead = {thread: string; user_id: ID; last_seq: number};

export type Data = {
  rooms: {aliases?:string[]; hiddenSeats?:{viewer:string; member:string}[]; id:string; question:string; category:string; members:string[]; invited:string[]; replies:{id:string; author:string; body:string}[]}[];
  requests: {sender:string; recipient:string}[];
  schema: number;
  users: User[]; sessions: Session[]; colleges: College[]; profiles: Profile[];
  interests: Named[]; conversation_preferences: Named[];
  user_interests: {user_id: ID; interest_id: ID}[];
  user_conversation_preferences: {user_id: ID; preference_id: ID}[];
  table_categories: Category[]; meetup_locations: Location[]; availability_slots: Slot[];
  match_requests: MatchRequest[]; matches: MatchRow[]; match_participants: Participant[];
  meetup_feedback: Feedback[]; connection_votes: Vote[]; connections: Connection[];
  conversation_cards: Card[]; favourite_cards: {user_id: ID; card_id: ID}[];
  achievements: Achievement[]; user_achievements: {user_id: ID; achievement_id: ID; created_at: string}[];
  notifications: Notification[]; reports: Report[]; blocked_users: {user_id: ID; blocked_id: ID; knownName?:string; hadChat?:boolean; created_at: string}[];
  onboarding_drafts: {user_id: ID; data: Record<string, unknown>; updated_at: string}[];
  portal_activity: Activity[]; admin_audit_logs: Audit[];
  messages: Message[]; chat_reads: ChatRead[];
  settings: {invitation_hours: number};
  counters: {activity: number; message: number};
};

export const CAMPUS_ID = '9ea60000-0000-4000-8000-000000000001';
const SCHEMA = 3;

export function dataDir() {
  return path.resolve(process.env.DATA_DIR || path.join(process.cwd(), 'data'));
}
function dbFile() { return path.join(dataDir(), 'db.json'); }

function empty(): Data {
  return {
    rooms: [], requests: [], schema: SCHEMA, users: [], sessions: [], colleges: [], profiles: [], interests: [], conversation_preferences: [],
    user_interests: [], user_conversation_preferences: [], table_categories: [], meetup_locations: [], availability_slots: [],
    match_requests: [], matches: [], match_participants: [], meetup_feedback: [], connection_votes: [], connections: [],
    conversation_cards: [], favourite_cards: [], achievements: [], user_achievements: [], notifications: [], reports: [],
    blocked_users: [], onboarding_drafts: [], portal_activity: [], admin_audit_logs: [], messages: [], chat_reads: [],
    settings: {invitation_hours: 12}, counters: {activity: 0, message: 0}
  };
}

function seeded(): Data {
  const d = empty();
  const now = new Date().toISOString();
  const id = () => crypto.randomUUID();
  d.colleges.push({id: CAMPUS_ID, name: 'Stranger Table Campus', active: true, created_at: now});
  d.interests = seedInterests.map(name => ({id: id(), name}));
  d.conversation_preferences = seedPreferences.map(name => ({id: id(), name}));
  d.table_categories = seedCategories.map(c => ({...c, id: id(), active: true}));
  d.conversation_cards = seedCards.map(([category, question]) => ({id: id(), category, question, active: true}));
  d.achievements = seedAchievements.map(a => ({...a, id: id()}));
  // One approved public spot so matching works out of the box. Admins can rename it or add more.

  return d;
}

// Fill in any collections added after a db.json was first created.
function normalize(raw: Partial<Data>): Data {
  const base = empty();
  const merged = {...base, ...raw} as Data;
  for (const key of Object.keys(base) as (keyof Data)[]) {
    if (Array.isArray(base[key]) && !Array.isArray(merged[key])) (merged as Record<string, unknown>)[key] = [];
  }
  merged.settings = {...base.settings, ...(raw.settings ?? {})};
  merged.counters = {...base.counters, ...(raw.counters ?? {})};
  if ((raw.schema ?? 1)<2) {
    for(const match of merged.matches.filter(m=>['pending','partially_accepted','confirmed'].includes(m.status))) {
      const people=merged.match_participants.filter(p=>p.match_id===match.id);
      const category=merged.table_categories.find(c=>c.id===match.category_id);
      merged.rooms.push({id:match.id,category:match.category_id,question:'What brings you to '+(category?.name??'this table')+'?',members:people.filter(p=>p.accepted_at).map(p=>p.user_id),invited:people.filter(p=>!p.accepted_at).map(p=>p.user_id),replies:[]});
    }
    for(const badge of merged.achievements) {
      const seed=seedAchievements.find(a=>a.slug===badge.slug);
      if(seed){badge.name=seed.name;badge.description=seed.description;}
    }
    merged.schema=2;
    for(const cat of merged.table_categories) {
      const seed=seedCategories.find(c=>c.slug===cat.slug);
      if(seed)cat.description=seed.description;
    }
  }
  if (merged.schema < 3) {
    const tables = new Map<string, Data['rooms'][number]>();
    const aliases = new Map<string,string>();
    for (const room of merged.rooms) {
      const table = tables.get(room.category);
      if (!table) { tables.set(room.category,room); continue; }
      (table.aliases ??= []).push(room.id);
      aliases.set(room.id,table.id);
      table.members = [...new Set([...table.members,...room.members])];
      table.invited = [...new Set([...table.invited,...room.invited])];
      table.replies.push(...room.replies);
    }
    merged.rooms = [...tables.values()];
    for(const room of merged.rooms) room.invited=room.invited.filter(id=>!room.members.includes(id));
    for(const row of [...merged.connections,...merged.notifications,...merged.reports]) {
      if(row.match_id) row.match_id=aliases.get(row.match_id)??row.match_id;
    }
    merged.schema=3;
  }
  return merged;
}

function writeAtomic(file: string, data: Data) {
  fs.mkdirSync(path.dirname(file), {recursive: true});
  const json = JSON.stringify(data, null, 1);
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, json);
  try { fs.renameSync(tmp, file); }
  catch { fs.writeFileSync(file, json); try { fs.unlinkSync(tmp); } catch { /* ignore */ } }
}

type Cache = {data: Data; stamp: string};
const holder = globalThis as unknown as {__strangerTableDb?: Cache};

function stampOf(file: string) {
  try { const s = fs.statSync(file); return `${s.mtimeMs}:${s.size}`; } catch { return ''; }
}

function current(): Data {
  const file = dbFile();
  let stamp = stampOf(file);
  if (holder.__strangerTableDb && stamp && holder.__strangerTableDb.stamp === stamp) return holder.__strangerTableDb.data;
  let data: Data;
  if (!stamp) { data = seeded(); writeAtomic(file, data); }
  else data = normalize(JSON.parse(fs.readFileSync(file, 'utf8')));
  stamp = stampOf(file);
  holder.__strangerTableDb = {data, stamp};
  return data;
}

/** Read-only access. Do not mutate the object you receive. */
export function read<T>(fn: (d: Data) => T): T {
  return fn(current());
}

/** Synchronous read-modify-write transaction. If fn throws, nothing is saved. */
export function tx<T>(fn: (d: Data) => T): T {
  const working = structuredClone(current());
  const result = fn(working);
  if (result instanceof Promise) throw new Error('tx callbacks must be synchronous');
  const file = dbFile();
  writeAtomic(file, working);
  holder.__strangerTableDb = {data: working, stamp: stampOf(file)};
  return result;
}
