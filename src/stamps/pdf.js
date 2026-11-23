// A blank PDF of `aantal` pages, each `w` by `h` points: the paper a sheet
// or form is put on when the user asks for a new PDF from it.

export function legePdf(w, h, aantal = 1) {
  const n = Math.max(1, Math.min(500, Math.floor(aantal) || 1));
  const objecten = [];
  objecten[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  const kinderen = Array.from({ length: n }, (_, i) => `${3 + i} 0 R`).join(' ');
  objecten[2] = `<< /Type /Pages /Kids [${kinderen}] /Count ${n} >>`;
  const maat = `[0 0 ${(+w).toFixed(2)} ${(+h).toFixed(2)}]`;
  for (let i = 0; i < n; i++) objecten[3 + i] = `<< /Type /Page /Parent 2 0 R /MediaBox ${maat} /Resources << >> >>`;
  let uit = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const plekken = [];
  for (let i = 1; i < objecten.length; i++) {
    plekken[i] = uit.length;
    uit += `${i} 0 obj\n${objecten[i]}\nendobj\n`;
  }
  const xref = uit.length;
  uit += `xref\n0 ${objecten.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objecten.length; i++) uit += `${String(plekken[i]).padStart(10, '0')} 00000 n \n`;
  uit += `trailer\n<< /Size ${objecten.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Uint8Array.from(uit, (c) => c.charCodeAt(0) & 0xff);
}
