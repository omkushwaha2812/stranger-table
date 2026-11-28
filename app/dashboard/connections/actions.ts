'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireStudent } from '@/lib/auth';
import { tx } from '@/lib/store/db';
import { setConnectionContact, submitFeedback, voteConnection as vote } from '@/lib/store/core';

const uuid = z.string().uuid();
const choice = z.enum(['yes', 'no']).transform(value => value === 'yes');
const attended = z.object({
  id: uuid, happened: z.literal('yes'), experience: z.coerce.number().int().min(1).max(5),
  comfortable: choice, again: choice, note: z.string().trim().max(2000)
});

const missed = z.object({id: uuid, happened: z.literal('no'), note: z.string().trim().max(2000)});
const feedback = z.discriminatedUnion('happened', [attended, missed]);

function attempt(fn: () => unknown) {
  try { fn(); return false; } catch { return true; }
}

export async function saveFeedback(form: FormData) {
  const { profile } = await requireStudent();
  const result = feedback.safeParse(Object.fromEntries(form));
  if (!result.success) redirect('/dashboard/matches?error=invalid');
  const v = result.data;
  const error = attempt(() => tx(d => submitFeedback(d, profile.id, v.id, {
    happened: v.happened === 'yes', experience: v.happened === 'yes' ? v.experience : null,
    comfortable: v.happened === 'yes' ? v.comfortable : null, again: v.happened === 'yes' ? v.again : null, note: v.note
  })));
  revalidatePath('/dashboard', 'layout');
  redirect('/dashboard/matches/' + v.id + (error ? '?error=feedback' : ''));
}

export async function voteConnection(form: FormData) {
  const { profile } = await requireStudent();
  const v = z.object({id: uuid, choice}).parse(Object.fromEntries(form));
  const error = attempt(() => tx(d => vote(d, profile.id, v.id, v.choice)));
  revalidatePath('/dashboard', 'layout');
  redirect('/dashboard/matches/' + v.id + (error ? '?error=vote' : ''));
}

export async function saveContact(form: FormData) {
  const { profile } = await requireStudent();
  const v = z.object({id: uuid, contact: z.string().trim().max(120)}).parse(Object.fromEntries(form));
  const error = attempt(() => tx(d => setConnectionContact(d, profile.id, v.id, v.contact)));
  revalidatePath('/dashboard/connections');
  redirect('/dashboard/connections?' + (error ? 'error=contact' : 'saved=1'));
}

