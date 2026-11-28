'use server';
import {requireStudent} from '@/lib/auth';
import {read,tx} from '@/lib/store/db';
import {canChat,awardRoomStamps} from '@/lib/store/core';
import {changeRoom} from '@/lib/store/rooms';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
export async function act(form:FormData) {
  const {profile}=await requireStudent();
  const field=(key:string)=>String(form.get(key)??'');
  const action=field('action');
  let id:string;
  try {id=tx(d=>{const room=changeRoom(d,profile.id,action,field('id'),field('value')); if(action==='connect' && canChat(d,profile.id,field('value'))){awardRoomStamps(d,profile.id);awardRoomStamps(d,field('value'));}return room;});}
  catch(error){redirect('/dashboard/find?error='+encodeURIComponent(error instanceof Error?error.message:'Try again.'));}
  revalidatePath('/dashboard','layout');
  if(action==='connect' && read(d=>canChat(d,profile.id,field('value')))) redirect('/dashboard/chats/'+field('value'));
  redirect(action==='decline'?'/dashboard/matches':'/dashboard/matches/'+id);
}
