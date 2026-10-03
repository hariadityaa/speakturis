import { app } from '../app';
import { h, header, type Screen } from './dom';

export const practice: Screen = (root) => {
  const tile = (href: string, title: string, sub: string) =>
    h('a', { class: 'tile', href: `#${href}` }, h('b', null, title), h('small', null, sub));
  root.append(
    header('Practice'),
    h('div', { class: 'grid' },
      tile('/review', 'Review', 'Due cards'),
      tile('/commute', 'Commute', 'Hands-free loop'),
      tile('/flash', 'Phrases', 'Flashcards'),
      tile('/kana', 'Kana', 'Learn and drill'),
      tile('/numbers', 'Numbers', 'See and hear'),
      tile('/prices', 'Prices', app.pack.meta.currency.code),
      tile('/read', 'Reading', 'Menu words'),
      tile('/dialogue', 'Role-play', 'Branching scenes'),
    ),
  );
};
