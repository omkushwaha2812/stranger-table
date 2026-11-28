import {apiStudent} from '@/lib/auth';
import {read} from '@/lib/store/db';
import {canChat} from '@/lib/store/core';
export const dynamic='force-dynamic';
export async function GET(){
  const account=await apiStudent();
  if(!account)return new Response(null,{status:401});
  const me=account.profile.id;
  const alerts=read(d=>d.notifications.filter(n=>n.user_id===me && n.kind==='new_connection' && !n.read_at && n.peer_id && canChat(d,me,n.peer_id)).map(n=>({id:n.id,peer:n.peer_id!,name:d.profiles.find(p=>p.id===n.peer_id)?.display_name??'A member'})));
  return Response.json(alerts,{headers:{'Cache-Control':'private, no-store'}});
}
