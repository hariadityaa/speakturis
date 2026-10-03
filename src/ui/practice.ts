import { app } from '../app';
import { h, header, type Screen } from './dom';

export const practice: Screen = (root) => {
  const { situations } = app.pack.meta;
  const tile = (href: string, title: string, sub: string) =>
    h('a', { class: 'tile', href: `#${href}` }, h('b', null, title), h('small', null, sub));
  root.append(
    header('Practice'),
    h('div', { class: 'grid' },
      tile('/review', 'Review', 'Due cards'),
      tile('/commute', 'Commute', 'Hands-free loop'),
      tile('/flash', 'Phrases', 'Flashcards'),
      situations.includes('signs') ? tile('/flash?tag=signs', 'Signs', 'Sight words') : null,
      app.pack.scripts.systems.length ? tile('/kana', 'Kana', 'Learn and drill') : null,
      tile('/numbers', 'Numbers', 'See and hear'),
      tile('/prices', 'Prices', app.pack.meta.currency.code),
      app.pack.scripts.systems.some((s) => s.wordSets?.length) ? tile('/read', 'Reading', 'Menu words') : null,
      tile('/dialogue', 'Role-play', 'Branching scenes'),
    ),
  );
};
