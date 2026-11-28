import Link from 'next/link';
import {requireAdmin} from '@/lib/auth';
import {dateLabel} from '@/lib/matches';
import {read} from '@/lib/store/db';

export default async function Page({searchParams}:{searchParams:Promise<{before?:string}>}) {
  const {before} = await searchParams;
  await requireAdmin();
  const limit = before && /^\d{1,18}$/.test(before) ? Number(before) : Infinity;
  const {data, names} = read(d => {
    const rows = d.portal_activity.filter(r => r.id < limit).sort((a, b) => b.id - a.id).slice(0, 51);
    const ids = new Set(rows.flatMap(r => [r.actor_id, r.subject_id]));
    return {data: rows, names: new Map<string | null, string>(d.profiles.filter(p => ids.has(p.id)).map(p => [p.id, p.display_name]))};
  });
  const events = data.slice(0,50);
  return <main className="dash-main">
    <header className="dash-heading">
      <Link href="/admin">← Administration</Link><h1>Activity log</h1>
      <p>Account, matching and moderation events. Times are in India Standard Time.</p>
      <Link href="/admin/activity">Show latest</Link>
    </header>
    {events.length===0 && <p>No activity on this page yet.</p>}
    {events.map(row => <article className="dash-card mb-3" key={row.id}>
      <strong>{row.event}{row.state ? ' · '+row.state : ''}</strong>
      <p>{dateLabel(row.occurred_at)} · {names.get(row.actor_id) ?? row.actor_id ?? 'System'}</p>
      {row.subject_id && row.actor_id!==row.subject_id && <small>Related record · {names.get(row.subject_id) ?? row.subject_id}</small>}
    </article>)}
    {(data?.length??0)>50 && <Link href={'/admin/activity?before='+events[events.length-1].id}>Older events →</Link>}
  </main>;
}
