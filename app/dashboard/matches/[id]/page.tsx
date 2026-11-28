import {TableButton} from '@/components/match-card';
import {reportTable} from '../../actions';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {requireStudent} from '@/lib/auth';
import {read} from '@/lib/store/db';
import {canChat,myConnections,eligible,isBlocked} from '@/lib/store/core';
import {visibleRooms} from '@/lib/store/rooms';
import {RoomForm} from '@/components/room-form';
import {MatchRefresh} from '@/components/match-refresh';
export default async function Page({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const {profile:{id:me}}=await requireStudent();
 const data=read(d=>{
   const room=visibleRooms(d,me).find(r=>(r.id===id || r.aliases?.includes(id)) && r.members.includes(me));
   if(!room)return null;
   const seats=room.members.map((user,i)=>({user,hidden:room.hiddenSeats?.some(choice=>choice.viewer===me && choice.member===user),number:i+1,city:d.profiles.find(p=>p.id===user)?.city,gender:d.profiles.find(p=>p.id===user)?.gender,
     interests:d.user_interests.filter(x=>x.user_id===user).map(x=>d.interests.find(v=>v.id===x.interest_id)?.name).filter(Boolean),
     styles:d.user_conversation_preferences.filter(x=>x.user_id===user).map(x=>d.conversation_preferences.find(v=>v.id===x.preference_id)?.name).filter(Boolean),name:user===me?'You':canChat(d,me,user)?d.profiles.find(p=>p.id===user)?.display_name:'',connected:canChat(d,me,user),sent:d.requests.some(r=>r.sender===me&&r.recipient===user),received:d.requests.some(r=>r.sender===user&&r.recipient===me)})).filter(s=>eligible(d,s.user)&&!isBlocked(d,me,s.user));
   return {roomId:room.id,title:d.table_categories.find(c=>c.id===room.category)?.name,seats,contacts:myConnections(d,me).filter(c=>!room.members.includes(c.student_id)&&!room.invited.includes(c.student_id))};
 });
 if(!data) notFound();
 const {roomId,title,seats,contacts}=data;
 return <><header className="dash-heading"><p className="eyebrow">Your table</p><h1>{title}</h1><Link href="/dashboard/find">Explore other tables →</Link></header><section className="dash-card"><div className="seats-heading"><h2>Members ({seats.length})</h2><MatchRefresh/></div>
 <ol className="table-seats">{seats.filter(s=>!s.hidden).map(s=><li key={s.user}>
   {s.user!==me && <div className="seat-hide"><RoomForm action="hideSeat" id={roomId} value={s.user}><button type="submit" title="Hide this seat for me" aria-label={'Hide Seat '+s.number+' for me'}>×</button></RoomForm></div>}
   <h3>Seat {s.number}{s.name && ' · '+s.name}</h3>
   <p>{s.city || 'City unspecified'} · {s.gender || 'Gender unspecified'}</p>
   <dl><dt>Interests</dt><dd>{s.interests.join(', ') || 'Not specified'}</dd><dt>Conversation style</dt><dd>{s.styles.join(', ') || 'Not specified'}</dd></dl>
   {s.user!==me && <div className="seat-actions">{s.connected?<Link href={'/dashboard/chats/'+s.user}>Message →</Link>:<RoomForm action="connect" id={roomId} value={s.user}><button className="secondary" disabled={s.sent}>{s.sent?'Request sent':s.received?'Accept connection':'Connect'}</button></RoomForm>}
   {s.received && <RoomForm action="reject" id={roomId} value={s.user}><button className="secondary">Decline</button></RoomForm>}
   <details><summary>More</summary><TableButton action="block" id={s.user}>Block member</TableButton></details></div>}
 </li>)}</ol>{seats.some(s=>s.hidden) && <details><summary>Hidden seats ({seats.filter(s=>s.hidden).length})</summary>{seats.filter(s=>s.hidden).map(s=><RoomForm key={s.user} id={roomId} action="restoreSeat" value={s.user}><button className="secondary">Show Seat {s.number} again</button></RoomForm>)}</details>}</section>{contacts.length>0&&<section className="dash-card"><RoomForm action="invite" id={roomId}><label className="field">Invite a connection<select name="value">{contacts.map(c=><option key={c.student_id} value={c.student_id}>{c.display_name}</option>)}</select></label><button className="secondary">Invite</button></RoomForm></section>}<details className="dash-card"><summary>Report this table</summary><form action={reportTable} className="form-stack"><input type="hidden" name="id" value={roomId}/><input type="hidden" name="category" value="safety_concern"/><label className="field">Describe the concern<textarea name="details" required maxLength={2000}/></label><button className="secondary">Send report</button></form></details></>;
}
