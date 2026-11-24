// Stamp families, like Revit families: a family defines the stamp's look and
// its parameters. Every placed stamp of a family shares the family's
// parameter values; changing one updates all stamps of that family in the
// file. Parameters marked "per stamp" (a sheet's drawing number, say) belong
// to each stamp, and automatic ones (page, file name, placed date) too.
//
// Families live in this computer's local storage; each placed stamp also
// carries a snapshot of its family, so a file shows the same anywhere.
//
// Groups: stamp (placed by clicking), sheet (drawing sheets, fitted to the
// page and kept behind everything), form (A4 forms, usually a new PDF).

import { STANDAARD_BLADEN, STANDAARD_FORMULIEREN } from './sheets.js';

const OPSLAG = 'seed43.stampFamilies';

/** Field kinds. */
export const SOORTEN = {
  text: 'Text', choice: 'Choice list', check: 'Tick one (boxes)', date: 'Date', initials: 'Initials',
  auto: 'Automatic', profile: 'From my details', signature: 'My signature',
};
export const AUTO = {
  page: 'Page', pages: 'Number of pages', sheetOf: 'Sheet x of y', file: 'File name',
  placed: 'Date placed', time: 'Time placed', today: 'Today',
};
export const LAYOUTS = { table: 'Table', banner: 'Banner', diagonal: 'Diagonal', placed: 'Placed boxes (sheet or picture)' };
export const GROEPEN = { stamp: 'Stamps', sheet: 'Sheets', form: 'Memos' };

const NIET_VOOR_BOUW = ['Draft', 'Preliminary', 'For Coordination', 'For Tender', 'For Information', 'For Peer Review'];
const STATUS_KLEUR = {
  Draft: '#7a7a7a', Preliminary: '#c77700', 'For Coordination': '#c77700', 'For Tender': '#2c6fbb',
  'For Building Consent': '#2c6fbb', 'For Resource Consent': '#2c6fbb', 'For Construction': '#1e7d32',
  'For Information': '#6a4fb3', 'For Peer Review': '#6a4fb3', 'Contract Documents': '#1e7d32',
  Superseded: '#c0392b', Void: '#c0392b',
};

const datumVeld = (extra = {}) => ({ key: 'date', label: 'Date', kind: 'date', value: '', ...extra });

