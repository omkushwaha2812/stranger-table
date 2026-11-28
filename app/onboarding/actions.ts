'use server';
import {redirect} from 'next/navigation';
import {requireUser, requireProfile} from '@/lib/auth';
import {identity, personal, selections, meetup} from '@/lib/validation';
import {read, tx} from '@/lib/store/db';
import {createProfile as create, getDraft, saveDraft, saveOnboarding, setAvatar} from '@/lib/store/core';
import {removeAvatar, saveAvatar} from '@/lib/store/files';

function fail(step: number, message: string): never { redirect(`/onboarding?step=${step}&error=${encodeURIComponent(message)}`); }
function ok(fn: () => unknown) { try { fn(); return true; } catch { return false; } }

export async function createProfile(form: FormData) {
  const {user} = await requireUser();
  const parsed = identity.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail(0, 'Complete all registration fields and confirmations');
  const v = parsed.data;
  if (!ok(() => tx(d => create(d, user.id, {name: v.name, city: v.city, gender: v.gender})))) return fail(0, 'Unable to create profile.');
  redirect('/onboarding');
}

const EXT: Record<string, string> = {'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp'};

export async function saveStep(form: FormData) {
  const {user, profile} = await requireProfile();
  const step = Number(form.get('step'));
  if (!profile.active || ![1, 2, 3, 4].includes(step)) return fail(1, 'Action unavailable');
  const draft = {...read(d => getDraft(d, user.id))};
  if (step === 1) {
    const p = personal.safeParse(Object.fromEntries(form));
    if (!p.success) return fail(step, 'Check your personal details');
    const photo = form.get('photo');
    if (photo instanceof File && photo.size) {
      if (photo.size > 5 * 1024 * 1024 || !EXT[photo.type]) return fail(step, 'Use a JPEG, PNG or WebP image under 5 MB');
      const bytes = new Uint8Array(await photo.arrayBuffer());
      const valid = photo.type === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : photo.type === 'image/png' ? bytes.slice(0, 8).join(',') === '137,80,78,71,13,10,26,10'
        : String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
      if (!valid) return fail(step, 'Invalid image content');
      const path = `${user.id}/${crypto.randomUUID()}.${EXT[photo.type]}`;
      if (!ok(() => saveAvatar(path, bytes))) return fail(step, 'Photo upload failed');
      let previous: string | null = null;
      if (!ok(() => { previous = tx(d => setAvatar(d, user.id, path)); })) { removeAvatar(path); return fail(step, 'Could not save photo'); }
      removeAvatar(previous);
    }
    draft.personal = p.data;
  } else if (step === 2 || step === 3) {
    const p = selections.safeParse(form.getAll('selected'));
    if (!p.success) return fail(step, 'Choose at least one option');
    const ids = [...new Set(p.data)];
    const known = read(d => new Set((step === 2 ? d.interests : d.conversation_preferences).map(x => x.id)));
    if (!ids.every(x => known.has(x))) return fail(step, 'Invalid selection');
    draft[step === 2 ? 'interests' : 'preferences'] = ids;
  } else {
    const p = meetup.safeParse({...Object.fromEntries(form), days: form.getAll('days')});
    if (!p.success) return fail(step, 'Choose a table category');
    draft.meetup = p.data;
  }
  if (!ok(() => tx(d => saveDraft(d, user.id, draft)))) return fail(step, 'Unable to save progress');
  if (step !== 4) redirect(`/onboarding?step=${step + 1}`);

  const a = personal.safeParse(draft.personal), b = selections.safeParse(draft.interests), c = selections.safeParse(draft.preferences), m = meetup.safeParse(draft.meetup);
  if (!a.success) return fail(1, 'Complete personal details');
  if (!b.success) return fail(2, 'Select interests');
  if (!c.success) return fail(3, 'Select conversation preferences');
  if (!m.success) return fail(4, 'Check meetup preferences');
  const v = m.data;
  const category = read(d => d.table_categories.find(x => x.id === v.category && x.active));
  if (!category) return fail(4, 'Choose a category that matches your meetup format');
  const saved = ok(() => tx(d => saveOnboarding(d, user.id, {
    name: a.data.name, bio: a.data.bio, city: a.data.city, gender: a.data.gender, interests: b.data, preferences: c.data,
    category: v.category, duration: 0, mode: category.is_group ? "group" : "one-to-one",
    slots: []
  })));
  if (!saved) return fail(4, 'Could not finish onboarding. Check your selections.');
  redirect('/dashboard');
}
