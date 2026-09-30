/**
 * aras.js — logika format rancangan LIMA KOLOM ARAS (versi 4).
 *
 * Rancangan tidak lagi bernomor. Setiap aras memuat teks organ (dua organ
 * dipisah PEMISAH_GANDA) dan teks unit. Urutan alur ditentukan urutan aras
 * pada Cfg_Aksi.
 *
 * Perbandingan dengan Statuta 2025 dilakukan per aras, sebagai himpunan
 * organ, sesudah organ lama diterjemahkan lewat kolom "Padanan rancangan"
 * pada Cfg_Organ. Tidak ada nama organ yang ditulis tetap di sini.
 */
import { urutkan } from './langkah';

/** Versi 4.2: MUATAN TETAP = isi cukup di batang tubuh; aras usul–sah mengikuti C1.1. Hanya penanda. */
export const JENIS_TETAP = 'MUATAN TETAP';

export function tetap(u) {
  return normNama(u && u.jenisBaris) === JENIS_TETAP;
}

/** Peta kode kelompok -> baris judul (dari backend 4.2). */
export function indeksKelompok(kelompok) {
  const idx = {};
  (kelompok || []).forEach((k) => { idx[k.kode] = k; });
  return idx;
}

/** Kode kelompok tingkat satu (A, B, C) dari kode subkelompok (A1). */
export function kodeInduk(kode) {
  return String(kode || '').charAt(0);
}

/** Label kelompok untuk kepala halaman rincian, mis. "A1 · Penyelenggaraan pendidikan". */
export function labelKelompok(u, idx) {
  const k = u && u.kelompok;
  if (!k) return '';
  const g = (idx || {})[k];
  return g ? k + ' · ' + g.judul : k;
}

/** Token kolom yang boleh ditulis menurut Cfg_App!RANC_KOLOM_TULIS. */
export function izinTulis(cfg) {
  const v = String((cfg && cfg.app && cfg.app.RANC_KOLOM_TULIS) || 'ARAS,STATUS,PENUANGAN,CATATAN,TANGGAL,OLEH');
  return new Set(v.split(',').map((t) => t.trim().toUpperCase()).filter(Boolean));
}

/** Kolom pasal per aras dipasang atau belum (Cfg_App!RANC_JUDUL_PASALARAS). */
export function adaPasalAras(cfg) {
  return !!String((cfg && cfg.app && cfg.app.RANC_JUDUL_PASALARAS) || '').trim();
}

export function normNama(s) {
  return String(s == null ? '' : s).toUpperCase().replace(/\s+/g, ' ').trim();
}

function pemisahBersih(pemisah) {
  return String(pemisah || '/').trim() || '/';
}

export function pecahOrgan(teks, pemisah) {
  const p = pemisahBersih(pemisah);
  return String(teks == null ? '' : teks).split(p).map((t) => t.trim()).filter(Boolean);
}

export function gabungOrgan(daftar, pemisah) {
  const p = pemisahBersih(pemisah);
  return (daftar || []).filter(Boolean).join(' ' + p + ' ');
}

/** Konteks yang dipakai berulang: indeks nama organ, padanan, pemisah. */
export function buatKonteksAras(cfg) {
  const organ = (cfg && cfg.organ) || [];
  const idxNama = {};
  const idxKode = {};
  const padanan = {};
  organ.forEach((o) => {
    idxNama[normNama(o.nama)] = o;
    idxKode[o.kode] = o;
    padanan[o.kode] = o.padanan || o.kode;
  });
  return {
    idxNama,
    idxKode,
    padanan,
    pemisah: String((cfg && cfg.app && cfg.app.PEMISAH_GANDA) || '/'),
    aksi: (cfg && cfg.aksi) || []
  };
}

/** [{ nama, organ|null }] dari teks satu sel organ. */
export function organDariTeks(teks, ctx) {
  return pecahOrgan(teks, ctx.pemisah).map((nama) => ({
    nama,
    organ: ctx.idxNama[normNama(nama)] || null
  }));
}

