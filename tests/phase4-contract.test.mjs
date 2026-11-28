import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync as read,existsSync} from 'node:fs';
const file=p=>read(new URL('../'+p,import.meta.url),'utf8');
test('registration and onboarding do not ask for a college',()=>{for(const p of ['app/register/page.tsx','app/onboarding/page.tsx'])assert.doesNotMatch(file(p),/name="college"/);assert.doesNotMatch(file('lib/validation.ts'),/college:z/);assert.match(file('lib/store/core.ts'),/college_id: CAMPUS_ID/);});
test('public statistics derived from records',()=>{assert.match(file('lib/store/core.ts'),/completed_meetups: d.rooms.length/);assert.match(file('lib/public-data.ts'),/publicStats/);});
test('public routes exist',()=>{for(const p of ['about','how-it-works','tables','privacy','terms','community-guidelines'])assert.ok(existsSync(new URL('../app/'+p+'/page.tsx',import.meta.url)));});
