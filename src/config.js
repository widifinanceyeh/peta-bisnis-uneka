/**
 * config.js — HANYA konfigurasi teknis yang stabil.
 * Dilarang menaruh konfigurasi bisnis di sini (daftar organ, aras, status,
 * label kolom, judul halaman). Semuanya berasal dari sheet Cfg_*.
 */

export const APP_VERSION = '5.19.0';

/**
 * URL deployment Apps Script (.../exec).
 * Diisi lewat variabel lingkungan REACT_APP_API_URL pada berkas .env,
 * atau langsung di sini bila lebih praktis.
 *
 * PENTING: setelah Code.gs diganti versi 4.0.0, buat Deploy > New version.
 * Bila memakai deployment yang sama, URL di bawah tidak perlu diubah.
 */
function urlBerjalan() {
  try {
    if (typeof window !== 'undefined' && window.PB_API_URL && String(window.PB_API_URL).trim()) {
      return String(window.PB_API_URL).trim();
    }
  } catch (e) { /* abaikan */ }
  return '';
}

export const API_URL =
  urlBerjalan() ||
  process.env.REACT_APP_API_URL ||
  'https://script.google.com/macros/s/AKfycbw2m4uJMWO_HQ2jIS_Vndmx5pKuHBi537ToQEA7-6CDBLFqMdPcTJW_i8rZBiVYysM/exec';

export const STORAGE_KEY = {
  FILTER: 'pb.filter.v42',
  HALAMAN: 'pb.halaman.v2',
  RINGKAS: 'pb.ringkas.v2',
  OLEH: 'pb.oleh.v2',
  LAMA: 'pb.blok2025.v4',
  PASAL: 'pb.pasal2026.v41',
  TUTUP: 'pb.kelompokTutup.v42',
  NASKAH_PASAL: 'pb.naskahPasal.v49',
  NASKAH_SOROT: 'pb.naskahSorot.v49',
  NASKAH_JENIS: 'pb.naskahJenis.v513',
  NASKAH_BERUBAH: 'pb.naskahBerubah.v49',
  NASKAH_MODE: 'pb.naskahMode.v50',
  NASKAH_PITA: 'pb.naskahPita.v50',
  NASKAH_CIUT: 'pb.naskahCiut.v50',
  NASKAH_SARING: 'pb.naskahSaring.v50',
  TELAAH_SEL: 'pb.telaahSel.v50',
  RUANG: 'pb.ruang.v53',
  CACHE_NASKAH: 'pb.nkCache.v54',
  REL_CIUT: 'pb.relCiut.v55',
  POSISI: 'pb.posisi.v58',          // v5.8: alamat halaman terakhir (dibuka tanpa alamat = lanjut dari sini)
  LIHAT: 'pb.lihatPasal.v58'        // v5.8: sidik pasal saat terakhir dibuka (tanda berubah)
};

export const TIMEOUT_MS = 60000;

/**
 * Jeda simpan otomatis, milidetik. Nilai ini hanya cadangan.
 * Yang berlaku adalah Cfg_App!JEDA_SIMPAN_MS bila kuncinya ada.
 */
export const JEDA_SIMPAN_MS = 800;
