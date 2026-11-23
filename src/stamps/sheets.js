// Built-in drawing sheets and forms: generic, with no company's name or
// details in them. Each is a "placed" stamp family: a frame of lines and
// small labels, with parameter boxes at fixed places. The user's own sheet is
// made the same way in the Stamp Builder, from a blank title-block PDF.
//
// A cell is { key, label, x, y, w, h, ...field }: it draws a box with a small
// label in its top-left corner and puts the parameter's value under it.

const LABEL_PT = 4.6;

/** Turn cells into frame primitives and positioned fields. */
export function cellen(lijst) {
  const frame = [], fields = [];
  for (const c of lijst) {
    if (c.box !== false) frame.push({ t: 'rect', x: c.x, y: c.y, w: c.w, h: c.h, lw: 0.6 });
    if (c.label && c.showLabel !== false) frame.push({ t: 'text', x: c.x + 2, y: c.y + 1.6, s: LABEL_PT, text: c.label.toUpperCase() });
    if (!c.key) continue;
    const boven = c.label && c.showLabel !== false ? 7 : 1;
    const { x, y, w, h, box, showLabel, ...veld } = c;
    fields.push({ kind: 'text', value: '', ...veld, x: x + 1, y: y + boven, w: w - 2, h: h - boven - 1 });
  }
  return { frame, fields };
}

function rij(x, y, h, kolommen) {
  let xx = x;
  return kolommen.map((k) => { const c = { ...k, x: xx, y, h }; xx += k.w; return c; });
}

// ── A3 landscape drawing sheet ────────────────────────────────────────

function a3() {
  const W = 1190.55, H = 841.89;
  const L = 25, T = 15, R = W - 15, B = H - 15;
  const tbW = 390, tx = R - tbW;
  const rev = [];
  const revY = B - 160 - 76;
  rev.push(...rij(tx, revY, 12, [
    { label: 'Rev', w: 36, box: true }, { label: 'Description', w: 224 }, { label: 'By', w: 40 }, { label: 'Date', w: 90 },
  ]).map((c) => ({ ...c, showLabel: true })));
  for (let i = 1; i <= 4; i++) {
    rev.push(...rij(tx, revY + 12 + (i - 1) * 16, 16, [
      { key: `rev${i}`, label: '', w: 36, perStamp: true, align: 'center' },
      { key: `revDesc${i}`, label: '', w: 224, perStamp: true },
      { key: `revBy${i}`, label: '', w: 40, perStamp: true, align: 'center' },
      { key: `revDate${i}`, label: '', w: 90, perStamp: true, kind: 'date', blank: true },
    ]).map((c) => ({ ...c, labelText: `Rev row ${i}` })));
  }
  const y0 = B - 160;
  const c = [
    ...rij(tx, y0, 30, [
      { key: 'company', label: 'Company', w: 195, kind: 'profile', from: 'company', bold: true, size: 10 },
      { key: 'client', label: 'Client', w: 195 },
    ]),
    { key: 'project', label: 'Project', x: tx, y: y0 + 30, w: tbW, h: 30, bold: true, size: 10 },
    { key: 'title', label: 'Drawing title', x: tx, y: y0 + 60, w: tbW, h: 40, perStamp: true, multi: true, bold: true, size: 9 },
    ...rij(tx, y0 + 100, 30, [
      { key: 'jobNo', label: 'Job no.', w: 110 },
      { key: 'drawn', label: 'Drawn', w: 70, kind: 'profile', from: 'initials', align: 'center' },
      { key: 'designed', label: 'Designed', w: 70, align: 'center' },
      { key: 'checked', label: 'Checked', w: 70, align: 'center' },
      { key: 'date', label: 'Date', w: 70, kind: 'date', align: 'center' },
    ]),
    ...rij(tx, y0 + 130, 30, [
      { key: 'status', label: 'Status', w: 110, kind: 'choice', options: ['Preliminary', 'For coordination', 'For tender', 'For building consent', 'For construction', 'As built'] },
      { key: 'scale', label: 'Scale @ A3', w: 70, perStamp: true, align: 'center', value: '1:100' },
      { key: 'dwgNo', label: 'Drawing no.', w: 110, perStamp: true, bold: true, size: 11, align: 'center' },
      { key: 'rev', label: 'Rev', w: 40, perStamp: true, bold: true, size: 11, align: 'center' },
      { key: 'sheet', label: 'Sheet', w: 60, kind: 'auto', auto: 'sheetOf', align: 'center' },
    ]),
  ];
  const { frame, fields } = cellen([...rev, ...c]);
  for (const f of fields) if (f.labelText) { f.label = f.labelText; delete f.labelText; }
  // Revision-row labels: say which column, so the panel reads well.
  for (const f of fields) {
    const m = /^(rev|revDesc|revBy|revDate)(\d)$/.exec(f.key);
    if (m) f.label = `Rev ${m[2]}: ${{ rev: 'rev', revDesc: 'description', revBy: 'by', revDate: 'date' }[m[1]]}`;
  }
  frame.unshift({ t: 'rect', x: L, y: T, w: R - L, h: B - T, lw: 1.2 });
  return {
    id: 'sheet-a3', name: 'A3 drawing sheet', group: 'sheet', layout: 'placed', builtin: true,
    title: 'A3 SHEET', color: '#1f2328', width: W, height: H, frame, fields,
    hit: { x: tx, y: revY, w: tbW, h: B - revY },
  };
}

