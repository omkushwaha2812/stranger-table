import type {Data} from './db';

export function unblockAccount(d:Data, me:string, target:string) {
  d.blocked_users=d.blocked_users.filter(b=>b.user_id!==me || b.blocked_id!==target);
}

// Each call runs in one store transaction. Shared tables and other members' seats survive.
export function eraseAccount(d:Data,id:string) {
  d.users=d.users.filter(r=>r.id!==id);
  d.profiles=d.profiles.filter(r=>r.id!==id);
  for(const rows of [d.sessions,d.user_interests,d.user_conversation_preferences,d.availability_slots,d.match_requests,d.match_participants,d.meetup_feedback,d.connection_votes,d.favourite_cards,d.user_achievements,d.onboarding_drafts]) {
    for(let i=rows.length-1;i>=0;i--) if(rows[i].user_id===id)rows.splice(i,1);
  }
  d.matches=d.matches.filter(m=>d.match_participants.some(p=>p.match_id===m.id));
  for(const r of d.rooms) {
    r.members=r.members.filter(u=>u!==id);
    r.invited=r.invited.filter(u=>u!==id);
    r.replies=r.replies.filter(v=>v.author!==id);
    r.hiddenSeats=r.hiddenSeats?.filter(v=>v.viewer!==id && v.member!==id);
  }
  d.requests=d.requests.filter(r=>r.sender!==id && r.recipient!==id);
  d.connections=d.connections.filter(r=>r.user_a!==id && r.user_b!==id);
  d.blocked_users=d.blocked_users.filter(r=>r.user_id!==id && r.blocked_id!==id);
  d.messages=d.messages.filter(r=>!r.thread.split(':').includes(id));
  d.chat_reads=d.chat_reads.filter(r=>!r.thread.split(':').includes(id));
  d.notifications=d.notifications.filter(r=>r.user_id!==id && r.peer_id!==id);
  d.reports=d.reports.filter(r=>r.reporter_id!==id && r.reported_id!==id);
  d.portal_activity=d.portal_activity.filter(r=>r.actor_id!==id && r.subject_id!==id);
  d.admin_audit_logs=d.admin_audit_logs.filter(r=>r.admin_id!==id && r.target_id!==id);
}
