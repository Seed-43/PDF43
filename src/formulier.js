// Seed43 property forms as a Property / Value table: a header with an icon,
// the name and a subtitle, then foldable sections of rows. The same look in
// the Seed43 Properties drawer and in the app's Properties panel. Colours come
// from the app theme.

const STIJL_ID = 'seed43-formulier-stijl';
const DICHT = 'seed43.form.dicht';   // folded sections, by title

const CSS = `
.s43f{--rand:var(--theme-border,#c8ccd1);--tx:var(--theme-text,#1f2328);--tx2:var(--theme-text-secondary,#666);
  --acc:var(--theme-accent,#0078d7);--bg:var(--theme-surface,#fff);
  display:flex;flex-direction:column;font-size:13px;color:var(--tx);}
.s43f-kop{display:flex;align-items:center;gap:12px;padding:12px 14px;}
.s43f-icoon{width:44px;height:44px;flex:none;display:flex;align-items:center;justify-content:center;border-radius:6px;
  background:color-mix(in srgb,var(--k) 18%,transparent);color:var(--k);}
.s43f-icoon svg{width:28px;height:28px;}
.s43f-titel{font-size:17px;font-weight:700;line-height:1.2;}
.s43f-sub{color:var(--tx2);font-size:12px;margin-top:2px;}
.s43f-tabelkop{display:grid;grid-template-columns:45% 55%;background:color-mix(in srgb,var(--acc) 22%,var(--bg));
  font-weight:600;border-top:1px solid var(--rand);border-bottom:1px solid var(--rand);}
.s43f-tabelkop span{padding:7px 14px;}
.s43f-tabelkop span+span{border-left:1px solid var(--rand);}
.s43f-groep{display:flex;align-items:center;gap:8px;width:100%;padding:6px 10px;border:0;border-bottom:1px solid var(--rand);
  background:color-mix(in srgb,var(--tx) 6%,var(--bg));color:var(--tx2);font:inherit;font-size:13px;cursor:pointer;text-align:left;}
.s43f-groep i{width:12px;height:12px;border:1px solid currentColor;border-radius:2px;display:inline-flex;align-items:center;
  justify-content:center;font-style:normal;font-size:11px;line-height:1;flex:none;}
.s43f-rij{display:grid;grid-template-columns:45% 55%;align-items:center;border-bottom:1px solid var(--rand);min-height:34px;}
.s43f-rij[hidden],.s43f-schets[hidden]{display:none;}
.s43f-eig{padding:6px 10px 6px 24px;color:var(--tx);}
.s43f-waarde{padding:3px 8px;border-left:1px solid var(--rand);min-width:0;display:flex;flex-direction:column;gap:3px;}
.s43f-waarde input,.s43f-waarde select{width:100%;box-sizing:border-box;font:inherit;color:inherit;background:transparent;
  border:1px solid transparent;border-radius:3px;padding:4px 5px;min-width:0;}
.s43f-waarde input:hover,.s43f-waarde select:hover{border-color:var(--rand);}
.s43f-waarde input:focus,.s43f-waarde select:focus{border-color:var(--acc);outline:none;}
.s43f-waarde select option{background:var(--bg);color:var(--tx);}
.s43f-waarde .s43f-tekst{padding:4px 5px;font-variant-numeric:tabular-nums;}
.s43f-waarde button{font:inherit;font-size:12px;padding:2px 8px;cursor:pointer;}
.s43f-tip{padding:10px 14px;color:var(--tx2);font-size:12px;}
`;

export function stijl() {
  // Always rewrite: after a reinstall the page still holds the old sheet.
  let s = document.getElementById(STIJL_ID);
  if (!s) { s = document.createElement('style'); s.id = STIJL_ID; document.head.appendChild(s); }
  if (s.textContent !== CSS) s.textContent = CSS;
}

function leesDicht() {
  try { const v = JSON.parse(localStorage.getItem(DICHT) || '[]'); return new Set(Array.isArray(v) ? v : []); } catch { return new Set(); }
}
function zetDicht(titel, dicht) {
  const s = leesDicht();
  if (dicht) s.add(titel); else s.delete(titel);
  try { localStorage.setItem(DICHT, JSON.stringify([...s])); } catch {}
}

/** The form container. */
export function formulier() {
  stijl();
  const el = document.createElement('div');
  el.className = 's43f';
  return el;
}

/** Header: icon, name and subtitle, then the Property / Value heading. */
export function kop(el, titel, sub, kleur, icoon = '') {
  const k = document.createElement('div');
  k.className = 's43f-kop';
  k.style.setProperty('--k', kleur || 'var(--acc)');
  const i = document.createElement('div');
  i.className = 's43f-icoon';
  i.innerHTML = icoon || '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="4" y="9" width="16" height="6" rx="1"/></svg>';
  const t = document.createElement('div');
  const a = document.createElement('div'); a.className = 's43f-titel'; a.textContent = titel;
  const b = document.createElement('div'); b.className = 's43f-sub'; b.textContent = sub || '';
  t.append(a, b);
  k.append(i, t);
  const h = document.createElement('div');
  h.className = 's43f-tabelkop';
  h.innerHTML = '<span>Property</span><span>Value</span>';
  el.append(k, h);
}

/**
 * A foldable section: the rows added after it, up to the next section,
 * fold with it. Folded sections are remembered by title.
 */
export function groep(el, titel) {
  const g = document.createElement('button');
  g.type = 'button';
  g.className = 's43f-groep';
  const teken = document.createElement('i');
  const naam = document.createElement('span'); naam.textContent = titel;
  g.append(teken, naam);
  let dicht = leesDicht().has(titel);
  const pas = () => {
    teken.textContent = dicht ? '+' : '−';
    for (let n = g.nextElementSibling; n && !n.classList.contains('s43f-groep'); n = n.nextElementSibling) {
      if (n.classList.contains('s43f-rij') || n.classList.contains('s43f-schets')) n.hidden = dicht;
    }
  };
  g.addEventListener('click', () => { dicht = !dicht; zetDicht(titel, dicht); pas(); });
  el.appendChild(g);
  // Rows come after the section: fold them once they are in.
  queueMicrotask(pas);
  requestAnimationFrame(pas);
  return g;
}

/** A row: the property name and its editor (or several elements). */
export function veld(el, label, ...invoer) {
  const r = document.createElement('label');
  r.className = 's43f-rij';
  const l = document.createElement('span'); l.className = 's43f-eig'; l.textContent = label;
  const w = document.createElement('div'); w.className = 's43f-waarde';
  w.append(...invoer.filter(Boolean));
  r.append(l, w);
  el.appendChild(r);
  return invoer[0];
}

/** A row with a value that cannot be edited. */
export function waarde(el, label, tekst) {
  const s = document.createElement('span');
  s.className = 's43f-tekst';
  s.textContent = tekst;
  return veld(el, label, s);
}

export function tip(tekst) {
  const t = document.createElement('div');
  t.className = 's43f-tip';
  t.textContent = tekst;
  return t;
}