export const STANDAARD_STEMPELS = [
  {
    id: 'qa', name: 'QA', title: 'QA CHECK', color: '#c0392b', width: 180,
    fields: [
      { key: 'status', label: 'Status', kind: 'choice', options: ['Approved', 'Approved as noted', 'Revise and resubmit', 'Rejected'], value: 'Approved' },
      { key: 'checkedBy', label: 'Checked by', kind: 'text', value: '' },
      datumVeld(),
    ],
  },
  {
    id: 's43-issue', name: 'Issue status', layout: 'banner', builtin: true, color: '#2c6fbb',
    colorBy: { key: 'status', map: STATUS_KLEUR },
    lines: [
      { text: '{status}', size: 'l', bold: true },
      { text: 'NOT FOR CONSTRUCTION', size: 'm', bold: true, when: { key: 'status', in: NIET_VOOR_BOUW } },
      { text: '{date}   Rev {rev}', size: 's' },
    ],
    fields: [
      { key: 'status', label: 'Status', kind: 'choice', value: 'Preliminary', options: ['Draft', 'Preliminary', 'For Coordination', 'For Tender', 'For Building Consent', 'For Resource Consent', 'For Construction', 'For Information', 'For Peer Review', 'Contract Documents', 'Superseded', 'Void'] },
      datumVeld(),
      { key: 'rev', label: 'Revision', kind: 'text', value: '' },
    ],
  },
  {
    id: 's43-bc-approved', name: 'Approved BC drawings', layout: 'banner', builtin: true, color: '#1e7d32',
    lines: [
      { text: 'APPROVED BC DRAWINGS', size: 'm', bold: true },
      { text: 'FOR CONSTRUCTION', size: 'l', bold: true },
      { text: 'BC {bc}   {council}', size: 's' },
      { text: 'Approved {date}', size: 's' },
    ],
    fields: [
      { key: 'bc', label: 'BC number', kind: 'text', value: '' },
      { key: 'council', label: 'Council', kind: 'text', value: '' },
      datumVeld({ label: 'Date approved' }),
    ],
  },
  {
    id: 's43-shop-review', name: 'Shop drawing review', builtin: true, title: 'SHOP DRAWING REVIEW', color: '#2c6fbb', width: 220,
    lines: [{ text: '{company}', size: 's', bold: true }],
    note: 'This review is solely to check conformance with the design requirements. The contractor remains responsible for coordinating and confirming all dimensions, including site measurements.',
    fields: [
      { key: 'company', label: 'Company', kind: 'profile', from: 'company', hidden: true },
      { key: 'status', label: 'Drawing status', kind: 'check', perStamp: true, value: '', options: [
        'A  No exceptions taken: production may commence, subject to review by others',
        'B  Minor comments noted: production may commence, subject to review by others',
        'C  Comments noted: amend and resubmit for further review',
      ] },
      { key: 'reviewedBy', label: 'Reviewed by', kind: 'profile', from: 'name' },
      datumVeld({ perStamp: true }),
    ],
  },
  {
    id: 's43-qa-cover', name: 'QA check set (cover sheet)', builtin: true, title: 'CHECK SET', color: '#c0392b', width: 210,
    note: 'All work is QA checked before issue. Use the QA colours, and cloud each QA markup once it is done.',
    fields: [
      { key: 'hold', label: 'Hold point (NZCIC)', kind: 'check', value: '', options: ['30% Concept design', '50% Preliminary design', '80% Developed design', '100% Detailed design'] },
      { key: 'check1', label: 'Check 1 (drafter)', kind: 'initials', value: '' },
      { key: 'check2', label: 'Check 2 (senior drafter)', kind: 'initials', value: '' },
      { key: 'check3', label: 'Check 3 (design engineer)', kind: 'initials', value: '' },
      { key: 'approved', label: 'Approved (PS1 engineer)', kind: 'initials', value: '' },
      datumVeld({ label: 'QA completed' }),
    ],
  },
  {
    id: 's43-qa-sheet', name: 'QA check set (all sheets)', builtin: true, title: 'CHECK SET', color: '#c0392b', width: 140,
    fields: [
      { key: 'check1', label: 'Check 1', kind: 'initials', value: '' },
      { key: 'check2', label: 'Check 2', kind: 'initials', value: '' },
      { key: 'check3', label: 'Check 3', kind: 'initials', value: '' },
      { key: 'approved', label: 'Approved', kind: 'initials', value: '' },
      datumVeld(),
    ],
  },
  {
    id: 's43-cpeng', name: 'CPEng design check', builtin: true, title: 'DESIGN CHECK', color: '#1f4e79', width: 210,
    lines: [{ text: 'Drawings checked for items included in our calculations only.', size: 's' }],
    fields: [
      { key: 'company', label: 'For', kind: 'profile', from: 'company' },
      { key: 'name', label: 'Name', kind: 'profile', from: 'name' },
      { key: 'cpeng', label: 'CPEng no.', kind: 'profile', from: 'cpeng' },
      { key: 'signature', label: 'Signed', kind: 'signature', from: 'signature' },
      datumVeld(),
    ],
  },
  {
    id: 's43-design-intent', name: 'Design intent review', builtin: true, title: 'DESIGN INTENT REVIEW', color: '#1f4e79', width: 210,
    lines: [{ text: 'Reviewed and in line with our design intent, as covered by our PS1 and calculations.', size: 's' }],
    fields: [
      { key: 'received', label: 'Received', kind: 'date', value: '', perStamp: true },
      { key: 'reviewed', label: 'Reviewed', kind: 'date', value: '', perStamp: true },
      { key: 'name', label: 'Signed', kind: 'profile', from: 'name' },
      { key: 'signature', label: 'Signature', kind: 'signature', from: 'signature' },
    ],
  },
  { id: 's43-nts', name: 'Not to scale', layout: 'banner', builtin: true, color: '#1f2328', lines: [{ text: 'NOT TO SCALE', size: 'm', bold: true }], fields: [] },
  {
    id: 's43-date', name: 'Date', layout: 'banner', builtin: true, color: '#1f2328',
    lines: [{ text: '{date}', size: 'm', bold: true }],
    fields: [datumVeld({ perStamp: true }), { key: 'format', label: 'Date format', kind: 'choice', value: 'dd/mm/yyyy', options: ['dd/mm/yyyy', 'd Mmm yyyy', 'yyyy-mm-dd'] }],
  },
  {
    id: 's43-datetime', name: 'Date and time', layout: 'banner', builtin: true, color: '#1f2328',
    lines: [{ text: '{placed}  {time}', size: 'm', bold: true }],
    fields: [{ key: 'placed', label: 'Date', kind: 'auto', auto: 'placed' }, { key: 'time', label: 'Time', kind: 'auto', auto: 'time' },
      { key: 'format', label: 'Date format', kind: 'choice', value: 'dd/mm/yyyy', options: ['dd/mm/yyyy', 'd Mmm yyyy', 'yyyy-mm-dd'] }],
  },
  {
    id: 's43-released', name: 'Released / Revised', layout: 'banner', builtin: true, color: '#2c6fbb',
    lines: [{ text: '{state}', size: 'l', bold: true }, { text: '{file}', size: 's' }, { text: '{placed}  {time}', size: 's' }],
    fields: [
      { key: 'state', label: 'Stamp', kind: 'choice', value: 'Released', options: ['Released', 'Revised'], perStamp: true },
      { key: 'file', label: 'File', kind: 'auto', auto: 'file' },
      { key: 'placed', label: 'Date', kind: 'auto', auto: 'placed' },
      { key: 'time', label: 'Time', kind: 'auto', auto: 'time' },
    ],
  },
  {
    id: 's43-confidential', name: 'Confidential / Proprietary', layout: 'banner', builtin: true, color: '#c0392b',
    lines: [{ text: '{label}', size: 'm', bold: true }],
    fields: [{ key: 'label', label: 'Text', kind: 'choice', value: 'CONFIDENTIAL', options: ['CONFIDENTIAL', 'PROPRIETARY: DO NOT DISTRIBUTE', 'COMMERCIAL IN CONFIDENCE'] }],
  },
  {
    id: 's43-rfi', name: 'RFI reference', builtin: true, title: 'RFI', color: '#6a4fb3', width: 150,
    fields: [
      { key: 'rfi', label: 'RFI no.', kind: 'text', value: '', perStamp: true },
      datumVeld({ label: 'Raised', perStamp: true }),
      { key: 'responseBy', label: 'Response by', kind: 'date', value: '', blank: true, perStamp: true },
    ],
  },
  {
    id: 's43-inspection', name: 'Inspection', builtin: true, title: 'INSPECTION', color: '#1e7d32', width: 170,
    fields: [
      { key: 'type', label: 'Inspection', kind: 'choice', value: 'Pre-pour', perStamp: true, options: ['Pre-pour', 'Pre-line', 'Steel erection', 'Bracing', 'Foundations', 'Final'] },
      { key: 'result', label: 'Result', kind: 'check', value: '', perStamp: true, options: ['Pass', 'Fail', 'Re-inspect'] },
      { key: 'inspector', label: 'Inspector', kind: 'profile', from: 'name' },
      datumVeld({ perStamp: true }),
    ],
  },
  {
    id: 's43-ps', name: 'Producer statement issued', layout: 'banner', builtin: true, color: '#1f4e79',
    lines: [{ text: '{ps} ISSUED', size: 'm', bold: true }, { text: 'No. {number}   {date}', size: 's' }],
    fields: [
      { key: 'ps', label: 'Producer statement', kind: 'choice', value: 'PS1', options: ['PS1', 'PS2', 'PS3', 'PS4'], perStamp: true },
      { key: 'number', label: 'Number', kind: 'text', value: '', perStamp: true },
      datumVeld({ perStamp: true }),
    ],
  },
  {
    id: 's43-superseded', name: 'Superseded / Void', layout: 'diagonal', builtin: true, color: '#c0392b', width: 360,
    lines: [{ text: '{state}', size: 'l', bold: true }, { text: 'Replaced by {replacedBy}', size: 's' }, { text: '{date}', size: 's' }],
    fields: [
      { key: 'state', label: 'Stamp', kind: 'choice', value: 'SUPERSEDED', options: ['SUPERSEDED', 'VOID', 'NOT ISSUED'], perStamp: true },
      { key: 'replacedBy', label: 'Replaced by', kind: 'text', value: '', perStamp: true },
      datumVeld({ perStamp: true }),
    ],
  },
  {
    id: 's43-page', name: 'Page number', layout: 'banner', builtin: true, color: '#1f2328', autoWidth: true,
    lines: [{ text: '{sheet}', size: 'm', bold: true }],
    fields: [{ key: 'sheet', label: 'Page', kind: 'auto', auto: 'sheetOf' }],
  },
];

