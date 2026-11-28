import Link from 'next/link';
import { requireStudent } from '@/lib/auth';
import { read } from '@/lib/store/db';
import { myConnections } from '@/lib/store/core';
import { TableButton } from '@/components/match-card';
import { saveContact } from './actions';

export default async function Connections({searchParams}: {searchParams: Promise<{error?: string; saved?: string}>}) {
  const {profile} = await requireStudent();
  const connections = read(d => myConnections(d, profile.id));
  const query = await searchParams;
  return <>
    <header className="dash-heading"><p className="eyebrow">The second table</p><h1>Connections.</h1></header>
    {query.error && <p role="alert" className="error-box">{query.error==='time' ? 'Choose a free time within the next 30 days. Resolve any open invitation first. Each connection can send one invitation per hour.' : 'Could not save your contact. Refresh and try again.'}</p>}
    {query.saved && <p role="status" className="notice-box">Your contact preference is saved.</p>}
    {!connections.length && <section className="dash-card"><h2>No mutual connections yet</h2><p>Choose Connect beside a seat at a shared table. When both of you say yes, you’ll see each other here.</p><Link href="/dashboard/matches">Open My Tables →</Link></section>}
    <div className="dash-grid">{connections.map(c=><article className="dash-card" key={c.id}>
      <h2>{c.display_name}</h2>
      <Link className="primary" href={`/dashboard/chats/${c.student_id}`}>Chat with {c.display_name}</Link>
      <Link href="/dashboard/matches">Open a table to invite this connection →</Link>
      <details className="mt-4"><summary>Contact sharing</summary><form className="form-stack" action={saveContact}>
        <input type="hidden" name="id" value={c.id}/>
        <label className="field">Contact you choose to share<input name="contact" maxLength={120} defaultValue={c.my_contact ?? ''}/></label>
        <p>Save a handle or email to opt in. It becomes visible when you both share. Clear the field and save to withdraw.</p>
        <button className="secondary">Save contact preference</button>
      </form>{c.shared_contact && <p>Shared with you: {c.shared_contact}</p>}</details>
      <TableButton id={c.student_id} action="block">Block member</TableButton>
    </article>)}</div>
  </>;
}
