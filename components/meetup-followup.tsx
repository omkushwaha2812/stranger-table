import Link from 'next/link';
import { requireStudent } from '@/lib/auth';
import type { Match } from '@/lib/matches';
import { saveFeedback, voteConnection } from '@/app/dashboard/connections/actions';
import { read } from '@/lib/store/db';
import { myFeedback, myVote } from '@/lib/store/core';

function Choice({name, label}: {name: string; label: string}) {
  return <label className="field">{label}
    <select name={name} defaultValue="" required>
      <option value="" disabled>Choose an answer</option>
      <option value="yes">Yes</option><option value="no">No</option>
    </select>
  </label>;
}

export async function MeetupFollowup({match}: {match: Match}) {
  if (!['confirmed', 'completed', 'no_show'].includes(match.status) || Date.parse(match.ends_at) > Date.now()) return null;
  const {profile} = await requireStudent();
  if (match.status === 'completed' && match.profile) {
    const vote = {data: read(d => myVote(d, profile.id, match.id))};
    return <section className="dash-card mt-4"><h2>The second table</h2>
      {vote.data ? <p>Your private choice is saved.</p> : <form action={voteConnection} className="form-stack">
        <input type="hidden" name="id" value={match.id}/>
        <Choice name="choice" label="Would you like to stay connected?"/>
        <p>A connection appears when you both choose yes.</p>
        <button className="primary">Save my choice</button>
      </form>}
      <Link href="/dashboard/connections">My connections →</Link>
    </section>;
  }
  if (match.status !== 'confirmed') return null;
  const response = {data: read(d => myFeedback(d, profile.id, match.id))};
  return <section className="dash-card mt-4"><h2>How did your table go?</h2>
    {response.data ? <p>Your response is saved. Both students must confirm attendance for this table to count as completed.</p> :
      <><details className="mt-4"><summary>Yes, we met</summary><form action={saveFeedback} className="form-stack">
        <input type="hidden" name="id" value={match.id}/>
        <input type="hidden" name="happened" value="yes"/>
        <label className="field">How was your experience?<select name="experience" defaultValue="" required>
          <option value="" disabled>Rate the experience</option>{['1 · Poor','2 · Fair','3 · Okay','4 · Good','5 · Great'].map((x,i)=><option key={x} value={i+1}>{x}</option>)}
        </select></label>
        <Choice name="comfortable" label="Did you feel comfortable?"/>
        <Choice name="again" label="Would you like to meet this person again?"/>
        <label className="field">Private feedback (optional)<textarea name="note" maxLength={2000}/></label>
        <p>Your answers are private from the other student. Moderators can review feedback.</p>
        <button className="primary">Submit feedback</button>
      </form></details>
      <details className="mt-4"><summary>No, we didn’t meet</summary><form action={saveFeedback} className="form-stack">
        <input type="hidden" name="id" value={match.id}/><input type="hidden" name="happened" value="no"/>
        <label className="field">Private note (optional)<textarea name="note" maxLength={2000}/></label>
        <button className="secondary">Confirm we didn’t meet</button>
      </form></details></>}
  </section>;
}
