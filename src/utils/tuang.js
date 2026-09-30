/**
 * tuang.js — memisahkan apa yang dituangkan ke dalam Statuta dari apa yang
 * tidak, tanpa menyembunyikan apa pun.
 *
 * DASAR PEMIKIRAN
 *   Peta menggambarkan alur kewenangan yang sebenarnya berjalan. Statuta
 *   hanya memuat yang mengikat organ Universitas. Yang kedua selalu himpunan
 *   bagian dari yang pertama. Tahap yang tidak dituang tetap ditampilkan,
 *   hanya dibedakan tampilannya, karena menyembunyikannya membuat peta
 *   terlihat tidak lengkap dan justru memancing pertanyaan.
 *
 * DUA SEBAB SEBUAH TAHAP TIDAK DITUANG
 *   1. Organnya organ Yayasan, yang kewenangannya lahir dari Anggaran Dasar
 *      dan Anggaran Rumah Tangga, bukan dari Statuta.
 *   2. Seluruh urusannya memang sudah diatur AD atau ART dan hanya mengikat
 *      organ Yayasan, ditandai lewat kolom Sumber muatan.
 *
 * Kedua daftar penentunya dibaca dari Cfg_App, tidak ditulis tetap di sini.
 * Bila kuncinya belum ada, seluruh fungsi ini padam dengan sendirinya dan
 * tampilan kembali seperti semula.
 */

function daftar(nilai) {
  return String(nilai == null ? '' : nilai)
    .split(',')
    .map(function (t) { return t.trim().toUpperCase(); })
    .filter(Boolean);
}

/**
 * @param {object} cfg hasil bootstrap
 * @returns {{organLuar:Set<string>, muatanLuar:Set<string>, legenda:string, aktif:boolean}}
 */
export function bacaAturanTuang(cfg) {
  const app = (cfg && cfg.app) || {};
  const organLuar = new Set(daftar(app.ORGAN_LUAR_STATUTA));
  const muatanLuar = new Set(daftar(app.MUATAN_LUAR_STATUTA));
  const legenda = String(app.LEGENDA_TUANG || '').trim();
  return {
    organLuar,
    muatanLuar,
    legenda,
    aktif: organLuar.size > 0 || muatanLuar.size > 0
  };
}

/** Seluruh urusan ini tidak dituangkan ke dalam Statuta. */
export function barisLuarStatuta(aturan, urusan) {
  if (!aturan || !aturan.aktif || !urusan) return false;
  return aturan.muatanLuar.has(String(urusan.muatan || '').trim().toUpperCase());
}

/** Satu tahap tidak dituangkan, entah karena organnya atau karena barisnya. */
export function langkahLuarStatuta(aturan, kodeOrgan, barisLuar) {
  if (!aturan || !aturan.aktif) return false;
  if (barisLuar) return true;
  return aturan.organLuar.has(String(kodeOrgan || '').toUpperCase());
}
