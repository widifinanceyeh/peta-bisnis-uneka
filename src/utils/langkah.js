/**
 * langkah.js — logika penomoran langkah.
 * Murni fungsi, tanpa daftar organ atau aksi yang ditulis tetap.
 * Kunci langkah selalu berbentuk "KODEORGAN|KODEAKSI".
 */

 export function kunci(kodeOrgan, kodeAksi) {
  return kodeOrgan + '|' + kodeAksi;
}

export function pecahKunci(k) {
  const [organ, aksi] = String(k).split('|');
  return { organ, aksi };
}

/** Daftar langkah terurut menaik: [{ kunci, organ, aksi, nomor }] */
export function urutkan(steps) {
  return Object.keys(steps || {})
    .filter((k) => typeof steps[k] === 'number' && !isNaN(steps[k]))
    .map((k) => Object.assign({ kunci: k, nomor: steps[k] }, pecahKunci(k)))
    .sort((a, b) => a.nomor - b.nomor || a.kunci.localeCompare(b.kunci));
}

/** Menomori ulang menjadi 1..n dengan mempertahankan urutan relatif. */
export function nomoriUlang(steps) {
  const out = {};
  urutkan(steps).forEach((s, i) => { out[s.kunci] = i + 1; });
  return out;
}

/**
 * Klik satu sel.
 * - Sel kosong  -> menjadi langkah terakhir.
 * - Sel terisi  -> dihapus, sisanya dinomori ulang.
 */
export function klikSel(steps, k) {
  const salinan = Object.assign({}, steps);
  if (typeof salinan[k] === 'number') {
    delete salinan[k];
    return nomoriUlang(salinan);
  }
  const maks = urutkan(salinan).length;
  salinan[k] = maks + 1;
  return nomoriUlang(salinan);
}

/** Membandingkan dua kumpulan langkah. */
export function samaPersis(a, b) {
  const ka = Object.keys(a || {}).filter((k) => typeof a[k] === 'number');
  const kb = Object.keys(b || {}).filter((k) => typeof b[k] === 'number');
  if (ka.length !== kb.length) return false;
  return ka.every((k) => a[k] === b[k]);
}

/**
 * Ringkasan satu sel matriks.
 * pakaiKode = false -> "3 REKTOR"  (nama penuh dari Cfg_Organ)
 * pakaiKode = true  -> "3 REK"     (kode dari Cfg_Organ, untuk mode ringkas)
 */
export function ringkasAksi(steps, kodeAksi, organIndex, pemisah, teksKosong, pakaiKode) {
  const isi = urutkan(steps)
    .filter((s) => s.aksi === kodeAksi)
    .map((s) => {
      const o = organIndex[s.organ];
      const label = o ? (pakaiKode ? o.kode : o.nama) : s.organ;
      return s.nomor + ' ' + label;
    });
  return isi.length ? isi.join(pemisah) : teksKosong;
}

/** Organ mana saja yang muncul pada satu aksi. Dipakai untuk mewarnai sel. */
export function organPadaAksi(steps, kodeAksi) {
  return urutkan(steps).filter((s) => s.aksi === kodeAksi).map((s) => s.organ);
}

export function buatIndeksOrgan(daftarOrgan) {
  const idx = {};
  (daftarOrgan || []).forEach((o) => { idx[o.kode] = o; });
  return idx;
}