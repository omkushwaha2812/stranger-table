import Link from 'next/link';
import {requireStudent} from '@/lib/auth';
import {read} from '@/lib/store/db';
import {visibleRooms} from '@/lib/store/rooms';
import {eligible,isBlocked} from '@/lib/store/core';
import {RoomForm} from '@/components/room-form';
export default async function Page({searchParams}:{searchParams:Promise<{error?:string;category?:string}>}) {
  const {profile}=await requireStudent();
  const query=await searchParams;
  if(!profile.onboarding_complete) return <section className="dash-card"><h1>Set up your first table</h1><Link href="/onboarding">Set your preferences →</Link></section>;
  const tables=read(d=>{
    const rooms=visibleRooms(d,profile.id);
    return d.table_categories.filter(c=>c.active).map(c=>{
      const room=rooms.find(r=>r.category===c.id);
      const visible=room?.members.filter(id=>eligible(d,id)&&!isBlocked(d,profile.id,id))??[];
      const nearby=visible.some(id=>id!==profile.id && profile.city?.trim() && d.profiles.find(p=>p.id===id)?.city?.trim().toLowerCase()===profile.city.trim().toLowerCase());
      return {category:c,id:room?.id,count:visible.length,joined:visible.includes(profile.id),nearby};
    }).sort((a,b)=>Number(b.category.id===query.category)-Number(a.category.id===query.category)||Number(b.nearby)-Number(a.nearby));
  });
  return <><header className="dash-heading"><h1>Choose your table.</h1><p>Take a seat to see who’s here and connect privately.</p></header>
    {query.error && <p className="error-box">{query.error}</p>}
    <div className="dash-grid">{tables.map(t=><section className="dash-card" key={t.category.id}>
      <h2>{t.category.name}</h2><p>{t.count ? t.count+' seated' : 'Be the first to take a seat'}</p>
      {t.joined?<Link href={'/dashboard/matches/'+t.id}>View seats →</Link>:<RoomForm id={t.category.id} action="create"><button className="primary">Join table</button></RoomForm>}
    </section>)}</div></>;
}
