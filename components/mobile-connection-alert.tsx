'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
type Notice={id:string;peer:string;name:string};
export function MobileConnectionAlert({user}:{user:string}){
 const [notice,setNotice]=useState<Notice|null>(null);
 useEffect(()=>{
   const media=window.matchMedia('(max-width:900px)');
   const key='st-connection-alerts-'+user;
   let seen:string[]=[];
   try{seen=JSON.parse(localStorage.getItem(key)??'[]')}catch{}
   let active=true,busy=false;
   async function poll(){
     if(!media.matches||document.hidden||busy)return;
     busy=true;
     try{
       const response=await fetch('/api/connection-alerts',{cache:'no-store'});
       if(!active)return;
       if(!response.ok){setNotice(null);return;}
       const alerts:Notice[]=await response.json();
       if(!active)return;
       const next=alerts.find(n=>!seen.includes(n.id));
       if(next){
         seen=[...seen,next.id];setNotice(next);
         try{localStorage.setItem(key,JSON.stringify(seen))}catch{}
       }else setNotice(current=>alerts.some(n=>n.id===current?.id)?current:null);
     }catch{}finally{busy=false}
   }
   void poll();const timer=setInterval(poll,5000);
   document.addEventListener('visibilitychange',poll);media.addEventListener('change',poll);
   return ()=>{active=false;clearInterval(timer);document.removeEventListener('visibilitychange',poll);media.removeEventListener('change',poll)};
 },[user]);
 return notice?<aside className="connection-popup notice-box" role="status"><span>{notice.name} accepted your connection.</span><Link onClick={()=>setNotice(null)} href={'/dashboard/chats/'+notice.peer}>Open chat</Link><button onClick={()=>setNotice(null)} aria-label="Dismiss notification">×</button></aside>:null;
}
