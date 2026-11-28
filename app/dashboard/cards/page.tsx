import { requireStudent } from '@/lib/auth';
import { read } from '@/lib/store/db';
import { CardDeck } from './deck';

export default async function Cards() {
  const { profile } = await requireStudent();
  const { cards, saved } = read(d => ({
    cards: d.conversation_cards.filter(c => c.active).map(({id, question, category}) => ({id, question, category}))
      .sort((a, b) => a.category.localeCompare(b.category) || a.question.localeCompare(b.question)),
    saved: d.favourite_cards.filter(f => f.user_id === profile.id).map(f => f.card_id)
  }));
  return <><header className="dash-heading"><h1>Conversation cards.</h1></header>
    <CardDeck cards={cards} saved={saved}/></>;
}
