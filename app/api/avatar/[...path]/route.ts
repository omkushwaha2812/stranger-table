import {NextResponse} from 'next/server';
import {currentUser} from '@/lib/auth';
import {read} from '@/lib/store/db';
import {canViewAvatar} from '@/lib/store/core';
import {AVATAR_PATH, AVATAR_TYPES, readAvatar} from '@/lib/store/files';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, {params}: {params: Promise<{path: string[]}>}) {
  const relative = (await params).path.join('/');
  const user = await currentUser();
  if (!user || !AVATAR_PATH.test(relative) || !read(d => canViewAvatar(d, user.id, relative))) return new NextResponse('Not found', {status: 404});
  const bytes = readAvatar(relative);
  if (!bytes) return new NextResponse('Not found', {status: 404});
  return new NextResponse(new Uint8Array(bytes), {headers: {
    'Content-Type': AVATAR_TYPES[relative.split('.').pop()!], 'Cache-Control': 'private, max-age=60', 'X-Content-Type-Options': 'nosniff'
  }});
}
