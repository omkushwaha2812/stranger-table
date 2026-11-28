'use client';
import {useEffect,useTransition} from 'react';import {useRouter} from 'next/navigation';
export function MatchRefresh(){const router=useRouter();const [pending,startTransition]=useTransition();useEffect(()=>{const timer=setInterval(()=>{if(document.visibilityState==='visible')router.refresh();},15000);return()=>clearInterval(timer);},[router]);return <button className="secondary" disabled={pending} onClick={()=>startTransition(()=>router.refresh())}>{pending?'Refreshing…':'Refresh table ↻'}</button>}
