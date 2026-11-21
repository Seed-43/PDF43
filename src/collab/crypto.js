// Seed43 Collab: keys and end-to-end encryption (WebCrypto, so the same code
// runs in the app and in Node tests).
//
// The share key (what people send each other) never leaves the PC. From it:
//   access key   HKDF(share key, "access")   sent to the server as proof; it stores only a hash
//   content key  HKDF(share key, "content")  AES-256-GCM; encrypts everything; never sent
// So the server can't read the PDF, the markups, the title or anyone's name.

const C = globalThis.crypto;
const enc = new TextEncoder();
const dec = new TextDecoder();
const SALT = enc.encode('seed43-collab-v1');
const ALFABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';   // Crockford base32: no I, L, O, U
export const MAGIC = enc.encode('S43C');
const CHUNK = 1024 * 1024;

export function b64url(bytes) {
  let s = '';
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function unb64url(text) {
  const s = atob(text.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((text.length + 3) % 4));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

/** 160 random bits as S43-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX. */
export function newShareKey() {
  const bytes = C.getRandomValues(new Uint8Array(20));
  let bits = 0, value = 0, out = '';
  for (const b of bytes) {
    value = (value << 8) | b; bits += 8;
    while (bits >= 5) { out += ALFABET[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  return 'S43-' + out.match(/.{4}/g).join('-');
}

/** Read a typed or pasted key back to its 20 bytes, or null if it isn't one. */
export function parseShareKey(text) {
  let s = String(text || '').toUpperCase().replace(/^\s*S43/, '').replace(/[^0-9A-Z]/g, '')
    .replace(/[IL]/g, '1').replace(/O/g, '0').replace(/U/g, 'V');
  if (s.length !== 32 || [...s].some((c) => !ALFABET.includes(c))) return null;
  const out = new Uint8Array(20);
  let bits = 0, value = 0, i = 0;
  for (const c of s) {
    value = (value << 5) | ALFABET.indexOf(c); bits += 5;
    if (bits >= 8) { out[i++] = (value >>> (bits - 8)) & 255; bits -= 8; }
  }
  return out;
}

export function formatShareKey(bytes) {
  let bits = 0, value = 0, out = '';
  for (const b of bytes) {
    value = (value << 8) | b; bits += 8;
    while (bits >= 5) { out += ALFABET[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  return 'S43-' + out.match(/.{4}/g).join('-');
}

/** Both keys from a share key: { access (base64url, for the server), content (CryptoKey) }. */
export async function deriveKeys(shareKey) {
  const raw = typeof shareKey === 'string' ? parseShareKey(shareKey) : shareKey;
  if (!raw) throw new Error('That is not a Seed43 Collab key');
  const base = await C.subtle.importKey('raw', raw, 'HKDF', false, ['deriveBits', 'deriveKey']);
  const access = await C.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: SALT, info: enc.encode('access') }, base, 256);
  const content = await C.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: SALT, info: enc.encode('content') },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  return { access: b64url(access), content };
}

export function newSecret() {
  return b64url(C.getRandomValues(new Uint8Array(32)));
}

/** Encrypt a JSON value to the server's blob shape { iv, ct }. `aad` binds it to its place. */
export async function seal(key, value, aad = '') {
  const iv = C.getRandomValues(new Uint8Array(12));
  const ct = await C.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(aad) }, key, enc.encode(JSON.stringify(value)));
  return { iv: b64url(iv), ct: b64url(ct) };
}

export async function open(key, blob, aad = '') {
  const pt = await C.subtle.decrypt({ name: 'AES-GCM', iv: unb64url(blob.iv), additionalData: enc.encode(aad) }, key, unb64url(blob.ct));
  return JSON.parse(dec.decode(pt));
}

// File: "S43C" | version 1 | 8-byte nonce prefix | chunks of 1 MiB, each AES-GCM
// with iv = prefix + chunk number, and the chunk number and "last" flag
// authenticated, so chunks can't be swapped, dropped or cut short unnoticed.

function chunkIv(prefix, i) {
  const iv = new Uint8Array(12);
  iv.set(prefix);
  new DataView(iv.buffer).setUint32(8, i);
  return iv;
}
const chunkAad = (i, last) => enc.encode(`S43C|${i}|${last ? 1 : 0}`);

export async function sealFile(key, bytes) {
  const data = new Uint8Array(bytes);
  const prefix = C.getRandomValues(new Uint8Array(8));
  const n = Math.max(1, Math.ceil(data.length / CHUNK));
  const parts = [MAGIC, new Uint8Array([1]), prefix];
  for (let i = 0; i < n; i++) {
    const chunk = data.subarray(i * CHUNK, Math.min(data.length, (i + 1) * CHUNK));
    parts.push(new Uint8Array(await C.subtle.encrypt({ name: 'AES-GCM', iv: chunkIv(prefix, i), additionalData: chunkAad(i, i === n - 1) }, key, chunk)));
  }
  const out = new Uint8Array(parts.reduce((t, p) => t + p.length, 0));
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}

export async function openFile(key, bytes) {
  const data = new Uint8Array(bytes);
  if (data.length < 13 + 16 || MAGIC.some((b, i) => data[i] !== b) || data[4] !== 1) throw new Error('Not a Seed43 Collab file');
  const prefix = data.subarray(5, 13);
  const body = data.subarray(13);
  const step = CHUNK + 16;
  const n = Math.max(1, Math.ceil(body.length / step));
  const parts = [];
  for (let i = 0; i < n; i++) {
    const chunk = body.subarray(i * step, Math.min(body.length, (i + 1) * step));
    parts.push(new Uint8Array(await C.subtle.decrypt({ name: 'AES-GCM', iv: chunkIv(prefix, i), additionalData: chunkAad(i, i === n - 1) }, key, chunk)));
  }
  const out = new Uint8Array(parts.reduce((t, p) => t + p.length, 0));
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}

export async function sha256hex(text) {
  const h = await C.subtle.digest('SHA-256', enc.encode(text));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