// ── A4 portrait sketch sheet ──────────────────────────────────────────

function a4() {
  const W = 595.28, H = 841.89;
  const L = 25, T = 15, R = W - 15, B = H - 15, bw = R - L;
  const y0 = B - 110;
  const c = [
    ...rij(L, y0, 26, [
      { key: 'company', label: 'Company', w: bw / 2, kind: 'profile', from: 'company', bold: true, size: 9 },
      { key: 'client', label: 'Client', w: bw / 2 },
    ]),
    { key: 'project', label: 'Project', x: L, y: y0 + 26, w: bw, h: 26, bold: true, size: 9 },
    ...rij(L, y0 + 52, 30, [
      { key: 'title', label: 'Sketch title', w: bw - 200, perStamp: true, multi: true, bold: true, size: 8.5 },
      { key: 'jobNo', label: 'Job no.', w: 80 },
      { key: 'dwgNo', label: 'Sketch no.', w: 80, perStamp: true, bold: true, align: 'center' },
      { key: 'rev', label: 'Rev', w: 40, perStamp: true, bold: true, align: 'center' },
    ]),
    ...rij(L, y0 + 82, 28, [
      { key: 'drawn', label: 'By', w: bw / 6, kind: 'profile', from: 'initials', align: 'center' },
      { key: 'checked', label: 'Checked', w: bw / 6, align: 'center' },
      { key: 'date', label: 'Date', w: bw / 6, kind: 'date', align: 'center' },
      { key: 'status', label: 'Status', w: bw / 6, kind: 'choice', options: ['Sketch', 'Preliminary', 'For construction'] },
      { key: 'scale', label: 'Scale @ A4', w: bw / 6, perStamp: true, value: 'NTS', align: 'center' },
      { key: 'sheet', label: 'Sheet', w: bw / 6, kind: 'auto', auto: 'sheetOf', align: 'center' },
    ]),
  ];
  const { frame, fields } = cellen(c);
  frame.unshift({ t: 'rect', x: L, y: T, w: bw, h: B - T, lw: 1.2 });
  return {
    id: 'sheet-a4', name: 'A4 sketch sheet', group: 'sheet', layout: 'placed', builtin: true,
    title: 'A4 SKETCH', color: '#1f2328', width: W, height: H, frame, fields,
    hit: { x: L, y: y0, w: bw, h: B - y0 },
  };
}

// ── A4 forms ──────────────────────────────────────────────────────────

const FW = 595.28, FH = 841.89, FL = 36, FR = FW - 36, FB = FW - 72;

