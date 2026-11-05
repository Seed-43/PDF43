// Stamp families, like Revit families: a family defines the stamp's look and
// its parameters. Every placed stamp of a family shares the family's
// parameter values; changing one updates all stamps of that family in the
// file. Automatic parameters (page, file name, placed date) are per stamp.
//
// Families live in this computer's local storage; each placed stamp also
// carries a snapshot of its family, so a file shows the same anywhere.

const OPSLAG = 'seed43.stampFamilies';

/** Field kinds: text, choice (options), date, and auto (page / file / placed). */
export const AUTO = { page: 'Page', file: 'File name', placed: 'Date placed' };

export const STANDAARD = [
  {
    id: 'qa',
    name: 'QA',
    title: 'QA CHECK',
    color: '#c0392b',
    width: 180,
    fields: [
      { key: 'status', label: 'Status', kind: 'choice', options: ['Approved', 'Approved as noted', 'Revise and resubmit', 'Rejected'], value: 'Approved' },
      { key: 'checkedBy', label: 'Checked by', kind: 'text', value: '' },
      { key: 'date', label: 'Date', kind: 'date', value: '' },
    ],
  },
];

const kopie = (x) => JSON.parse(JSON.stringify(x));

export function nieuwId() {
  return 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function sleutelVan(label, bestaand = []) {
  let k = String(label || 'field').toLowerCase().replace(/[^a-z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : '')).replace(/^[^a-z]+/, '') || 'field';
  let n = 2, uit = k;
  while (bestaand.includes(uit)) uit = `${k}${n++}`;
  return uit;
}

export function laadFamilies() {
  try {
    const v = JSON.parse(localStorage.getItem(OPSLAG) || 'null');
    if (Array.isArray(v) && v.length) return v.filter(geldig);
  } catch {}
  return kopie(STANDAARD);
}

export function bewaarFamilies(families) {
  try { localStorage.setItem(OPSLAG, JSON.stringify(families)); } catch {}
}

export function geldig(f) {
  return f && typeof f.id === 'string' && typeof f.name === 'string' && Array.isArray(f.fields);
}

/** Starting values for a new stamp: the family's defaults. */
export function standaardWaarden(familie) {
  const uit = {};
  for (const f of familie.fields) if (f.kind !== 'auto') uit[f.key] = f.value ?? '';
  return uit;
}
