// Chat API used by components/chat-room.tsx.
// GET  ?after=<seq>  -> new messages since seq (and marks them read)
// POST {body}        -> send a message
import {NextResponse} from 'next/server';
import {z} from 'zod';
import {apiStudent} from '@/lib/auth';
import {read, tx} from '@/lib/store/db';
import {AppError, canChat, chatMessages, hasUnreadFrom, markChatRead, MESSAGE_MAX, sendMessage} from '@/lib/store/core';

export const dynamic = 'force-dynamic';
const peerSchema = z.string().uuid();

async function context(params: Promise<{peerId: string}>) {
  const peer = peerSchema.safeParse((await params).peerId);
  const me = await apiStudent();
  if (!peer.success || !me) return null;
  return {me: me.profile.id, peer: peer.data};
}

export async function GET(req: Request, {params}: {params: Promise<{peerId: string}>}) {
  const ctx = await context(params);
  if (!ctx) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  const after = Number(new URL(req.url).searchParams.get('after') ?? 0);
  if (!read(d => canChat(d, ctx.me, ctx.peer))) return NextResponse.json({error: 'chat_unavailable'}, {status: 403});
  const messages = read(d => chatMessages(d, ctx.me, ctx.peer, Number.isFinite(after) && after > 0 ? after : 0));
  if (read(d => hasUnreadFrom(d, ctx.me, ctx.peer))) tx(d => markChatRead(d, ctx.me, ctx.peer));
  return NextResponse.json({messages}, {headers: {'Cache-Control': 'no-store'}});
}

export async function POST(req: Request, {params}: {params: Promise<{peerId: string}>}) {
  const ctx = await context(params);
  if (!ctx) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  // JSON only: blocks cross-site form posts (session cookie is also SameSite=Lax).
  if (!req.headers.get('content-type')?.includes('application/json')) return NextResponse.json({error: 'invalid_message'}, {status: 415});
  const body = z.object({body: z.string().min(1).max(MESSAGE_MAX)}).safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({error: 'invalid_message'}, {status: 400});
  try {
    const message = tx(d => sendMessage(d, ctx.me, ctx.peer, body.data.body));
    return NextResponse.json({message});
  } catch (e) {
    const code = e instanceof AppError ? e.code : 'error';
    return NextResponse.json({error: code}, {status: code === 'chat_unavailable' ? 403 : code === 'slow_down' ? 429 : 400});
  }
}
