/**
 * monev.js — pembacaan kolom "Terkunci Monev".
 *
 * Kolom itu tidak berisi kosong untuk baris yang bebas, melainkan kata
 * "tidak". Tanpa penyaring ini, setiap baris dianggap terkunci dan lencana
 * kehilangan maknanya.
 *
 * Daftar kata pengingkar sengaja pendek dan hanya berisi bentuk yang memang
 * dipakai pada sheet. Nilai lain apa pun dianggap sebagai nomor butir, supaya
 * penambahan rumusan baru pada sheet tetap terbaca tanpa mengubah kode.
 */
const PENGINGKAR = ['', '-', '–', '—', 'tidak', 'tidak ada', 'nihil', 'n/a', 'na'];

/**
 * @param {*} nilai isi sel Terkunci Monev
 * @returns {string} nomor butir bila terkunci, string kosong bila tidak
 */
export function butirMonev(nilai) {
  const t = String(nilai == null ? '' : nilai).trim();
  if (PENGINGKAR.indexOf(t.toLowerCase()) !== -1) return '';
  return t;
}

/** @returns {boolean} */
export function terkunciMonev(nilai) {
  return butirMonev(nilai) !== '';
}
