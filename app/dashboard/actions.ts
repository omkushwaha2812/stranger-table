'use server';
import {z} from 'zod';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {requireStudent} from '@/lib/auth';
import {tx} from '@/lib/store/db';
import {blockStudent, readNotification, reportMatch} from '@/lib/store/core';

const id = z.string().uuid();
export async function tableAction(form: FormData) {
  const {profile}=await requireStudent();
  const v=z.object({id,action:z.enum(['block','read'])}).safeParse(Object.fromEntries(form));
  if(!v.success)redirect('/dashboard/matches?error=invalid');
  const {action,id:target}=v.data;
  try {
    tx(d=>action==='block'?blockStudent(d,profile.id,target):readNotification(d,profile.id,target));
  } catch {redirect('/dashboard/matches?error=action');}
  revalidatePath('/dashboard','layout');
  redirect(action==='read'?'/dashboard/notifications':form.get('from')==='messages'?'/dashboard/chats':'/dashboard/matches');
}

export async function reportTable(form: FormData) {
  const {profile} = await requireStudent();
  const v = z.object({id, category: z.enum(['harassment', 'inappropriate_behaviour', 'fake_profile', 'spam', 'safety_concern', 'other']),
    details: z.string().trim().min(1).max(2000)}).safeParse(Object.fromEntries(form));
  if (!v.success) redirect('/dashboard/matches?error=invalid');
  let failed = false;
  try { tx(d => reportMatch(d, profile.id, v.data.id, v.data.category, v.data.details)); } catch { failed = true; }
  redirect('/dashboard/matches?' + (failed ? 'error=action' : 'reported=1'));
}
