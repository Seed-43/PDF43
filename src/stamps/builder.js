// Stamp builder: design stamp families (title, colour, width, parameters).
// A modal window of the extension's own; the host draws everything else.

import { nieuwId, sleutelVan, geldig, AUTO } from './families.js';
import { maat, teken } from './render.js';

const kopie = (x) => JSON.parse(JSON.stringify(x));
const SOORTEN = { text: 'Text', choice: 'Choice list', date: 'Date', auto: 'Automatic' };

function maak(tag, stijl = '', tekst = '') {
  const el = document.createElement(tag);
  if (stijl) el.style.cssText = stijl;
  if (tekst) el.textContent = tekst;
  return el;
}

const KNOP = 'font:inherit;padding:4px 10px;cursor:pointer;border:1px solid var(--theme-app-menu-sidebar-border,#999);background:var(--theme-app-menu-bg,#fff);color:inherit;';
const INVOER = 'font:inherit;padding:3px 5px;border:1px solid var(--theme-app-menu-sidebar-border,#999);background:var(--theme-app-menu-bg,#fff);color:inherit;';

/**
 * @param {object[]} families current families
 * @param {(families: object[], changed: object[]) => void} opslaan
 */
export function openBouwer(families, opslaan) {
  let lijst = kopie(families);
  const oorspronkelijk = JSON.stringify(families);
  let gekozen = lijst[0]?.id || null;

  const achter = maak('div', 'position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:3000;display:flex;align-items:center;justify-content:center;');
  const venster = maak('div', 'width:min(900px,94vw);height:min(620px,90vh);display:flex;flex-direction:column;background:var(--theme-app-menu-bg,#fff);color:var(--theme-app-menu-text,#222);border:1px solid var(--theme-app-menu-sidebar-border,#888);box-shadow:0 8px 30px rgba(0,0,0,.35);font-size:12px;');
  const kop = maak('div', 'padding:10px 14px;font-size:14px;font-weight:bold;border-bottom:1px solid var(--theme-app-menu-divider,#ddd);', 'Seed43 stamp builder');
  const midden = maak('div', 'flex:1;display:flex;min-height:0;');
  const links = maak('div', 'width:200px;border-right:1px solid var(--theme-app-menu-divider,#ddd);display:flex;flex-direction:column;');
  const lijstEl = maak('div', 'flex:1;overflow:auto;');
  const linksKnoppen = maak('div', 'display:flex;flex-wrap:wrap;gap:4px;padding:6px;border-top:1px solid var(--theme-app-menu-divider,#ddd);');
  const rechts = maak('div', 'flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:10px;');
  const voet = maak('div', 'display:flex;justify-content:flex-end;gap:6px;padding:8px 12px;border-top:1px solid var(--theme-app-menu-divider,#ddd);');
  links.append(lijstEl, linksKnoppen);
  midden.append(links, rechts);
  venster.append(kop, midden, voet);
  achter.appendChild(venster);

  const fam = () => lijst.find((f) => f.id === gekozen);
  const sluit = () => achter.remove();

  function knop(tekst, actie, extra = '') {
    const b = maak('button', KNOP + extra, tekst);
    b.addEventListener('click', actie);
    return b;
  }

  function tekenLijst() {
    lijstEl.innerHTML = '';
    for (const f of lijst) {
      const r = maak('div', `padding:7px 10px;cursor:pointer;border-left:3px solid ${f.color || '#c0392b'};${f.id === gekozen ? 'background:var(--theme-app-menu-item-hover,#eef);font-weight:bold;' : ''}`, f.name);
      r.addEventListener('click', () => { gekozen = f.id; tekenAlles(); });
      lijstEl.appendChild(r);
    }
  }

  function voorbeeld(f) {
    const { width, height } = maat(f);
    const s = 2;
    const c = maak('canvas', 'align-self:flex-start;border:1px dashed var(--theme-app-menu-divider,#ccc);background:#fff;');
    c.width = (width + 20) * s; c.height = (height + 20) * s;
    c.style.width = `${width + 20}px`; c.style.height = `${height + 20}px`;
    const ctx = c.getContext('2d');
    ctx.scale(s, s);
    const values = {};
    for (const v of f.fields) if (v.kind !== 'auto') values[v.key] = v.value || (v.kind === 'choice' ? v.options?.[0] : '');
    teken(ctx, { x: 10, y: 10, page: 1, stamp: { family: f, values, placed: new Date().toISOString() } }, { fileName: 'Sheet.pdf' });
    return c;
  }

  function veldRij(f, v, i) {
    const r = maak('div', 'display:grid;grid-template-columns:1.2fr .9fr 1.6fr auto;gap:6px;align-items:center;');
    const label = maak('input', INVOER);
    label.value = v.label;
    label.placeholder = 'Parameter name';
    label.addEventListener('change', () => { v.label = label.value.trim() || 'Parameter'; tekenAlles(); });
    const soort = maak('select', INVOER);
    for (const [k, t] of Object.entries(SOORTEN)) { const o = maak('option', '', t); o.value = k; soort.appendChild(o); }
    soort.value = v.kind;
    soort.addEventListener('change', () => {
      v.kind = soort.value;
      if (v.kind === 'choice' && !v.options?.length) v.options = ['Option 1', 'Option 2'];
      if (v.kind === 'auto' && !v.auto) v.auto = 'page';
      tekenAlles();
    });
    let detail;
    if (v.kind === 'choice') {
      detail = maak('input', INVOER);
      detail.value = (v.options || []).join(', ');
      detail.title = 'Choices, separated by commas; the first is the default';
      detail.addEventListener('change', () => { v.options = detail.value.split(',').map((x) => x.trim()).filter(Boolean); v.value = v.options[0] || ''; tekenAlles(); });
    } else if (v.kind === 'auto') {
      detail = maak('select', INVOER);
      for (const [k, t] of Object.entries(AUTO)) { const o = maak('option', '', t); o.value = k; detail.appendChild(o); }
      detail.value = v.auto || 'page';
      detail.addEventListener('change', () => { v.auto = detail.value; tekenAlles(); });
    } else {
      detail = maak('input', INVOER);
      detail.type = v.kind === 'date' ? 'date' : 'text';
      detail.value = v.value || '';
      detail.placeholder = 'Default value';
      detail.addEventListener('change', () => { v.value = detail.value; tekenAlles(); });
    }
    const acties = maak('div', 'display:flex;gap:2px;');
    acties.append(
      knop('↑', () => { if (i > 0) { [f.fields[i - 1], f.fields[i]] = [f.fields[i], f.fields[i - 1]]; tekenAlles(); } }),
      knop('↓', () => { if (i < f.fields.length - 1) { [f.fields[i + 1], f.fields[i]] = [f.fields[i], f.fields[i + 1]]; tekenAlles(); } }),
      knop('×', () => { f.fields.splice(i, 1); tekenAlles(); }),
    );
    r.append(label, soort, detail, acties);
    return r;
  }

  function tekenRechts() {
    rechts.innerHTML = '';
    const f = fam();
    if (!f) { rechts.appendChild(maak('div', 'opacity:.7', 'No stamp family. Click New to make one.')); return; }
    const raster = maak('div', 'display:grid;grid-template-columns:110px 1fr;gap:6px 10px;align-items:center;max-width:520px;');
    const veld = (naam, invoer) => { raster.append(maak('span', 'opacity:.8', naam), invoer); };
    const naam = maak('input', INVOER); naam.value = f.name;
    naam.addEventListener('change', () => { f.name = naam.value.trim() || 'Stamp'; tekenAlles(); });
    const titel = maak('input', INVOER); titel.value = f.title || '';
    titel.addEventListener('change', () => { f.title = titel.value; tekenAlles(); });
    const kleur = maak('input', 'width:60px;height:24px;padding:0;'); kleur.type = 'color'; kleur.value = f.color || '#c0392b';
    kleur.addEventListener('change', () => { f.color = kleur.value; tekenAlles(); });
    const breedte = maak('input', INVOER + 'width:80px;'); breedte.type = 'number'; breedte.min = 80; breedte.max = 600; breedte.value = f.width || 180;
    breedte.addEventListener('change', () => { f.width = Math.max(80, Math.min(600, Number(breedte.value) || 180)); tekenAlles(); });
    veld('Family name', naam);
    veld('Title on stamp', titel);
    veld('Colour', kleur);
    veld('Width (pt)', breedte);
    rechts.appendChild(raster);
    rechts.appendChild(maak('div', 'font-weight:bold;margin-top:6px;', 'Parameters'));
    rechts.appendChild(maak('div', 'opacity:.7', 'Values are shared by every stamp of this family in a file: change one stamp and all of them update. Automatic parameters are filled in per stamp.'));
    f.fields.forEach((v, i) => rechts.appendChild(veldRij(f, v, i)));
    rechts.appendChild(knop('+ Add parameter', () => {
      const label = 'Parameter';
      f.fields.push({ key: sleutelVan(label, f.fields.map((x) => x.key)), label, kind: 'text', value: '' });
      tekenAlles();
    }, 'align-self:flex-start;'));
    rechts.appendChild(maak('div', 'font-weight:bold;margin-top:6px;', 'Preview'));
    rechts.appendChild(voorbeeld(f));
  }

  function tekenAlles() { tekenLijst(); tekenRechts(); }

  linksKnoppen.append(
    knop('New', () => {
      const f = { id: nieuwId(), name: 'New stamp', title: 'STAMP', color: '#2c6fbb', width: 180, fields: [{ key: 'note', label: 'Note', kind: 'text', value: '' }] };
      lijst.push(f); gekozen = f.id; tekenAlles();
    }),
    knop('Duplicate', () => {
      const f = fam(); if (!f) return;
      const d = { ...kopie(f), id: nieuwId(), name: `${f.name} copy` };
      lijst.push(d); gekozen = d.id; tekenAlles();
    }),
    knop('Delete', () => {
      const f = fam(); if (!f) return;
      if (!confirm(`Delete the stamp family "${f.name}"? Stamps already placed keep showing.`)) return;
      lijst = lijst.filter((x) => x.id !== f.id); gekozen = lijst[0]?.id || null; tekenAlles();
    }),
    knop('Export', () => {
      const blob = new Blob([JSON.stringify({ seed43StampFamilies: 1, families: lijst }, null, 2)], { type: 'application/json' });
      const a = maak('a'); a.href = URL.createObjectURL(blob); a.download = 'seed43-stamps.json'; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }),
    knop('Import', () => {
      const inp = maak('input'); inp.type = 'file'; inp.accept = '.json,application/json';
      inp.addEventListener('change', async () => {
        try {
          const data = JSON.parse(await inp.files[0].text());
          const nieuw = (Array.isArray(data) ? data : data.families || []).filter(geldig);
          for (const f of nieuw) {
            const i = lijst.findIndex((x) => x.id === f.id);
            if (i >= 0) lijst[i] = f; else lijst.push(f);
          }
          gekozen = nieuw[0]?.id || gekozen; tekenAlles();
        } catch (e) { alert(`Could not import: ${e.message || e}`); }
      });
      inp.click();
    }),
  );

  voet.append(
    knop('Cancel', sluit),
    knop('Save', () => {
      const oud = JSON.parse(oorspronkelijk);
      const gewijzigd = lijst.filter((f) => JSON.stringify(f) !== JSON.stringify(oud.find((o) => o.id === f.id)));
      sluit();
      opslaan(lijst, gewijzigd);
    }, 'background:var(--theme-accent,#0078d7);border-color:var(--theme-accent,#0078d7);color:#fff;'),
  );
  achter.addEventListener('mousedown', (e) => { if (e.target === achter) sluit(); });
  document.body.appendChild(achter);
  tekenAlles();
}
