'use client';
import {useState} from 'react';

export function DownloadCard({total,badges}:{total:number;badges:string[]}) {
  const [error,setError]=useState(false);
  function download() {
    const canvas=document.createElement('canvas');
    canvas.width=1080; canvas.height=760;
    const pen=canvas.getContext('2d');
    if (!pen) {setError(true);return;}
    pen.fillStyle='#193e36'; pen.fillRect(0,0,1080,760);
    pen.strokeStyle='#c8b485'; pen.strokeRect(34,34,1012,692);
    pen.fillStyle='#e8d7ac'; pen.font='28px sans-serif'; pen.fillText('STRANGER TABLE',80,112);
    pen.fillStyle='#fff8e8'; pen.font='76px Georgia'; pen.fillText('My conversation passport',80,238);
    pen.font='38px sans-serif'; pen.fillText(total+' completed '+(total===1?'table':'tables'),80,338);
    pen.font='30px Georgia'; pen.fillText(badges.length+' of 6 stamps earned',80,421);
    pen.font='26px sans-serif'; badges.forEach((b,i)=>pen.fillText(b,80+(i%2)*460,500+Math.floor(i/2)*58));
    const a=document.createElement('a'); a.download='stranger-passport.png'; a.href=canvas.toDataURL('image/png'); a.click();
  }
  return <><button className="dash-light" onClick={download}>Download achievement card</button>{error&&<p role="alert">Image export is unavailable in this browser.</p>}</>;
}
