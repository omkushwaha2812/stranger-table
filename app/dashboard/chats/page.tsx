import {ChatBlock} from '@/components/chat-block';
import Link from 'next/link';
import {requireStudent} from '@/lib/auth';
import {read} from '@/lib/store/db';
import {chatThreads} from '@/lib/store/core';
import {avatarUrl} from '@/lib/store/files';
import {dateLabel} from '@/lib/matches';

export const dynamic = 'force-dynamic';

export default async function Chats() {
  const {profile} = await requireStudent();
  const threads = read(d => chatThreads(d, profile.id));
  return <>
    <header className="dash-heading"><p className="eyebrow">Talk before and after your table</p><h1>Messages.</h1>
      <p>A chat opens as soon as you and your stranger both accept a connection.</p></header>
    {!threads.length && <section className="dash-card"><h2>No chats yet</h2><p>Find a stranger, and once you connect you can talk privately here.</p><Link className="primary" href="/dashboard/find">Find my stranger</Link></section>}
    <div className="chat-threads">{threads.map(t => {
      const photo = avatarUrl(t.peer.photo_path);
      return <article className="thread-row" key={t.peer.id}><Link href={`/dashboard/chats/${t.peer.id}`} className="dash-card chat-thread">
        {photo ? <img className="chat-avatar" src={photo} alt=""/> : <span className="chat-avatar" aria-hidden="true">{t.peer.display_name.slice(0, 1).toUpperCase()}</span>}
        <span><strong>{t.peer.display_name}</strong> 
          <span className="chat-preview">{t.last ? `${t.last.mine ? 'You: ' : ''}${t.last.body}` : 'No messages yet — say hello!'}</span></span>
        <span className="chat-meta">{t.last && <small>{dateLabel(t.last.created_at)}</small>}{t.unread > 0 && <b className="chat-badge">{t.unread}</b>}</span>
      </Link>{!t.masked && <ChatBlock peer={t.peer.id}/>}</article>;
    })}</div>
  </>;
}
