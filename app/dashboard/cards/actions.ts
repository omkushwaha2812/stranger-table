'use server';
import { z } from 'zod';
import { requireStudent } from '@/lib/auth';
import { tx } from '@/lib/store/db';
import { setFavourite as save } from '@/lib/store/core';

export async function setFavourite(card: string, value: boolean) {
  const { profile } = await requireStudent();
  const result = z.tuple([z.string().uuid(), z.boolean()]).safeParse([card, value]);
  if (!result.success) return false;
  try { tx(d => save(d, profile.id, card, value)); return true; } catch { return false; }
}