function kopForm(titel) {
  return [
    { t: 'text', x: FL, y: 34, s: 20, b: true, text: titel },
    { t: 'line', x1: FL, y1: 62, x2: FR, y2: 62, lw: 1.4 },
  ];
}

function form(id, name, titel, lijst, extra = []) {
  const { frame, fields } = cellen(lijst);
  return {
    id, name, group: 'form', layout: 'placed', builtin: true, title: titel, color: '#1f2328',
    width: FW, height: FH, frame: [...kopForm(titel), ...extra, ...frame], fields,
    hit: { x: FL, y: 30, w: FB, h: 36 },
  };
}

const bedrijf = { key: 'company', label: 'From (company)', kind: 'profile', from: 'company' };

function rfi() {
  return form('form-rfi', 'RFI', 'REQUEST FOR INFORMATION', [
    ...rij(FL, 72, 30, [{ key: 'project', label: 'Project', w: FB * 0.6 }, { key: 'jobNo', label: 'Job no.', w: FB * 0.2 }, { key: 'rfiNo', label: 'RFI no.', w: FB * 0.2, perStamp: true, bold: true }]),
    ...rij(FL, 102, 30, [{ key: 'to', label: 'To', w: FB / 2, perStamp: true }, { ...bedrijf, w: FB / 2 }]),
    ...rij(FL, 132, 30, [{ key: 'date', label: 'Date raised', w: FB / 3, kind: 'date', perStamp: true }, { key: 'required', label: 'Response required by', w: FB / 3, kind: 'date', blank: true, perStamp: true }, { key: 'refs', label: 'Drawing / spec reference', w: FB / 3, perStamp: true }]),
    { key: 'subject', label: 'Subject', x: FL, y: 172, w: FB, h: 30, perStamp: true, bold: true },
    { key: 'question', label: 'Information requested', x: FL, y: 202, w: FB, h: 230, perStamp: true, multi: true },
    { key: 'response', label: 'Response', x: FL, y: 442, w: FB, h: 260, perStamp: true, multi: true },
    ...rij(FL, 712, 34, [{ key: 'respondedBy', label: 'Responded by', w: FB / 2, perStamp: true }, { key: 'respondedOn', label: 'Date', w: FB / 2, kind: 'date', blank: true, perStamp: true }]),
  ]);
}

function siteInstruction() {
  return form('form-si', 'Site instruction', 'SITE INSTRUCTION', [
    ...rij(FL, 72, 30, [{ key: 'project', label: 'Project', w: FB * 0.6 }, { key: 'jobNo', label: 'Job no.', w: FB * 0.2 }, { key: 'siNo', label: 'SI no.', w: FB * 0.2, perStamp: true, bold: true }]),
    ...rij(FL, 102, 30, [{ key: 'to', label: 'To (contractor)', w: FB / 2 }, { ...bedrijf, w: FB / 2 }]),
    ...rij(FL, 132, 30, [{ key: 'date', label: 'Date', w: FB / 3, kind: 'date', perStamp: true }, { key: 'location', label: 'Location', w: FB / 3, perStamp: true }, { key: 'refs', label: 'Drawing reference', w: FB / 3, perStamp: true }]),
    { key: 'instruction', label: 'Instruction', x: FL, y: 172, w: FB, h: 380, perStamp: true, multi: true },
    { key: 'cost', label: 'Cost / time implication', x: FL, y: 562, w: FB, h: 60, perStamp: true, multi: true },
    ...rij(FL, 632, 40, [{ key: 'issuedBy', label: 'Issued by', w: FB / 2, kind: 'profile', from: 'name' }, { key: 'signature', label: 'Signature', w: FB / 2, kind: 'signature' }]),
    ...rij(FL, 682, 40, [{ key: 'receivedBy', label: 'Received by (contractor)', w: FB / 2, perStamp: true }, { key: 'receivedOn', label: 'Date', w: FB / 2, kind: 'date', blank: true, perStamp: true }]),
  ]);
}