/** Every built-in family, stamps first. */
export const STANDAARD = [...STANDAARD_STEMPELS, ...STANDAARD_BLADEN, ...STANDAARD_FORMULIEREN];

const kopie = (x) => JSON.parse(JSON.stringify(x));

export const groepVan = (f) => (f?.group in GROEPEN ? f.group : 'stamp');

export function nieuwId() {
  return 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function sleutelVan(label, bestaand = []) {
  let k = String(label || 'field').toLowerCase().replace(/[^a-z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : '')).replace(/^[^a-z]+/, '') || 'field';
  let n = 2, uit = k;
  while (bestaand.includes(uit)) uit = `${k}${n++}`;
  return uit;
}

const WEG = `${OPSLAG}.deleted`;

function leesWeg() {
  try { return new Set(JSON.parse(localStorage.getItem(WEG) || '[]')); } catch { return new Set(); }
}

/** The user deleted a built-in family: don't add it back on the next start. */
export function merkVerwijderd(id) {
  if (!STANDAARD.some((f) => f.id === id)) return;
  const weg = leesWeg(); weg.add(id);
  try { localStorage.setItem(WEG, JSON.stringify([...weg])); } catch {}
}

/** A deleted built-in put back (Reset, or a family of that id saved again). */
export function merkTerug(id) {
  const weg = leesWeg();
  if (weg.delete(id)) try { localStorage.setItem(WEG, JSON.stringify([...weg])); } catch {}
}

/**
 * Stored families, with every built-in family added that is not in them and
 * that the user did not delete. A built-in the user changed stays as they
 * left it. (Deletes are recorded on their own: an earlier test build marked
 * built-ins as seen without saving them, so they went missing.)
 */
export function laadFamilies() {
  let lijst = null;
  try {
    const v = JSON.parse(localStorage.getItem(OPSLAG) || 'null');
    if (Array.isArray(v) && v.length) lijst = v.filter(geldig);
  } catch {}
  if (!lijst) lijst = [];
  const weg = leesWeg();
  const bekend = new Set(lijst.map((f) => f.id));
  const nieuw = STANDAARD.filter((f) => !bekend.has(f.id) && !weg.has(f.id));
  for (const f of nieuw) lijst.push(kopie(f));
  if (nieuw.length) bewaarFamilies(lijst);
  return lijst;
}

export function bewaarFamilies(families) {
  try { localStorage.setItem(OPSLAG, JSON.stringify(families)); } catch (e) {
    alert(`Seed43 could not save the stamp families (${e.name}). Pictures make families large: try a smaller background.`);
  }
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

export const isPerStempel = (veld) => !!veld.perStamp;

// ── Which families show in the Stamps drawer and the Sheet dialog ────────
// Like the Library's Countries: the user ticks in the Builder what they use; the rest is
// hidden there (still in the Builder, still in the templates folder).

const VERBORGEN = 'seed43.stamps.hidden';

export function leesVerborgen() {
  try { return new Set(JSON.parse(localStorage.getItem(VERBORGEN) || '[]')); } catch { return new Set(); }
}

export function bewaarVerborgen(ids) {
  try { localStorage.setItem(VERBORGEN, JSON.stringify([...ids])); } catch {}
}

export const isGetoond = (f, verborgen = leesVerborgen()) => !verborgen.has(f.id);
