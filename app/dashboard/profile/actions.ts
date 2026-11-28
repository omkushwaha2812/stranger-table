'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {requireStudent,clearSessionCookie} from '@/lib/auth';
import {read,tx} from '@/lib/store/db';
import {unblockAccount,eraseAccount} from '@/lib/store/account';
import {verifyPassword} from '@/lib/store/passwords';
import {removeAvatar} from '@/lib/store/files';

export async function unblock(form:FormData){
  const {profile}=await requireStudent();
  tx(d=>unblockAccount(d,profile.id,String(form.get('target'))));
  revalidatePath('/dashboard','layout');
  redirect('/dashboard/profile');
}
export async function deleteSelf(form:FormData){
  const {profile}=await requireStudent();
  const hash=read(d=>d.users.find(u=>u.id===profile.id)?.password_hash);
  const password=form.get('password');
  if(form.get('confirm')!=='on'||typeof password!=='string'||password.length>128||!await verifyPassword(password,hash))redirect('/dashboard/profile?error=delete');
  const photo=tx(d=>{
    if(!hash || d.users.find(u=>u.id===profile.id)?.password_hash!==hash)throw Error('Sign in again.');
    const path=d.profiles.find(p=>p.id===profile.id)?.photo_path;
    eraseAccount(d,profile.id);
    return path;
  });
  removeAvatar(photo);
  await clearSessionCookie();
  revalidatePath('/','layout');
  redirect('/login?notice=Account%20permanently%20deleted');
}
