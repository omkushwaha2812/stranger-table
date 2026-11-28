import { Award, LockKeyhole } from 'lucide-react';
import { loadPassport } from '@/lib/passport';
import { DownloadCard } from './download';

export default async function Passport() {
  const book=await loadPassport();
  return <><header className="dash-heading"><h1>Stranger Passport.</h1></header>
    <section className="passport-cover"><p>Conversation record</p>
      <h2>{book.completed} completed {book.completed===1?'table':'tables'}</h2>
      <p>{book.departments} cities explored · {book.categories} of 6 categories explored</p>
      <DownloadCard total={book.completed} badges={book.badges.filter(b=>b.earned).map(b=>b.name)}/>
    </section><h2 className="dash-section">Your stamps</h2><div className="dash-grid">
    {book.badges.map(b=><article key={b.slug} className="dash-card">
      {b.earned?<Award aria-label="Earned"/>:<LockKeyhole aria-label="Locked"/>}
      <h2>{b.name}</h2><p>{b.description}</p>
      <progress aria-label={b.name} value={b.earned?b.target:Math.min(b.progress,b.target)} max={b.target}/>
      <p>{b.earned?'Stamp earned':Math.min(b.progress,b.target)+' of '+b.target}</p>
    </article>)}</div></>;
}
