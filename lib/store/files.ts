// Private profile photos, stored on disk under <data dir>/uploads/avatars/<user id>/<file>.
// They are never served statically: app/api/avatar/... checks permission first.
import fs from 'node:fs';
import path from 'node:path';
import {dataDir} from './db';

export const AVATAR_PATH = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/;
export const AVATAR_TYPES: Record<string, string> = {jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp'};

function avatarFile(relative: string) {
  if (!AVATAR_PATH.test(relative)) throw new Error('Invalid avatar path');
  return path.join(dataDir(), 'uploads', 'avatars', ...relative.split('/'));
}

export function saveAvatar(relative: string, bytes: Uint8Array) {
  const file = avatarFile(relative);
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, bytes);
}

export function avatarExists(relative: string) {
  try { return fs.statSync(avatarFile(relative)).isFile(); } catch { return false; }
}

export function readAvatar(relative: string) {
  try { return fs.readFileSync(avatarFile(relative)); } catch { return null; }
}

export function removeAvatar(relative: string | null | undefined) {
  if (!relative) return;
  try { fs.unlinkSync(avatarFile(relative)); } catch { /* already gone */ }
}

/** URL for an <img>. The route re-checks who may see it on every request. */
export function avatarUrl(relative: string | null | undefined) {
  return relative && AVATAR_PATH.test(relative) ? `/api/avatar/${relative}` : null;
}
