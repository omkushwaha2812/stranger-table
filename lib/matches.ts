import {requireStudent} from './auth';
import {read} from './store/db';
import {myMatches, type MatchView} from './store/core';
export type Match = MatchView;
export async function loadMatches(): Promise<Match[]> {
  const {profile} = await requireStudent();
  if (!profile.onboarding_complete) return [];
  return read(d => myMatches(d, profile.id));
}
export function dateLabel(value: string) {
  return new Intl.DateTimeFormat('en-IN', {dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata'}).format(new Date(value));
}
