// Revisions on a sheet, kept as a list. The title block's revision rows
// (fields rev1, revDesc1, revBy1, revDate1, rev2…) show the newest revisions:
// as many as the sheet has rows. A new revision goes on the next row; when
// the rows are full the oldest drops off the sheet (it stays in the list).
// Only the newest revision can be changed: older ones are history.

const KOLOM = { rev: 'rev', revDesc: 'desc', revBy: 'by', revDate: 'date' };
const PATROON = /^(rev|revDesc|revBy|revDate)(\d+)$/;

/** { kol, rij } for a revision-row field (rij from 1), or null. */
export function revVeld(key) {
  const m = PATROON.exec(String(key || ''));
  return m ? { kol: KOLOM[m[1]], rij: +m[2] } : null;
}

/** How many revision rows the sheet's title block has (0 = none). */
export function revRijen(fam) {
  let n = 0;
  for (const v of fam?.fields || []) { const r = revVeld(v.key); if (r && r.rij > n) n = r.rij; }
  return n;
}

/** The revision list: values.revs, or built from the row values of older sheets. */
export function revLijst(stamp) {
  const v = stamp?.values || {};
  if (Array.isArray(v.revs)) return v.revs;
  const n = revRijen(stamp?.family);
  const uit = [];
  for (let i = 1; i <= n; i++) {
    const r = { rev: v[`rev${i}`] || '', desc: v[`revDesc${i}`] || '', by: v[`revBy${i}`] || '', date: v[`revDate${i}`] || '' };
    if (r.rev || r.desc || r.by || r.date) uit.push(r);
  }
  return uit;
}

/** Which revision a row shows: its index in the list (may be past the end). */
export function revIndex(stamp, rij) {
  const n = revRijen(stamp?.family), lijst = revLijst(stamp);
  return Math.max(0, lijst.length - n) + rij - 1;
}

/** The text of a revision-row field, or null if the field is not one. */
export function revTekst(veld, stamp) {
  const r = revVeld(veld.key);
  if (!r) return null;
  const item = revLijst(stamp)[revIndex(stamp, r.rij)];
  return item ? item[r.kol] || '' : '';
}

/** The next revision code: A → B, 1 → 2, P1 → P2, C3 → C4. */
export function volgendeRev(code) {
  const c = String(code || '').trim();
  if (!c) return 'A';
  const m = /^(.*?)(\d+)$/.exec(c);
  if (m) return `${m[1]}${+m[2] + 1}`;
  if (/^[A-Y]$/i.test(c)) return String.fromCharCode(c.charCodeAt(0) + 1);
  return `${c}1`;
}

/** Values with the revision list changed: `wijzig(lijst)` returns the new list. */
export function metRevs(stamp, wijzig) {
  const lijst = wijzig(revLijst(stamp).map((r) => ({ ...r })));
  const waarden = { ...(stamp.values || {}), revs: lijst };
  // The Rev box of the title block follows the newest revision.
  const laatste = lijst[lijst.length - 1];
  if ((stamp.family?.fields || []).some((f) => f.key === 'rev')) waarden.rev = laatste?.rev || '';
  return waarden;
}
