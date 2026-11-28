'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {z} from 'zod';
import {requireAdmin} from '@/lib/auth';
import {tx} from '@/lib/store/db';
import {adminResetPassword, adminStudent} from '@/lib/store/core';
import {hashPassword} from '@/lib/store/passwords';

export async function setStudentAccess(form:FormData) {
  const {profile} = await requireAdmin();
  const {id, action} = z.object({
    id: z.string().uuid(),
    action: z.enum(['suspend','restore'])
  }).parse(Object.fromEntries(form));
  tx(d => adminStudent(d, profile.id, id, 'approved', action === 'restore'));
  revalidatePath('/admin');
}

/** Replaces the email-based reset: the admin hands the student a temporary password. */
export async function resetStudentPassword(form:FormData) {
  const {profile} = await requireAdmin();
  const v = z.object({id: z.string().uuid(), password: z.string().min(8).max(72)}).safeParse(Object.fromEntries(form));
  if (!v.success) redirect('/admin?error=' + encodeURIComponent('Temporary password must be 8–72 characters.'));
  const hash = await hashPassword(v.data.password);
  tx(d => adminResetPassword(d, profile.id, v.data.id, hash));
  revalidatePath('/admin');
  redirect('/admin?notice=' + encodeURIComponent('Temporary password set. The student is signed out everywhere and should change it under Settings.'));
}
