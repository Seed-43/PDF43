// A small Seed43 message box: the app's WebView does not show window.alert,
// so a tool that reports back draws its own. Follows the app theme.
// open() shows it with a line of text; zet() changes the text; klaar() adds
// an OK button (and closes on Enter or Esc).

const ID = 'seed43-melding';
const CSS = `
#${ID}{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.25);}
#${ID} .kaart{min-width:320px;max-width:460px;padding:18px 20px 14px;border-radius:8px;box-shadow:0 8px 28px rgba(0,0,0,.35);
  background:var(--theme-surface,#2b2d31);color:var(--theme-text,#e8e8e8);border:1px solid var(--theme-border,#444);font:13px/1.45 system-ui,Segoe UI,sans-serif;}
#${ID} h3{margin:0 0 8px;font-size:14px;font-weight:600;}
#${ID} p{margin:0 0 12px;white-space:pre-wrap;}
#${ID} .knoppen{display:flex;justify-content:flex-end;}
#${ID} button{font:inherit;padding:5px 18px;border-radius:5px;cursor:pointer;border:1px solid var(--theme-accent,#d97706);
  background:transparent;color:inherit;}
#${ID} button:focus{outline:2px solid var(--theme-accent,#d97706);outline-offset:1px;}
`;

export function open(titel, tekst) {
  sluit();
  let s = document.getElementById(`${ID}-stijl`);
  if (!s) { s = document.createElement('style'); s.id = `${ID}-stijl`; document.head.appendChild(s); }
  s.textContent = CSS;
  const laag = document.createElement('div');
  laag.id = ID;
  laag.innerHTML = '<div class="kaart" role="dialog" aria-modal="true"><h3></h3><p></p><div class="knoppen"></div></div>';
  laag.querySelector('h3').textContent = titel;
  laag.querySelector('p').textContent = tekst;
  for (const e of ['pointerdown', 'mousedown', 'click', 'wheel', 'keydown']) laag.addEventListener(e, (ev) => ev.stopPropagation());
  document.body.appendChild(laag);
  return { zet, klaar };
}

export function zet(tekst) {
  const p = document.querySelector(`#${ID} p`);
  if (p) p.textContent = tekst;
}

export function klaar(tekst) {
  if (tekst !== undefined) zet(tekst);
  const vak = document.querySelector(`#${ID} .knoppen`);
  if (!vak || vak.firstChild) return;
  const ok = document.createElement('button');
  ok.textContent = 'OK';
  ok.addEventListener('click', sluit);
  vak.appendChild(ok);
  document.getElementById(ID).addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === 'Escape') sluit(); });
  ok.focus();
}

export function sluit() {
  document.getElementById(ID)?.remove();
}
