// The Element Library window: browse, edit and save the library like a CAD
// block library, and place sections and bolt groups from it.

import { laadBibliotheek, bewaarBibliotheek, standaardBibliotheek, geldigeBibliotheek, SOORTEN, VORMEN } from './store.js';
import { plaats } from './elements.js';

const kopie = (x) => JSON.parse(JSON.stringify(x));
const KNOP = 'font:inherit;padding:4px 10px;cursor:pointer;border:1px solid var(--theme-app-menu-sidebar-border,#999);background:var(--theme-app-menu-bg,#fff);color:inherit;';
const PRIMAIR = KNOP + 'background:var(--theme-accent,#0078d7);border-color:var(--theme-accent,#0078d7);color:#fff;';
const INVOER = 'font:inherit;padding:3px 5px;border:1px solid var(--theme-app-menu-sidebar-border,#999);background:var(--theme-app-menu-bg,#fff);color:inherit;';

function maak(tag, stijl = '', tekst = '') {
  const el = document.createElement(tag);
  if (stijl) el.style.cssText = stijl;
  if (tekst) el.textContent = tekst;
  return el;
}

function knop(tekst, actie, stijl = KNOP) {
  const b = maak('button', stijl, tekst);
  b.addEventListener('click', actie);
  return b;
}

/** CSV or tab-separated text (pasted from Excel) to rows of cells. */
function leesTabel(tekst) {
  const regels = tekst.replace(/\r/g, '').split('\n').filter((r) => r.trim());
  const sep = regels[0]?.includes('\t') ? '\t' : ',';
  return regels.map((r) => {
    const cellen = []; let cel = '', q = false;
    for (let i = 0; i < r.length; i++) {
      const ch = r[i];
      if (ch === '"') { if (q && r[i + 1] === '"') { cel += '"'; i++; } else q = !q; }
      else if (ch === sep && !q) { cellen.push(cel); cel = ''; }
      else cel += ch;
    }
    cellen.push(cel);
    return cellen.map((c) => c.trim());
  });
}

const waarde = (s) => (s !== '' && Number.isFinite(+s) ? +s : s);

