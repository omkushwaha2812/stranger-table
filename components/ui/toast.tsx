'use client';
import {useEffect,useState} from 'react';import {X} from 'lucide-react';
export function Toast({message,kind='notice'}:{message:string;kind?:'notice'|'error'}){const [visible,setVisible]=useState(true);useEffect(()=>{setVisible(true)},[message]);return visible?<div className={`toast-message ${kind==='error'?'error-box':'notice-box'}`} role={kind==='error'?'alert':'status'}><span>{message}</span><button type="button" aria-label="Dismiss notification" onClick={()=>setVisible(false)}><X size={18}/></button></div>:null;}
