/**
 * kolom.js — turunan dari Cfg_Kolom.
 *
 * Sheet sumber dan sheet rancangan kini memiliki susunan organ dan aksi yang
 * BERBEDA. Berkas ini menyediakan jawaban atas satu pertanyaan: kombinasi
 * organ x aksi mana yang benar-benar punya kolom pada sebuah sheet.
 *
 * Tidak ada daftar organ atau aksi yang ditulis tetap di sini. Seluruh isinya
 * berasal dari bootstrap backend.
 */

/**
 * Kumpulan kunci "KODEORGAN|KODEAKSI" yang memiliki kolom pada satu sheet.
 * @param {object} cfg   hasil bootstrap
 * @param {string} jenis 'SUMBER' atau 'RANCANGAN'
 * @returns {Set<string>}
 */
export function ambilKombinasi(cfg, jenis) {
  const j = String(jenis).toUpperCase();

  // Backend 2.0.0 mengirimkannya langsung.
  const dariBootstrap = cfg && cfg.kombinasi ? cfg.kombinasi[j] : null;
  if (Array.isArray(dariBootstrap)) return new Set(dariBootstrap);

  // Cadangan untuk backend versi lama: susun sendiri dari Cfg_Kolom.
  const set = new Set();
  const kolom = cfg && cfg.kolom ? cfg.kolom : [];
  kolom.forEach((k) => {
    if (String(k.sheet || '').toUpperCase() === j) set.add(k.kodeOrgan + '|' + k.kodeAksi);
  });
  return set;
}

function sisiKunci(kombinasi, indeks) {
  const out = new Set();
  Array.from(kombinasi).forEach((k) => {
    const bagian = String(k).split('|');
    if (bagian[indeks]) out.add(bagian[indeks]);
  });
  return out;
}

/** Aksi yang punya setidaknya satu kolom pada sheet tersebut, urutan tetap. */
export function aksiDipakai(daftarAksi, kombinasi) {
  const ada = sisiKunci(kombinasi, 1);
  return (daftarAksi || []).filter((a) => ada.has(a.kode));
}

/** Organ yang punya setidaknya satu kolom pada sheet tersebut, urutan tetap. */
export function organDipakai(daftarOrgan, kombinasi) {
  const ada = sisiKunci(kombinasi, 0);
  return (daftarOrgan || []).filter((o) => ada.has(o.kode));
}

/** Gabungan dua daftar aksi tanpa duplikat, urutan mengikuti daftar acuan. */
export function gabungAksi(daftarAksi, kombinasiA, kombinasiB) {
  const ada = new Set([
    ...Array.from(sisiKunci(kombinasiA, 1)),
    ...Array.from(sisiKunci(kombinasiB, 1))
  ]);
  return (daftarAksi || []).filter((a) => ada.has(a.kode));
}