export async function openBibliotheek(api) {
  let lib = kopie(await laadBibliotheek(api));
  let catId = lib.categories[0]?.id || null;
  let gekozenRij = -1;
  let zoek = '';
  let gewijzigd = false;

  const achter = maak('div', 'position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:3000;display:flex;align-items:center;justify-content:center;');
  const venster = maak('div', 'width:min(1150px,96vw);height:min(720px,92vh);display:flex;flex-direction:column;background:var(--theme-app-menu-bg,#fff);color:var(--theme-app-menu-text,#222);border:1px solid var(--theme-app-menu-sidebar-border,#888);box-shadow:0 8px 30px rgba(0,0,0,.35);font-size:12px;');
  const kopbalk = maak('div', 'display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--theme-app-menu-divider,#ddd);');
  const titel = maak('div', 'font-size:14px;font-weight:bold;flex:1;');
  const midden = maak('div', 'flex:1;display:flex;min-height:0;');
  const links = maak('div', 'width:220px;border-right:1px solid var(--theme-app-menu-divider,#ddd);display:flex;flex-direction:column;');
  const catLijst = maak('div', 'flex:1;overflow:auto;');
  const rechts = maak('div', 'flex:1;display:flex;flex-direction:column;min-width:0;');
  const catKop = maak('div', 'display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:8px 10px;border-bottom:1px solid var(--theme-app-menu-divider,#ddd);');
  const tabelVak = maak('div', 'flex:1;overflow:auto;');
  const rijKnoppen = maak('div', 'display:flex;flex-wrap:wrap;gap:6px;padding:6px 10px;border-top:1px solid var(--theme-app-menu-divider,#ddd);');
  const voet = maak('div', 'display:flex;gap:6px;justify-content:flex-end;padding:8px 12px;border-top:1px solid var(--theme-app-menu-divider,#ddd);');
  links.append(catLijst, maak('div', 'padding:6px;border-top:1px solid var(--theme-app-menu-divider,#ddd);'));
  rechts.append(catKop, tabelVak, rijKnoppen);
  midden.append(links, rechts);
  venster.append(kopbalk, midden, voet);
  achter.appendChild(venster);

  const cat = () => lib.categories.find((c) => c.id === catId);
  const markeer = () => { gewijzigd = true; titel.textContent = `Element Library: ${lib.name || 'Library'} *`; };
  const sluit = () => {
    if (gewijzigd && !confirm('Close without saving your changes?')) return;
    achter.remove();
  };

  function tekenLinks() {
    catLijst.innerHTML = '';
    const groepen = {};
    for (const c of lib.categories) (groepen[c.kind] ||= []).push(c);
    for (const [soort, lijst] of Object.entries(groepen)) {
      catLijst.appendChild(maak('div', 'padding:8px 10px 2px;font-size:10px;text-transform:uppercase;opacity:.6;', SOORTEN[soort] || soort));
      for (const c of lijst) {
        const r = maak('div', `padding:5px 10px;cursor:pointer;display:flex;justify-content:space-between;${c.id === catId ? 'background:var(--theme-app-menu-item-hover,#eef);font-weight:bold;' : ''}`);
        r.append(maak('span', '', c.name), maak('span', 'opacity:.5', String(c.items.length)));
        r.addEventListener('click', () => { catId = c.id; gekozenRij = -1; zoek = ''; tekenAlles(); });
        catLijst.appendChild(r);
      }
    }
    const extra = links.lastChild; extra.innerHTML = '';
    extra.append(knop('+ Category', () => {
      const naam = prompt('Name of the new category (e.g. Anchors):'); if (!naam) return;
      const soort = (prompt('Kind: section, bolt or table', 'table') || 'table').toLowerCase();
      const id = naam.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36).slice(-4);
      lib.categories.push({ id, name: naam, kind: SOORTEN[soort] ? soort : 'table', shape: soort === 'section' ? 'I' : undefined, fields: soort === 'bolt' ? ['d', 'category', 'hole', 'minEdge', 'minPitch'] : ['d', 'b'], items: [] });
      catId = id; markeer(); tekenAlles();
    }));
  }

  function tekenKop() {
    catKop.innerHTML = '';
    const c = cat(); if (!c) return;
    const naam = maak('input', INVOER + 'font-weight:bold;width:160px;'); naam.value = c.name;
    naam.addEventListener('change', () => { c.name = naam.value.trim() || c.name; markeer(); tekenLinks(); });
    catKop.append(naam, maak('span', 'opacity:.7', `${SOORTEN[c.kind] || c.kind}`));
    if (c.kind === 'section') {
      const vorm = maak('select', INVOER);
      for (const [k, t] of Object.entries(VORMEN)) { const o = maak('option', '', t); o.value = k; vorm.appendChild(o); }
      vorm.value = c.shape || 'I';
      vorm.addEventListener('change', () => { c.shape = vorm.value; markeer(); });
      catKop.append(maak('span', 'opacity:.7', 'Shape'), vorm);
    }
    const z = maak('input', INVOER + 'margin-left:auto;width:180px;'); z.type = 'search'; z.placeholder = 'Search...'; z.value = zoek;
    z.addEventListener('input', () => { zoek = z.value.trim().toLowerCase(); tekenTabel(); });
    catKop.appendChild(z);
    if (c.note) catKop.appendChild(maak('div', 'flex-basis:100%;opacity:.75;font-style:italic;', c.note));
  }

  function tekenTabel() {
    tabelVak.innerHTML = '';
    const c = cat(); if (!c) return;
    const kolommen = ['name', ...c.fields];
    const t = maak('table', 'border-collapse:collapse;width:max-content;min-width:100%;');
    const kop = maak('tr');
    for (const k of kolommen) kop.appendChild(maak('th', 'position:sticky;top:0;background:var(--theme-app-menu-bg,#fff);border-bottom:1px solid var(--theme-app-menu-divider,#ccc);padding:4px 6px;text-align:left;font-weight:bold;', k));
    t.appendChild(kop);
    c.items.forEach((it, i) => {
      if (zoek && !JSON.stringify(it).toLowerCase().includes(zoek)) return;
      const r = maak('tr', i === gekozenRij ? 'background:var(--theme-app-menu-item-hover,#eef);' : '');
      r.addEventListener('click', () => { if (gekozenRij !== i) { gekozenRij = i; for (const x of t.querySelectorAll('tr')) x.style.background = ''; r.style.background = 'var(--theme-app-menu-item-hover,#eef)'; } });
      r.addEventListener('dblclick', () => { if (c.kind !== 'table') { gekozenRij = i; plaatsGekozen(); } });
      for (const k of kolommen) {
        const td = maak('td', 'border-bottom:1px solid var(--theme-app-menu-divider,#eee);padding:0;');
        const inp = maak('input', `font:inherit;border:none;background:transparent;color:inherit;padding:3px 6px;width:${k === 'name' ? 150 : 80}px;`);
        inp.value = it[k] ?? '';
        inp.addEventListener('change', () => { const v = waarde(inp.value.trim()); if (v === '') delete it[k]; else it[k] = v; markeer(); });
        td.appendChild(inp);
        r.appendChild(td);
      }
      t.appendChild(r);
    });
    tabelVak.appendChild(t);
  }

  function tekenKnoppen() {
    rijKnoppen.innerHTML = '';
    const c = cat(); if (!c) return;
    rijKnoppen.append(
      knop('+ Row', () => { c.items.push({ name: 'New' }); gekozenRij = c.items.length - 1; markeer(); tekenTabel(); tabelVak.scrollTop = 1e9; }),
      knop('Duplicate row', () => { if (gekozenRij < 0) return; const n = { ...c.items[gekozenRij], name: c.items[gekozenRij].name + ' copy' }; c.items.splice(gekozenRij + 1, 0, n); gekozenRij++; markeer(); tekenTabel(); }),
      knop('Delete row', () => { if (gekozenRij < 0) return; c.items.splice(gekozenRij, 1); gekozenRij = -1; markeer(); tekenTabel(); }),
      knop('+ Column', () => { const k = prompt('Column name (e.g. grade):'); if (!k || c.fields.includes(k) || k === 'name') return; c.fields.push(k.trim()); markeer(); tekenTabel(); }),
      knop('Import CSV', () => csvImport(c)),
      knop('Delete category', () => { if (!confirm(`Delete the category "${c.name}" and its ${c.items.length} rows?`)) return; lib.categories = lib.categories.filter((x) => x !== c); catId = lib.categories[0]?.id; markeer(); tekenAlles(); }),
    );
    if (c.kind !== 'table') rijKnoppen.append(maak('span', 'flex:1'), knop(c.kind === 'bolt' ? 'Place bolt group' : 'Place section', plaatsGekozen, PRIMAIR));
  }

  function plaatsGekozen() {
    const c = cat(); const it = c?.items[gekozenRij];
    if (!it) { alert('Select a row first.'); return; }
    if (gewijzigd) try { bewaarBibliotheek(lib); gewijzigd = false; } catch (e) { alert(e.message); return; }
    achter.remove();
    plaats(api, c, it);
  }

  function csvImport(c) {
    const vak = maak('div', 'position:fixed;inset:0;z-index:3100;background:rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;');
    const doos = maak('div', 'width:min(700px,90vw);background:var(--theme-app-menu-bg,#fff);color:inherit;padding:12px;display:flex;flex-direction:column;gap:8px;border:1px solid #888;');
    const uitleg = maak('div', '', `Paste a table (from Excel or a CSV file). The first row is the column names; a column called "name" is the row name. Rows with an existing name are updated, new names are added to "${c.name}".`);
    const t = maak('textarea', INVOER + 'height:260px;font-family:Consolas,monospace;');
    const k = maak('div', 'display:flex;gap:6px;justify-content:flex-end;');
    k.append(knop('Cancel', () => vak.remove()), knop('Import', () => {
      const rijen = leesTabel(t.value);
      if (rijen.length < 2) { alert('Paste a header row and at least one data row.'); return; }
      const kop = rijen[0];
      const naamKol = Math.max(0, kop.findIndex((h) => h.toLowerCase() === 'name'));
      for (const h of kop) if (h && h.toLowerCase() !== 'name' && !c.fields.includes(h)) c.fields.push(h);
      let nieuw = 0, bij = 0;
      for (const r of rijen.slice(1)) {
        const naam = r[naamKol]; if (!naam) continue;
        let it = c.items.find((i) => i.name === naam);
        if (it) bij++; else { it = { name: naam }; c.items.push(it); nieuw++; }
        kop.forEach((h, i) => { if (i !== naamKol && h && r[i] !== undefined && r[i] !== '') it[h] = waarde(r[i]); });
      }
      vak.remove(); markeer(); tekenAlles();
      alert(`${nieuw} rows added, ${bij} updated.`);
    }, PRIMAIR));
    doos.append(uitleg, t, k);
    vak.appendChild(doos);
    document.body.appendChild(vak);
    t.focus();
  }

  function tekenAlles() {
    titel.textContent = `Element Library: ${lib.name || 'Library'}${gewijzigd ? ' *' : ''}`;
    tekenLinks(); tekenKop(); tekenTabel(); tekenKnoppen();
  }

  kopbalk.append(titel,
    knop('Rename', () => { const n = prompt('Library name:', lib.name || ''); if (n) { lib.name = n; markeer(); } }),
    knop('Import library', () => {
      const inp = maak('input'); inp.type = 'file'; inp.accept = '.json,application/json';
      inp.addEventListener('change', async () => {
        try {
          const v = JSON.parse(await inp.files[0].text());
          if (!geldigeBibliotheek(v)) throw new Error('not a Seed43 library file');
          if (!confirm(`Replace the current library with "${v.name || inp.files[0].name}"? (Export the current one first if you want to keep it.)`)) return;
          lib = v; catId = lib.categories[0]?.id; gekozenRij = -1; markeer(); tekenAlles();
        } catch (e) { alert(`Could not import: ${e.message || e}`); }
      });
      inp.click();
    }),
    knop('Export library', () => {
      const blob = new Blob([JSON.stringify(lib, null, 1)], { type: 'application/json' });
      const a = maak('a'); a.href = URL.createObjectURL(blob);
      a.download = `${(lib.name || 'library').replace(/[^A-Za-z0-9 _-]+/g, '')}.seed43lib.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }),
    knop('Reset to NZ Steel', async () => {
      if (!confirm('Replace the library with the original NZ Steel library? Your changes are lost unless you exported them.')) return;
      lib = await standaardBibliotheek(api); catId = lib.categories[0]?.id; gekozenRij = -1; markeer(); tekenAlles();
    }),
  );
  voet.append(
    maak('span', 'flex:1;opacity:.7;align-self:center;', lib.source || ''),
    knop('Close', sluit),
    knop('Save', () => { try { bewaarBibliotheek(lib); gewijzigd = false; tekenAlles(); } catch (e) { alert(e.message); } }, PRIMAIR),
  );
  achter.addEventListener('mousedown', (e) => { if (e.target === achter) sluit(); });
  document.body.appendChild(achter);
  tekenAlles();
}
