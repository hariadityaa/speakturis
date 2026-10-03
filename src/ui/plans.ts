import { app, choosePlan } from '../app';
import { h, header, type Screen } from './dom';

/** Plan picker. Shown on first run and whenever the current language has no plan. A plan starts the day it is picked. */
export const planPicker: Screen = (root) => {
  const trip = app.pack.meta.trip;
  root.append(header(app.pack.meta.nativeName), h('div', { class: 'plans' },
    h('h2', { class: 'sect' }, 'Pick a study plan'),
    h('p', { class: 'note' }, `It starts today. Trip: ${trip.place}, ${trip.date}.`),
    h('div', { class: 'stack' }, app.pack.schedule.plans.map((p) =>
      h('button', { class: 'btn big', onclick: async () => {
        await choosePlan(p.id);
        if (location.hash.length > 2) location.hash = '#/';
        else window.dispatchEvent(new HashChangeEvent('hashchange'));
      } },
        h('b', null, p.name), h('small', null, p.description))))));
};
