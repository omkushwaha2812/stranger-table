import Link from 'next/link';
import {requireAdmin} from '@/lib/auth';
import {logout} from '@/app/auth/actions';
import {AuthShell} from '@/components/auth-shell';
import {read} from '@/lib/store/db';
import {resetStudentPassword, setStudentAccess} from './actions';

export default async function Page({searchParams}:{searchParams:Promise<{error?:string;notice?:string}>}) {
  await requireAdmin();
  const q = await searchParams;
  const students = read(d => d.profiles.filter(p => p.role === 'student')
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(p => ({id: p.id, display_name: p.display_name, city: p.city, verification: p.verification, active: p.active,
      onboarding_complete: p.onboarding_complete, email: d.users.find(u => u.id === p.id)?.email ?? ''})));
  return <AuthShell title="Community administration" subtitle="Review member activity and manage account access." error={q.error} notice={q.notice}>
    <Link href="/">Visit homepage</Link><Link className="primary" href="/admin/activity">View activity log</Link>
    
    <h2>Member accounts ({students.length})</h2>
    {!students.length && <p>No member profiles yet.</p>}
    {students.map(student => {
      const enabled = student.active && student.verification === 'approved';
      return <div key={student.id} className="form-stack option">
        <strong>{student.display_name} · {student.city}</strong>
        <p>{student.email} · {enabled ? 'Active' : 'Access restricted'}{student.onboarding_complete ? '' : ' · preferences not finished'}</p>
        <form action={setStudentAccess}>
          <input type="hidden" name="id" value={student.id}/>
          <button className="secondary" name="action" value={enabled?'suspend':'restore'}>{enabled?'Suspend access':'Restore access'}</button>
        </form>
        <details><summary>Set temporary password</summary>
          <form action={resetStudentPassword} className="form-stack">
            <input type="hidden" name="id" value={student.id}/>
            <label className="field">Temporary password (8+ characters)<input name="password" type="text" minLength={8} maxLength={72} required autoComplete="off"/></label>
            <button className="secondary">Set password</button>
          </form>
        </details>
      </div>;
    })}
    <form action={logout}><button className="secondary">Sign out</button></form>
  </AuthShell>;
}
