import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url);
require.extensions['.ts']=(module,path)=>module._compile(ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,path);
const db=require('../lib/store/db.ts');
const core=require('../lib/store/core.ts');
const {changeRoom,visibleRooms}=require('../lib/store/rooms.ts');
test('independent seats, invitation decisions and pairwise name reveal',()=>{
  const directory=mkdtempSync(join(tmpdir(),'table-test-'));
  process.env.DATA_DIR=directory;
  try {
    db.tx(d=>{
      const [a,b,c]=['Ali','Bo','Cam'].map(name=>{
        const id=core.createAccount(d,{email:name+'@example.com',name,city:'Delhi',gender:'Prefer not to say',password_hash:'fixture'});
        d.profiles.find(p=>p.id===id).onboarding_complete=true;
        return id;
      });
      const category=d.table_categories[0].id;
      const first=changeRoom(d,a,'create',category,'Which book stayed with you?');
      assert.equal(changeRoom(d,b,'create',category,''),first);
      assert.deepEqual(d.requests,[]);
      assert.ok(!d.notifications.some(n=>n.kind==='connection_request'));
      assert.equal(core.chatPeer(d,a,b),null);
      changeRoom(d,c,'join',first,'');
      
      for(const other of [b,c]){
        changeRoom(d,other,'connect',first,a);
        assert.equal(core.chatPeer(d,a,other),null);
        changeRoom(d,a,'connect',first,other);
        assert.equal(core.chatPeer(d,other,a).display_name,'Ali');
      }
      assert.equal(core.chatPeer(d,b,c),null);
      assert.equal(changeRoom(d,c,'create',category,''),first);
      assert.deepEqual(d.rooms[0].members,[a,b,c]);
      const second=changeRoom(d,a,'create',d.table_categories[1].id,'');
      for(const other of [b,c])changeRoom(d,a,'invite',second,other);
      changeRoom(d,b,'join',second,'');
      changeRoom(d,c,'decline',second,'');
      const room=d.rooms.find(r=>r.id===second);
      assert.deepEqual(room.members,[a,b]);
      assert.deepEqual(room.invited,[]);
      assert.equal(visibleRooms(d,c).length,2);
      changeRoom(d,c,'join',second,'');
      core.sendMessage(d,a,b,'Hello from the table');
      assert.equal(core.chatMessages(d,b,a)[0].body,'Hello from the table');
      core.blockStudent(d,b,a);
      assert.equal(core.chatPeer(d,b,a),null);
      for(const viewer of [a,b]){
        const masked=core.chatThreads(d,viewer).find(t=>t.peer.id===(viewer===a?b:a));
        assert.equal(masked.peer.display_name,'Account not found');
        assert.equal(masked.last.body,'Account not found');
      }
      const {unblockAccount,eraseAccount}=require('../lib/store/account.ts');
      unblockAccount(d,a,b);
      assert.equal(core.isBlocked(d,a,b),true);
      unblockAccount(d,b,a);
      assert.equal(core.isBlocked(d,a,b),false);
      const copy=structuredClone(d);
      eraseAccount(copy,a);
      assert.ok(!JSON.stringify(copy).includes(a));
      assert.ok(copy.profiles.some(p=>p.id===b));
      assert.ok(copy.rooms[0].members.includes(c));
    });
    const path=join(directory,'db.json');
    const raw=JSON.parse(readFileSync(path,'utf8'));
    const [a,b]=raw.profiles;
    const prior=structuredClone(raw);
    prior.schema=2;
    const duplicate={...prior.rooms[0],id:'other-walk',members:[b.id],invited:[]};
    prior.rooms.push(duplicate);
    writeFileSync(path,JSON.stringify(prior));
    db.tx(d=>{
      assert.equal(d.rooms.length,2);
      assert.deepEqual(d.rooms[0].members,prior.rooms[0].members);
      assert.deepEqual(d.rooms[0].aliases,['other-walk']);
    });
    raw.schema=1;delete raw.rooms;delete raw.requests;
    raw.matches=[{id:'legacy',category_id:raw.table_categories[0].id,status:'partially_accepted'}];
    raw.match_participants=[{match_id:'legacy',user_id:a.id,accepted_at:'yes'},{match_id:'legacy',user_id:b.id,accepted_at:null}];
    writeFileSync(path,JSON.stringify(raw));
    db.tx(d=>{assert.deepEqual(d.rooms[0].members,[a.id]);assert.deepEqual(d.rooms[0].invited,[b.id]);});
    assert.equal(db.read(d=>d.rooms.length),1);
  } finally {rmSync(directory,{recursive:true,force:true});}
});
