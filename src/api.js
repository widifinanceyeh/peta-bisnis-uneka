// Semua komunikasi ke Apps Script.
import { API_URL, TIMEOUT_BACA, TIMEOUT_TULIS } from './config';

export class GalatData extends Error {}
export class GalatJaringan extends Error {}
export class GalatSesi extends GalatData {}

// Kunci sesi hasil masuk; dikirim pada setiap permintaan.
let token = '';
export function setToken(t) { token = t || ''; }

function urlDengan(params) {
  const usp = new URLSearchParams();
  Object.keys(params).forEach((k) => {
    const v = params[k];
    if (v !== undefined && v !== null && v !== '') usp.set(k, String(v));
  });
  usp.set('_', String(Date.now()));
  return API_URL + '?' + usp.toString();
}

async function ambil(url, opsi, batas, kunci) {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? window.setTimeout(() => ctrl.abort(), batas) : null;
  let res;
  try {
    res = await fetch(url, Object.assign({ redirect: 'follow', cache: 'no-store', signal: ctrl ? ctrl.signal : undefined }, opsi));
  } catch (err) {
    throw new GalatJaringan(err && err.name === 'AbortError'
      ? 'Server terlalu lama merespons.'
      : 'Tidak dapat terhubung ke server. Periksa koneksi internet.');
  } finally {
    if (timer) window.clearTimeout(timer);
  }
  if (!res.ok) throw new GalatJaringan('Server merespons ' + res.status + '.');
  let json;
  try { json = await res.json(); } catch (err) { throw new GalatJaringan('Respons server tidak terbaca.'); }
  if (json && json.kode === 'SESI') {
    // Hanya umumkan bila permintaan dikirim dengan kunci yang masih berlaku di peramban ini.
    if (kunci && kunci === token) { try { window.dispatchEvent(new Event('rtl-sesi-habis')); } catch (e) { /* abaikan */ } }
    throw new GalatSesi(json.message || 'Sesi berakhir. Silakan masuk kembali.');
  }
  if (!json || !json.success) throw new GalatData((json && json.message) || 'Permintaan ditolak server.');
  return json.data;
}

/** GET dengan batas waktu; diulang hanya untuk galat jaringan. */
export async function get(action, params = {}, ulang = 2) {
  let galat;
  for (let i = 0; i <= ulang; i++) {
    try {
      return await ambil(urlDengan(Object.assign({ action, t: token }, params)), { method: 'GET' }, TIMEOUT_BACA, token);
    } catch (err) {
      if (err instanceof GalatData) throw err;
      galat = err;
      await new Promise((r) => window.setTimeout(r, 600 * (i + 1)));
    }
  }
  throw galat;
}

function idPermintaan() {
  try { if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID(); } catch (e) { /* abaikan */ }
  return 'REQ-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
}

/** POST text/plain; bila jaringan gagal, cadangan GET ?p= dengan requestId sama (aman diulang). */
export async function post(action, payload) {
  const requestId = idPermintaan();
  const kunci = token;
  const body = JSON.stringify({ action, payload, requestId, token: kunci });
  try {
    return await ambil(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body }, TIMEOUT_TULIS, kunci);
  } catch (err) {
    if (err instanceof GalatData) throw err;
    return ambil(urlDengan({ action, t: kunci, p: JSON.stringify({ payload, requestId }) }), { method: 'GET' }, TIMEOUT_TULIS, kunci);
  }
}

/** Masuk: hanya POST (sandi tidak pernah dikirim lewat alamat URL). */
export function masuk(username, sandi) {
  const body = JSON.stringify({ action: 'masuk', payload: { username, sandi } });
  return ambil(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body }, TIMEOUT_TULIS);
}
export const daftarPengguna = () => get('daftarPengguna', {}, 1);

export const init = (segar) => get('init', segar ? { segar: '1' } : {});
export const versi = () => get('versi', {}, 0);
export const ping = () => get('ping', {}, 0);
export const bacaNotulen = (url) => get('bacaNotulen', { url }, 0);
/** Jejak perubahan satu entitas; dibaca saat panel rincian dibuka, bukan saat init. */
export const riwayat = (jenis, id) => get('riwayat', { jenis, id }, 1);
