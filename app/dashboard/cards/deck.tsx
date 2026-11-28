'use client';
import { useState } from 'react';
import { Shuffle, Bookmark } from 'lucide-react';
import { setFavourite } from './actions';

type Card = {id: string; question: string; category: string};
export function CardDeck({cards,saved}: {cards: Card[]; saved: string[]}) {
  const [category,setCategory]=useState('');
  const [onlySaved,setOnlySaved]=useState(false);
  const [favourites,setFavourites]=useState(new Set(saved));
  const [selected,setSelected]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const deck=cards.filter(c=>(!category || category===c.category) && (!onlySaved || favourites.has(c.id)));
  const card=deck.find(c=>c.id===selected) ?? deck[0];
  function shuffle() {
    const others=deck.filter(c=>c.id!==card.id);
    if (others.length) setSelected(others[Math.floor(Math.random()*others.length)].id);
  }
  async function toggle() {
    setBusy(true);
    setError('');
    const save=!favourites.has(card.id);
    try {
      if (!await setFavourite(card.id,save)) throw new Error();
      setFavourites(previous=>{
        const next=new Set(previous);
        if (save) next.add(card.id); else next.delete(card.id);
        return next;
      });
    } catch { setError('Could not update your favourites. Try again.'); }
    finally { setBusy(false); }
  }
  return <section>
    <div className="deck-toolbar"><label className="field">Category<select value={category} onChange={e=>setCategory(e.target.value)}>
      <option value="">All categories</option>{Array.from(new Set(cards.map(c=>c.category))).map(c=><option key={c}>{c}</option>)}
    </select></label><label><input type="checkbox" checked={onlySaved} onChange={e=>setOnlySaved(e.target.checked)}/> Favourites only</label></div>
    {card ? <><article key={card.id} className="question-sheet" aria-live="polite">
      <p>{card.category}</p><h2>{card.question}</h2></article><div className="dash-actions">
      <button className="primary" disabled={deck.length<2} onClick={shuffle}><Shuffle size={17}/> Shuffle</button>
      <button className="secondary" disabled={busy} aria-pressed={favourites.has(card.id)} onClick={toggle}><Bookmark size={17}/>{favourites.has(card.id)?'Remove favourite':'Save favourite'}</button>
    </div></>:<p className="dash-empty">{onlySaved?'No favourites in this selection. Turn off the filter to browse cards.':'No active cards in this category.'}</p>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
