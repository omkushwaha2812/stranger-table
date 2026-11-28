import {read} from './store/db';
import {publicStats} from './store/core';
import {tables, type TableRow} from '@/components/public-content';
type Stats = {completed_meetups: number; active_categories: number; conversation_cards: number};
export async function publicData(): Promise<{rows: TableRow[]; catalogAvailable: boolean; stats: Stats | null}> {
  const fallback = tables.map(({slug, name, description, duration}) => ({slug, name, description, duration}));
  try {
    const index = (slug: string) => { const i = tables.findIndex(t => t.slug === slug); return i < 0 ? 99 : i; };
    return read(d => ({
      rows: d.table_categories.filter(c => c.active).map(({slug, name, description, duration}) => ({slug, name, description, duration}))
        .sort((a, b) => index(a.slug) - index(b.slug)),
      catalogAvailable: true,
      stats: publicStats(d)
    }));
  } catch {
    return {rows: fallback, catalogAvailable: false, stats: null};
  }
}
