// Seed43 Collab: the calls to the collab server. Keys travel in headers only.

export const SERVER = 'https://collab.seed43.org';

export class CollabError extends Error {
  constructor(status, data) {
    super(data?.error || `Server error ${status}`);
    this.status = status;
    this.code = data?.code || (status === 0 ? 'offline' : 'error');
    this.data = data || {};
  }
}

/** Friendly text for the errors a person can meet. */
export function uitleg(e) {
  switch (e?.code) {
    case 'offline': return 'Can\'t reach the Seed43 Collab server. Check your internet connection.';
    case 'full': return 'This session is full: it already has 3 people.';
    case 'removed': return 'The owner removed you from this session.';
    case 'read_only': return 'This session is read-only now: you can still download it, but not change it.';
    case 'already_sharing': return 'You already share a PDF. End or delete it first, or wait until its editing days are over.';
    case 'share_limit': return 'Too many new shares from your internet address today. Try again tomorrow.';
    case 'at_capacity': return 'The Seed43 Collab server is full at the moment. Supporting Seed43 helps it grow.';
    case 'blocked': return 'This internet address can\'t create shares.';
    case 'gone': return e.data?.reason === 'owner' ? 'The owner deleted this session.'
      : e.data?.reason === 'reported' ? 'This session was removed.' : 'This session has ended and was deleted.';
    case 'denied': return 'That key doesn\'t match a session (or you\'re not in it).';
    default: return e?.message || String(e);
  }
}

export async function call(method, path, { body, raw, access, device, owner, query, signal } = {}) {
  const headers = {};
  if (access) headers['X-S43-Access'] = access;
  if (device) headers['X-S43-Device'] = device;
  if (owner) headers['X-S43-Owner'] = owner;
  let payload;
  if (raw) { headers['Content-Type'] = 'application/octet-stream'; payload = raw; }
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const url = SERVER + path + (query ? '?' + new URLSearchParams(query) : '');
  let r;
  try {
    r = await fetch(url, { method, headers, body: payload, signal, cache: 'no-store' });
  } catch (e) {
    if (e?.name === 'AbortError') throw e;
    throw new CollabError(0, { error: String(e?.message || e), code: 'offline' });
  }
  const type = r.headers.get('Content-Type') || '';
  if (!r.ok) {
    let data = null;
    try { data = await r.json(); } catch {}
    throw new CollabError(r.status, data);
  }
  return type.includes('application/json') ? r.json() : new Uint8Array(await r.arrayBuffer());
}