function siteVisit() {
  return form('form-visit', 'Site visit report', 'SITE VISIT REPORT', [
    ...rij(FL, 72, 30, [{ key: 'project', label: 'Project', w: FB * 0.6 }, { key: 'jobNo', label: 'Job no.', w: FB * 0.2 }, { key: 'reportNo', label: 'Report no.', w: FB * 0.2, perStamp: true, bold: true }]),
    ...rij(FL, 102, 30, [{ key: 'date', label: 'Date of visit', w: FB / 4, kind: 'date', perStamp: true }, { key: 'time', label: 'Time', w: FB / 4, perStamp: true }, { key: 'weather', label: 'Weather', w: FB / 4, perStamp: true }, { key: 'by', label: 'Inspected by', w: FB / 4, kind: 'profile', from: 'name' }]),
    { key: 'present', label: 'Present', x: FL, y: 132, w: FB, h: 30, perStamp: true },
    { key: 'purpose', label: 'Purpose of visit', x: FL, y: 162, w: FB, h: 40, perStamp: true, multi: true },
    { key: 'observations', label: 'Observations', x: FL, y: 212, w: FB, h: 300, perStamp: true, multi: true },
    { key: 'actions', label: 'Actions required', x: FL, y: 522, w: FB, h: 150, perStamp: true, multi: true },
    ...rij(FL, 682, 40, [{ key: 'result', label: 'Result', w: FB / 3, kind: 'choice', options: ['Satisfactory', 'Satisfactory with actions', 'Not satisfactory', 'Re-inspection required'], perStamp: true }, { key: 'nextVisit', label: 'Next visit', w: FB / 3, kind: 'date', blank: true, perStamp: true }, { key: 'signature', label: 'Signature', w: FB / 3, kind: 'signature' }]),
  ]);
}

function snagList() {
  const regels = [];
  regels.push(...rij(FL, 72, 30, [{ key: 'project', label: 'Project', w: FB * 0.6 }, { key: 'jobNo', label: 'Job no.', w: FB * 0.2 }, { key: 'date', label: 'Date', w: FB * 0.2, kind: 'date', perStamp: true }]));
  regels.push(...rij(FL, 112, 14, [{ label: 'No.', w: 30 }, { label: 'Location', w: 120 }, { label: 'Item', w: FB - 250 }, { label: 'By', w: 50 }, { label: 'Done', w: 50 }]));
  for (let i = 1; i <= 18; i++) {
    regels.push(...rij(FL, 126 + (i - 1) * 32, 32, [
      { key: `no${i}`, label: '', w: 30, perStamp: true, align: 'center', value: String(i) },
      { key: `loc${i}`, label: '', w: 120, perStamp: true, multi: true },
      { key: `item${i}`, label: '', w: FB - 250, perStamp: true, multi: true },
      { key: `by${i}`, label: '', w: 50, perStamp: true, align: 'center' },
      { key: `done${i}`, label: '', w: 50, perStamp: true, align: 'center' },
    ]));
  }
  const f = form('form-snag', 'Snag list', 'SNAG LIST', regels);
  for (const v of f.fields) {
    const m = /^(no|loc|item|by|done)(\d+)$/.exec(v.key);
    if (m) v.label = `Row ${m[2]}: ${{ no: 'no.', loc: 'location', item: 'item', by: 'by', done: 'done' }[m[1]]}`;
  }
  return f;
}

