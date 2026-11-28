import Link from 'next/link';
import {requireStudent} from '@/lib/auth';
import {read} from '@/lib/store/db';
import {visibleRooms} from '@/lib/store/rooms';
import {RoomForm} from '@/components/room-form';
import {MatchRefresh} from '@/components/match-refresh';
export default async function Page(){
 const {profile}=await requireStudent();
 const rooms=read(d=>visibleRooms(d,profile.id).filter(r=>r.members.includes(profile.id)||r.invited.includes(profile.id)));
 const categories=read(d=>d.table_categories);
 const history=read(d=>d.matches.filter(m=>!d.rooms.some(r=>r.id===m.id) && d.match_participants.some(p=>p.match_id===m.id && p.user_id===profile.id)).map(m=>({id:m.id,title:d.table_categories.find(c=>c.id===m.category_id)?.name,status:m.status})));
 return <><header className="dash-heading"><h1>My Tables.</h1><Link href="/dashboard/find">Explore more tables →</Link></header><MatchRefresh/><div className="dash-grid">{rooms.map(r=><article key={r.id} className="dash-card"><h2>{categories.find(c=>c.id===r.category)?.name??'Table'}</h2>{r.members.includes(profile.id)?<Link href={'/dashboard/matches/'+r.id}>View table →</Link>:<><RoomForm action="join" id={r.id}><button className="primary">Accept invitation</button></RoomForm><RoomForm action="decline" id={r.id}><button className="secondary">Decline</button></RoomForm></>}</article>)}{!rooms.length&&<p className="dash-empty">Your invitations and joined tables will appear here.</p>}</div>{history.length>0&&<section className="dash-card"><h2>Past tables</h2>{history.map(m=><p key={m.id}>{m.title} · {m.status}</p>)}</section>}</>;
}
