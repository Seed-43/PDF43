// node --test test/autolink.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planLinks, bubbels, tekstVakken, alGelinkt } from '../src/links/autolink.js';

// A text item as readPageContent gives it: baseline origin, horizontal.
const t = (text, x, y, h = 8) => ({ text, x, y, width: text.length * h * 0.6, height: h, transform: [h, 0, 0, h, x, y] });
// The title block sheet number, larger than the bubbles.
const blad = (s) => t(s, 1100, 820, 14);

test('plan bubble and detail title link to each other', () => {
  const r = planLinks([
    { page: 1, items: [blad('S1.02'), t('SD32', 300, 200), t('S4.03', 298, 211), t('NOTE 1:100', 50, 50)] },
    { page: 2, items: [blad('S4.03'), t('SD32', 600, 400), t('S1.02', 598, 411)] },
  ]);
  assert.equal(r.links.length, 2);
  const [a, b] = r.links.sort((x, y) => x.page - y.page);
  assert.deepEqual([a.page, a.label, a.sheet, a.target.page], [1, 'SD32', 'S4.03', 2]);
  assert.ok(a.target.box && a.target.box.x < 600 && a.target.box.x + a.target.box.width > 600);
  assert.deepEqual([b.page, b.target.page], [2, 1]);
  assert.ok(b.target.box.x < 300 && b.target.box.x + b.target.box.width > 300);
});

test('no partner: the link goes to the sheet; unknown sheet: reported', () => {
  const r = planLinks([
    { page: 1, items: [blad('S1.01'), t('3', 107.6, 100), t('S2.01', 98, 111), t('4', 207.6, 100), t('S9.99', 198, 111)] },
    { page: 2, items: [blad('S2.01')] },
  ]);
  assert.equal(r.links.length, 1);
  assert.equal(r.links[0].target.box, null);
  assert.deepEqual(r.zonderDoel.map((z) => z.sheet), []);   // S9.99 is no sheet of the set, so no bubble
});

test('a drawing list of sheet numbers is no bubble; rotated text is ignored', () => {
  const vakken = tekstVakken([t('S1.01', 30, 100), t('S1.02', 30, 111), { text: 'SD1', x: 0, y: 0, width: 20, height: 8, transform: [0, 8, -8, 0, 0, 0] }]);
  assert.equal(vakken.length, 2);
  assert.equal(bubbels(vakken, new Set(['S1.01', 'S1.02'])).length, 0);
});

test('an existing link over the bubble is kept', () => {
  assert.ok(alGelinkt([{ type: 'link', page: 3, x: 0, y: 0, width: 50, height: 50 }], 3, { x: 10, y: 10, width: 20, height: 20 }));
  assert.ok(!alGelinkt([{ type: 'link', page: 4, x: 0, y: 0, width: 50, height: 50 }], 3, { x: 10, y: 10, width: 20, height: 20 }));
});