function kodeAtauNama(item) {
  return item.organ ? item.organ.kode : 'NAMA:' + normNama(item.nama);
}

/** Himpunan kode organ rancangan per aras. */
export function himpunanBaru(aras, ctx) {
  const out = {};
  ctx.aksi.forEach((a) => {
    const v = (aras && aras[a.kode]) || {};
    out[a.kode] = new Set(organDariTeks(v.organ, ctx).map(kodeAtauNama));
  });
  return out;
}

/** Himpunan kode organ Statuta 2025 per aras, sesudah dipadankan. */
export function himpunanLama(steps, ctx) {
  const out = {};
  ctx.aksi.forEach((a) => { out[a.kode] = new Set(); });
  urutkan(steps).forEach((s) => {
    if (!out[s.aksi]) out[s.aksi] = new Set();
    out[s.aksi].add(ctx.padanan[s.organ] || s.organ);
  });
  return out;
}

function samaSet(a, b) {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

/** Jumlah aras yang kolom organnya kosong. */
export function jumlahArasKosong(aras, ctx) {
  return ctx.aksi.filter((a) => !organDariTeks(((aras || {})[a.kode] || {}).organ, ctx).length).length;
}

export function adaRancangan(u, ctx) {
  return jumlahArasKosong(u.aras, ctx) < ctx.aksi.length;
}

/**
 * 'TAMBAHAN' urusan tanpa padanan 2025 · 'KOSONG' belum dirancang ·
 * 'SAMA' himpunan organ tiap aras sama · 'BEDA' selebihnya.
 */
export function bandingUrusan(u, ctx) {
  if (u.adaDiSumber !== false && u.adaDiRancangan === false) return 'DIHENTIKAN';
  if (!adaRancangan(u, ctx)) return 'KOSONG';
  if (u.adaDiSumber === false) return 'TAMBAHAN';
  const baru = himpunanBaru(u.aras, ctx);
  const lama = himpunanLama(u.lama, ctx);
  return ctx.aksi.every((a) => samaSet(baru[a.kode], lama[a.kode] || new Set())) ? 'SAMA' : 'BEDA';
}

/** Aras mana saja yang berbeda dari Statuta 2025. */
export function arasBerbeda(u, ctx) {
  if (u.adaDiSumber === false) return [];
  const baru = himpunanBaru(u.aras, ctx);
  const lama = himpunanLama(u.lama, ctx);
  return ctx.aksi.filter((a) => !samaSet(baru[a.kode], lama[a.kode] || new Set())).map((a) => a.kode);
}

/** Apakah kode organ (sesudah dipadankan) muncul di rancangan. */
export function organDiRancangan(u, kodeOrgan, ctx) {
  const target = ctx.padanan[kodeOrgan] || kodeOrgan;
  const baru = himpunanBaru(u.aras, ctx);
  return Object.keys(baru).some((k) => baru[k].has(target));
}

/** Nama organ rancangan dari langkah Statuta 2025 per aras. Dipakai "Salin dari kondisi lama". */
export function arasDariLama(steps, ctx) {
  const lama = himpunanLama(steps, ctx);
  const out = {};
  Object.keys(lama).forEach((k) => {
    out[k] = Array.from(lama[k]).map((kode) => (ctx.idxKode[kode] ? ctx.idxKode[kode].nama : kode));
  });
  return out;
}

/** Kelas warna lencana dari posisi nilai pada daftar pilihan sheet. */
export function kelasUrutan(nilai, daftar) {
  const i = (daftar || []).findIndex((d) => normNama(d) === normNama(nilai));
  return ['lencana-hijau', 'lencana-kuning', 'lencana-oranye'][i] || 'lencana-abu';
}

export function lengkap(u, ctx) {
  const t = normNama(u.kelengkapan);
  if (t) return t === 'LENGKAP';
  return jumlahArasKosong(u.aras, ctx) === 0;
}