function transmittal() {
  const regels = [
    ...rij(FL, 72, 30, [{ key: 'project', label: 'Project', w: FB * 0.6 }, { key: 'jobNo', label: 'Job no.', w: FB * 0.2 }, { key: 'trNo', label: 'Transmittal no.', w: FB * 0.2, perStamp: true, bold: true }]),
    ...rij(FL, 102, 30, [{ key: 'to', label: 'To', w: FB / 2, perStamp: true }, { ...bedrijf, w: FB / 2 }]),
    ...rij(FL, 132, 30, [{ key: 'date', label: 'Date', w: FB / 3, kind: 'date', perStamp: true }, { key: 'purpose', label: 'Issued for', w: FB / 3, kind: 'choice', options: ['Information', 'Comment', 'Coordination', 'Tender', 'Building consent', 'Construction'], perStamp: true }, { key: 'via', label: 'Sent by', w: FB / 3, kind: 'choice', options: ['Email', 'Download link', 'Post', 'By hand'], perStamp: true }]),
    ...rij(FL, 172, 14, [{ label: 'Drawing / document no.', w: 130 }, { label: 'Title', w: FB - 190 }, { label: 'Rev', w: 60 }]),
  ];
  for (let i = 1; i <= 20; i++) {
    regels.push(...rij(FL, 186 + (i - 1) * 22, 22, [
      { key: `doc${i}`, label: '', w: 130, perStamp: true },
      { key: `docTitle${i}`, label: '', w: FB - 190, perStamp: true },
      { key: `docRev${i}`, label: '', w: 60, perStamp: true, align: 'center' },
    ]));
  }
  regels.push({ key: 'notes', label: 'Notes', x: FL, y: 636, w: FB, h: 80, perStamp: true, multi: true });
  regels.push(...rij(FL, 726, 34, [{ key: 'sentBy', label: 'Sent by', w: FB / 2, kind: 'profile', from: 'name' }, { key: 'signature', label: 'Signature', w: FB / 2, kind: 'signature' }]));
  const f = form('form-transmittal', 'Transmittal', 'TRANSMITTAL', regels);
  for (const v of f.fields) {
    const m = /^(doc|docTitle|docRev)(\d+)$/.exec(v.key);
    if (m) v.label = `Row ${m[2]}: ${{ doc: 'number', docTitle: 'title', docRev: 'rev' }[m[1]]}`;
  }
  return f;
}

function memo() {
  return form('form-memo', 'Memo', 'MEMO', [
    ...rij(FL, 72, 30, [{ key: 'to', label: 'To', w: FB / 2, perStamp: true }, { key: 'from', label: 'From', w: FB / 2, kind: 'profile', from: 'name' }]),
    ...rij(FL, 102, 30, [{ key: 'project', label: 'Project', w: FB * 0.6 }, { key: 'jobNo', label: 'Job no.', w: FB * 0.2 }, { key: 'date', label: 'Date', w: FB * 0.2, kind: 'date', perStamp: true }]),
    { key: 'subject', label: 'Subject', x: FL, y: 132, w: FB, h: 30, perStamp: true, bold: true },
    { key: 'body', label: 'Memo', x: FL, y: 172, w: FB, h: 600, perStamp: true, multi: true, size: 9 },
  ]);
}

function shopReviewCover() {
  return form('form-shop-review', 'Shop drawing review cover', 'SHOP DRAWING REVIEW', [
    ...rij(FL, 72, 30, [{ key: 'project', label: 'Project', w: FB * 0.6 }, { key: 'jobNo', label: 'Job no.', w: FB * 0.2 }, { key: 'subNo', label: 'Submission no.', w: FB * 0.2, perStamp: true, bold: true }]),
    ...rij(FL, 102, 30, [{ key: 'fabricator', label: 'Fabricator / contractor', w: FB / 2, perStamp: true }, { ...bedrijf, label: 'Reviewed by (company)', w: FB / 2 }]),
    ...rij(FL, 132, 30, [{ key: 'received', label: 'Received', w: FB / 3, kind: 'date', perStamp: true }, { key: 'reviewed', label: 'Reviewed', w: FB / 3, kind: 'date', perStamp: true }, { key: 'status', label: 'Status', w: FB / 3, kind: 'choice', options: ['A: No exceptions taken', 'B: Minor comments noted', 'C: Amend and resubmit'], perStamp: true, bold: true }]),
    { key: 'drawings', label: 'Drawings reviewed', x: FL, y: 172, w: FB, h: 200, perStamp: true, multi: true },
    { key: 'comments', label: 'Comments', x: FL, y: 382, w: FB, h: 260, perStamp: true, multi: true },
    { key: 'disclaimer', label: 'Note', x: FL, y: 652, w: FB, h: 50, multi: true, size: 6.5,
      value: 'This review is solely to check conformance with the design requirements. The contractor remains responsible for coordinating and confirming all dimensions, including site measurements.' },
    ...rij(FL, 712, 40, [{ key: 'reviewer', label: 'Reviewer', w: FB / 2, kind: 'profile', from: 'name' }, { key: 'signature', label: 'Signature', w: FB / 2, kind: 'signature' }]),
  ]);
}

