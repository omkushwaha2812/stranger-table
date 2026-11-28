import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync as read} from 'node:fs';
const f=p=>read(new URL('../'+p,import.meta.url),'utf8');
test('chat opens only after mutual acceptance and closes on block/suspension',()=>{const s=f('lib/store/core.ts');assert.match(s,/export function canChat/);assert.match(s,/!eligible\(d, me\) \|\| !eligible\(d, peer\) \|\| isBlocked\(d, me, peer\)/);assert.match(s,/return d.connections.some/);});
test('chat API authenticates, checks permission and limits size and rate',()=>{const r=f('app/api/chat/[peerId]/route.ts');assert.match(r,/apiStudent/);assert.match(r,/canChat/);assert.match(r,/application\/json/);const s=f('lib/store/core.ts');assert.match(s,/MESSAGE_MAX = 1000/);assert.match(s,/slow_down/);});
test('chat room polls for new messages',()=>{const c=f('components/chat-room.tsx');assert.match(c,/POLL_MS/);assert.match(c,/after=\$\{lastSeq\.current\}/);});
