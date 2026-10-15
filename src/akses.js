/**
 * akses.js (v5.23) — token masuk satu pengguna.
 *
 * Token dibuat dan diperiksa oleh Apps Script (Akses.gs). Peramban hanya menyimpannya dan
 * membaca tanggal kedaluwarsanya agar halaman masuk tampil tanpa menunggu server.
 * Keputusan sah-tidaknya token selalu di server: data tidak dikirim tanpa token yang sah.
 */
import { STORAGE_KEY } from './config';
import { hapusSemuaSimpanan } from './simpanan';

const ACARA_HABIS = 'pb-akses-habis';
// Salinan data di perangkat yang dibersihkan saat Keluar (lihat awal.js dan naskah.js; IndexedDB di simpanan.js).
const SALINAN_LOKAL = ['pb.snapshot.v46', STORAGE_KEY.CACHE_NASKAH];
const TANDA_HAPUS = 'pb.hapusSalinan';

export function bacaToken() {
  try { return window.localStorage.getItem(STORAGE_KEY.AKSES) || ''; } catch (e) { return ''; }
}

export function simpanToken(token) {
  try { window.localStorage.setItem(STORAGE_KEY.AKSES, token); } catch (e) { /* abaikan */ }
}

function hapusToken() {
  try { window.localStorage.removeItem(STORAGE_KEY.AKSES); } catch (e) { /* abaikan */ }
}

/** Token ada dan belum lewat tanggal kedaluwarsanya. */
export function tokenBerlaku() {
  const t = bacaToken();
  if (!t || t.indexOf('.') < 1) return false;
  try {
    let isi = t.split('.')[0].replace(/-/g, '+').replace(/_/g, '/');
    while (isi.length % 4) isi += '=';
    const data = JSON.parse(window.atob(isi));
    return Number(data.exp) * 1000 > Date.now();
  } catch (e) { return false; }
}

/** Dipanggil api.js bila server menolak token. */
export function aksesHabis() {
  hapusToken();
  try { window.dispatchEvent(new Event(ACARA_HABIS)); } catch (e) { /* abaikan */ }
}

export function dengarAksesHabis(fn) {
  window.addEventListener(ACARA_HABIS, fn);
  return () => window.removeEventListener(ACARA_HABIS, fn);
}

/** Keluar: token dibuang dan salinan data di perangkat dihapus, lalu halaman masuk ditampilkan. */
export async function keluar() {
  hapusToken();
  try {
    SALINAN_LOKAL.forEach((k) => window.localStorage.removeItem(k));
    window.localStorage.setItem(TANDA_HAPUS, '1');
  } catch (e) { /* abaikan */ }
  const tuntas = await hapusSemuaSimpanan();
  if (tuntas) { try { window.localStorage.removeItem(TANDA_HAPUS); } catch (e) { /* abaikan */ } }
  window.location.hash = '#peta';
  window.location.reload();
}

/** Cadangan: bila penghapusan salinan saat Keluar belum tuntas, diulang sebelum aplikasi dibuka. */
export function selesaikanKeluar() {
  let perlu = false;
  try { perlu = window.localStorage.getItem(TANDA_HAPUS) === '1'; } catch (e) { return; }
  if (!perlu) return;
  hapusSemuaSimpanan().then((ok) => { if (ok) { try { window.localStorage.removeItem(TANDA_HAPUS); } catch (e) { /* abaikan */ } } });
}