function notesSheet() {
  // Standard notes: an empty A3 with numbered note blocks the user fills in.
  const W = 1190.55, H = 841.89, L = 25, T = 15, R = W - 15, B = H - 15;
  const kol = (R - L - 40) / 3;
  const regels = [];
  for (let k = 0; k < 3; k++) {
    for (let i = 0; i < 3; i++) {
      const n = k * 3 + i + 1;
      regels.push({ key: `head${n}`, label: '', x: L + 10 + k * (kol + 10), y: T + 10 + i * 262, w: kol, h: 18, perStamp: true, bold: true, size: 9, box: false });
      regels.push({ key: `notes${n}`, label: '', x: L + 10 + k * (kol + 10), y: T + 30 + i * 262, w: kol, h: 236, perStamp: true, multi: true, size: 6.5, box: false });
    }
  }
  const { frame, fields } = cellen(regels);
  for (const f of fields) {
    const m = /^(head|notes)(\d)$/.exec(f.key);
    if (m) f.label = `Block ${m[2]}: ${m[1] === 'head' ? 'heading' : 'notes'}`;
  }
  frame.unshift({ t: 'rect', x: L, y: T, w: R - L, h: B - T, lw: 1.2 });
  return {
    id: 'sheet-notes', name: 'Notes sheet (A3)', group: 'sheet', layout: 'placed', builtin: true, title: 'NOTES',
    color: '#1f2328', width: W, height: H, frame, fields, hit: { x: L, y: T, w: R - L, h: 40 },
  };
}

// ── A1 and A0 drawing sheets ──────────────────────────────────────────
// Every A size has the same shape, so the A1 and A0 sheets are the A3 sheet
// drawn bigger (an A1 printed at A3 is the A3 sheet). They matter for a new
// PDF: its pages get the real A1 or A0 size.

function vergroot(f, k, maat) {
  const g = JSON.parse(JSON.stringify(f));
  const m = (v) => (typeof v === 'number' ? v * k : v);
  g.width *= k; g.height *= k;
  for (const p of g.frame) for (const a of ['x', 'y', 'w', 'h', 'x1', 'y1', 'x2', 'y2', 'lw', 's']) if (a in p) p[a] = m(p[a]);
  for (const v of g.fields) {
    const h = v.h;
    for (const a of ['x', 'y', 'w', 'h']) if (a in v) v[a] = m(v[a]);
    if (v.x != null) v.size = (v.size || Math.min(10, (h || 12) * 0.62)) * k;
    if (/@ A3/.test(v.label || '')) v.label = v.label.replace('@ A3', `@ ${maat}`);
  }
  for (const p of g.frame) if (p.t === 'text' && /@ A3/.test(p.text)) p.text = p.text.replace('@ A3', `@ ${maat}`);
  if (g.hit) for (const a of ['x', 'y', 'w', 'h']) g.hit[a] *= k;
  g.id = `sheet-${maat.toLowerCase()}`; g.name = `${maat} drawing sheet`; g.title = `${maat} SHEET`;
  return g;
}

const A3 = a3();
export const STANDAARD_BLADEN = [vergroot(A3, 3370.39 / 1190.55, 'A0'), vergroot(A3, 2383.94 / 1190.55, 'A1'), A3, a4(), notesSheet()];
export const STANDAARD_FORMULIEREN = [rfi(), siteInstruction(), siteVisit(), snagList(), transmittal(), memo(), shopReviewCover()];
