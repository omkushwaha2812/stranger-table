import {randomUUID} from 'node:crypto';
import type {Data} from './db';
import {eligible, canChat, isBlocked, roomNotice} from './core';

export function visibleRooms(d:Data, me:string) {
  return eligible(d,me) ? d.rooms : [];
}
export function changeRoom(d:Data, me:string, action:string, id:string, value:string) {
  if (!eligible(d,me)) throw Error('Finish your profile first.');
  if (action==='create') {
    const category=d.table_categories.find(c=>c.active && c.id===id);
    if (!category) throw Error('Choose an available table.');
    const existing=d.rooms.find(room=>room.category===id);
    if(existing)return changeRoom(d,me,'join',existing.id,'');
    const room={id:randomUUID(),category:id,question:category.name,members:[me],invited:[],replies:[]};
    d.rooms.push(room);
    return room.id;
  }
  const room=visibleRooms(d,me).find(r=>r.id===id);
  if (!room) throw Error('This table is unavailable.');
  if (action==='decline' || action==='join') {
    room.invited=room.invited.filter(user=>user!==me);
    if(action==='join' && !room.members.includes(me)) {
      room.members.push(me);
    }
    return id;
  }
  if(!room.members.includes(me)) throw Error('Join this table first.');
  if(action==='hideSeat' || action==='restoreSeat') {
    if(me===value || !room.members.includes(value)) throw Error('Choose another seat at this table.');
    const otherChoices=(room.hiddenSeats??[]).filter(choice=>choice.viewer!==me || choice.member!==value);
    if(action==='hideSeat') otherChoices.push({viewer:me,member:value});
    room.hiddenSeats=otherChoices;
    return id;
  }
  if(action==='reject') {
    d.requests=d.requests.filter(r=>!(r.sender===value && r.recipient===me));
    return id;
  }
  if(action==='invite') {
    if(!canChat(d,me,value) || !visibleRooms(d,value).includes(room)) throw Error('This invitation is unavailable.');
    if(!room.members.includes(value) && !room.invited.includes(value)) {
      room.invited.push(value);
      roomNotice(d,value,'table_invite','You have a new table invitation.',id,me);
    }
  } else if(action==='connect') {
    if(value===me || !room.members.includes(value) || !eligible(d,value) || isBlocked(d,me,value)) throw Error('This connection is unavailable.');
    if(canChat(d,me,value)) return id;
    const reverse=d.requests.find(r=>r.sender===value && r.recipient===me);
    if(reverse) {
      const [user_a,user_b]=[me,value].sort();
      d.connections.push({id:randomUUID(),user_a,user_b,match_id:id,contact_text_a:null,contact_text_b:null,last_invited_at:null,created_at:new Date().toISOString()});
      d.requests=d.requests.filter(r=>r!==reverse);
      roomNotice(d,value,'new_connection','A member accepted your connection.',id,me);
    } else if(!d.requests.some(r=>r.sender===me && r.recipient===value)) {
      d.requests.push({sender:me,recipient:value});
      roomNotice(d,value,'connection_request','Someone at your table would like to connect.',id,me);
    }
  } else throw Error('Unknown action.');
  return id;
}
