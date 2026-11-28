import {ChatBlock} from '@/components/chat-block';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {z} from 'zod';
import {requireStudent} from '@/lib/auth';
import {read, tx} from '@/lib/store/db';
import {maskedThread,chatMessages, chatPeer, hasUnreadFrom, markChatRead} from '@/lib/store/core';
import {avatarUrl} from '@/lib/store/files';
import {ChatRoom} from '@/components/chat-room';

export const dynamic = 'force-dynamic';

export default async function Chat({params}: {params: Promise<{peerId: string}>}) {
  const {peerId} = await params;
  if (!z.string().uuid().safeParse(peerId).success) notFound();
  const {profile} = await requireStudent();
  const peer = read(d => chatPeer(d, profile.id, peerId));
  if (!peer && read(d=>maskedThread(d,profile.id,peerId))) return <><header className="dash-heading"><Link href="/dashboard/chats">← Messages</Link><h1>Account not found</h1></header><section className="dash-card"><p>Previous messages are unavailable.</p></section></>;
  if (!peer) notFound();
  const initial = read(d => chatMessages(d, profile.id, peerId, 0, 200));
  if (read(d => hasUnreadFrom(d, profile.id, peerId))) tx(d => markChatRead(d, profile.id, peerId));
  const photo = avatarUrl(peer.photo_path);
  return <>
    <header className="dash-heading chat-heading"><Link href="/dashboard/chats">← Messages</Link>
      <div className="chat-peer">{photo ? <img className="chat-avatar" src={photo} alt=""/> : <span className="chat-avatar" aria-hidden="true">{peer.display_name.slice(0, 1).toUpperCase()}</span>}
        <div><h1>{peer.display_name}</h1></div></div>
      <div className="dash-actions"><ChatBlock peer={peer.id}/><Link className="secondary" href="/dashboard/matches">My tables</Link><Link className="secondary" href="/dashboard/cards">Conversation cards</Link></div>
    </header>
    <ChatRoom peerId={peer.id} peerName={peer.display_name} initial={initial}/>
  </>;
}
