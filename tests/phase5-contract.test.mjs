import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync as read,existsSync} from 'node:fs';
const f=p=>read(new URL('../'+p,import.meta.url),'utf8');
test('student routes exist and dashboard excludes administrators',()=>{for(const p of ['find','matches','matches/[id]','notifications','profile','settings','chats','chats/[peerId]'])assert.ok(existsSync(new URL('../app/dashboard/'+p+'/page.tsx',import.meta.url)),p);assert.match(f('lib/auth.ts'),/profile\.role === 'admin'\) redirect\('\/admin'\)/);});
test('photos are served only through the permission-checked route',()=>{assert.match(f('app/api/avatar/[...path]/route.ts'),/canViewAvatar/);assert.match(f('lib/store/files.ts'),/AVATAR_PATH/);});
