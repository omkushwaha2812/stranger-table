'use server';
import {requireStudent} from '@/lib/auth';
import {revalidatePath} from 'next/cache';
import {tx} from '@/lib/store/db';
import {readNotification} from '@/lib/store/core';
export async function readAll() {
  const {profile}=await requireStudent();
  tx(d=>readNotification(d,profile.id,null));
  revalidatePath('/dashboard','layout');
}
