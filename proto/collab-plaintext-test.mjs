// Share a PDF and a markup with recognisable text, then look for that text on the server.
const opslag = new Map();
globalThis.localStorage = { getItem: (k) => opslag.get(k) ?? null, setItem: (k, v) => opslag.set(k, String(v)) };
const S = await import('../src/collab/sessions.js');
const { call } = await import('../src/collab/client.js');
const s = await S.deel(new TextEncoder().encode('%PDF-1.7 PLAINPDFMARKER ' + 'z'.repeat(3000)), 'PLAINTITLEMARKER', 'PLAINNAMEMARKER');
const k = await S.keys(s.key);
const ev = { id: 'evmarker1', ann: 'm1', op: 'create', base: null };
ev.data = await S.sluitEvent(k.content, { ...ev, data: { id: 'm1', type: 'textbox', page: 1, text: 'PLAINMARKUPMARKER' } });
await call('POST', '/v1/session/events', { access: k.access, device: S.device(), body: ev });
console.log(JSON.stringify({ key: s.key, owner: s.ownerToken }));
