import {requireStudent} from '@/lib/auth';
import {TableButton} from '@/components/match-card';
import {dateLabel} from '@/lib/matches';
import Link from 'next/link';
import {readAll} from './actions';
import {read} from '@/lib/store/db';
import {myNotifications,unreadNotifications} from '@/lib/store/core';

export default async function Page({searchParams}:{searchParams:Promise<{page?:string;unread?:string;error?:string}>}) {
  const q=await searchParams;
  const page=/^[1-9]\d{0,5}$/.test(q.page??'')?Number(q.page):1;
  const onlyUnread=q.unread==='1';
  const {profile}=await requireStudent();
  const {rows,unread}=read(d=>({rows:{data:myNotifications(d,profile.id,{unreadOnly:onlyUnread,offset:(page-1)*20,limit:21})},unread:{count:unreadNotifications(d,profile.id)}}));
  function pageLink(n:number){return '/dashboard/notifications?page='+n+(onlyUnread?'&unread=1':'');}
  return <><header className="dash-heading"><h1>Notifications.</h1><p>{unread.count??0} unread</p></header>
    {q.error&&<p role="alert">Could not mark the notification as read. Please retry.</p>}
    <div className="dash-actions"><Link className="secondary" href={onlyUnread?'/dashboard/notifications':'/dashboard/notifications?unread=1'}>{onlyUnread?'Show all':'Show unread'}</Link>
    {!!unread.count&&<form action={readAll}><button className="secondary">Mark all as read</button></form>}</div>
    {rows.data.slice(0,20).map(n=><article key={n.id} className="dash-card mt-4"><p>{n.message}</p><p>{dateLabel(n.created_at)}</p>
      {n.kind==='achievement_unlocked'?<Link href="/dashboard/passport">Open passport →</Link>:
        n.kind==='new_connection'?<Link href="/dashboard/connections">Open connections →</Link>:
        n.kind==='new_message'&&n.peer_id?<Link href={'/dashboard/chats/'+n.peer_id}>Open chat →</Link>:
        n.kind==='table_invite'?<Link href='/dashboard/matches'>My invitations →</Link>:n.match_id&&<Link href={'/dashboard/matches/'+n.match_id}>View table →</Link>}
      {!n.read_at&&<TableButton id={n.id} action="read">Mark as read</TableButton>}</article>)}
    {!rows.data.length&&<p className="dash-empty">{onlyUnread?'No unread notifications here.':'No notifications on this page.'}</p>}
    <nav className="dash-actions" aria-label="Inbox pages">{page>1&&<Link href={pageLink(page-1)}>Newer</Link>}{rows.data.length>20&&<Link href={pageLink(page+1)}>Older</Link>}</nav>
  </>;
}
