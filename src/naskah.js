import { api } from './api';
import { STORAGE_KEY } from './config';

/**
 * naskah.js — penyimpan keadaan modul Naskah dan Telaah (v5.4).
 *
 * v5.4: salinan terakhir (init, pasal, telaah) disimpan di peramban. Saat dibuka lagi, naskah langsung
 * tampil dari salinan itu, lalu diperbarui sekali dari server di latar belakang.
 *
 * Dimuat malas: tidak ada permintaan naskah sebelum halaman Naskah, Telaah, atau
 * rujukan pasal pada editor urusan benar-benar dibuka. Sheet tetap sumber
 * kebenaran; di sini hanya salinan baca yang disimpan per Pasal dan per Bab.
 *
 * Simpan jejak bersifat optimistis: layar berubah lebih dulu, nilai akhir
 * diambil dari jawaban backend, dan bila gagal nilai lama dikembalikan.
 */

let keadaan = {
  init: null,          // hasil naskahInit
  pasal: {},           // nomor pasal -> payload pasal
  bab: {},             // kode bab -> true bila seluruh pasalnya sudah dimuat
  telaah: null,        // hasil naskahTelaah: temuan per urusan, Monev, ayat mirip, rujukan silang, bilah
  yatim: null,         // ayat tanpa urusan beserta bunyi dan putusan
  hukum: {},           // kutipan dasar hukum -> bunyi dari pustaka
  dhPasal: {},         // nomor pasal -> true bila bunyi dasar hukumnya sudah diambil sekaligus (v5.2)
  kepatuhan: null,     // v5.3: butir Permen dari tab 04C
  luar: null,          // v5.3: muatan di luar peta
  hasilRapat: null,    // v5.3: {hasil: {idUrusan: {...}}, pilihan}
  turunan: null,       // v5.5: daftar dokumen turunan (tab 13) dan ayat yang mendelegasikan
  teks: null,          // v5.5: bunyi seluruh ayat 2026 untuk pencarian, {ayat: [[id, pasal, nomor, teks], …]}
  memuatInit: false,
  memuatTelaah: false,
  memuat: {},          // kunci 'bab:VII' | 'pasal:68' -> true
  galat: '',
  galatTelaah: ''
};

const pendengar = new Set();
let janjiInit = null;
let janjiTelaah = null;
let janjiYatim = null;
const janji = {};

/* ------------------------------------------------------------ salinan peramban (v5.4) */

const basi = { init: false, telaah: false, teks: false, bab: {} };   // dipulihkan dari peramban, belum diperbarui dari server
(function pulihkan() {
  try {
    const c = JSON.parse(window.localStorage.getItem(STORAGE_KEY.CACHE_NASKAH) || 'null');
    if (!c) return;
    if (c.init) { keadaan.init = c.init; basi.init = true; }
    if (c.telaah) { keadaan.telaah = c.telaah; basi.telaah = true; }
    if (c.pasal) keadaan.pasal = c.pasal;
    if (c.bab) { keadaan.bab = c.bab; Object.keys(c.bab).forEach((k) => { basi.bab[k] = true; }); }
    if (c.teks) { keadaan.teks = c.teks; basi.teks = true; }
  } catch (e) { /* salinan rusak atau peramban menolak: mulai kosong */ }
})();

let jedaSalin = null;
function simpanSalinan() {
  if (jedaSalin) return;
  jedaSalin = setTimeout(() => {
    jedaSalin = null;
    const k = STORAGE_KEY.CACHE_NASKAH;
    try {
      window.localStorage.setItem(k, JSON.stringify({ init: keadaan.init, telaah: keadaan.telaah, pasal: keadaan.pasal, bab: keadaan.bab, teks: keadaan.teks }));
    } catch (e) {
      try { window.localStorage.setItem(k, JSON.stringify({ init: keadaan.init })); } catch (x) { /* ruang penuh: abaikan */ }
    }
  }, 1500);
}

function set(patch) {
  keadaan = Object.assign({}, keadaan, patch);
  pendengar.forEach((fn) => { try { fn(keadaan); } catch (e) { /* abaikan */ } });
  if (patch.init || patch.telaah || patch.pasal || patch.teks) simpanSalinan();
}

export function langganNaskah(fn) {
  pendengar.add(fn);
  fn(keadaan);
  return () => pendengar.delete(fn);
}

export function ambilNaskah() { return keadaan; }

/* ------------------------------------------------------------ baca */

export function muatInitNaskah(paksa) {
  if (keadaan.init && !paksa) {
    if (basi.init) { basi.init = false; muatInitNaskah(true).catch(() => {}); }
    return Promise.resolve(keadaan.init);
  }
  if (janjiInit) return janjiInit;
  set({ memuatInit: true, galat: '' });
  janjiInit = api.naskahInit()
    .then((data) => { set({ init: data, memuatInit: false }); return data; })
    .catch((e) => { set({ memuatInit: false, galat: (e && e.message) || String(e) }); throw e; })
    .finally(() => { janjiInit = null; });
  return janjiInit;
}

function tandaiMemuat(kunci, nilai) {
  const m = Object.assign({}, keadaan.memuat);
  if (nilai) m[kunci] = true; else delete m[kunci];
  set({ memuat: m });
}

export function muatBab(kode, paksa) {
  if (!kode) return Promise.resolve(null);
  if (keadaan.bab[kode] && !paksa) {
    if (basi.bab[kode]) { delete basi.bab[kode]; muatBab(kode, true).catch(() => {}); }
    return Promise.resolve(true);
  }
  const k = 'bab:' + kode;
  if (janji[k]) return janji[k];
  tandaiMemuat(k, true);
  janji[k] = api.naskahBab(kode)
    .then((data) => {
      const pasal = Object.assign({}, keadaan.pasal);
      (data.pasal || []).forEach((p) => { pasal[p.pasal] = p; });
      set({ pasal, bab: Object.assign({}, keadaan.bab, { [kode]: true }) });
      return true;
    })
    .finally(() => { tandaiMemuat(k, false); delete janji[k]; });
  return janji[k];
}

export function muatPasal(nomor) {
  const n = Number(nomor);
  if (!n && n !== 0) return Promise.resolve(null);
  if (keadaan.pasal[n]) return Promise.resolve(keadaan.pasal[n]);
  const k = 'pasal:' + n;
  if (janji[k]) return janji[k];
  tandaiMemuat(k, true);
  janji[k] = api.naskahPasal(n)
    .then((data) => { set({ pasal: Object.assign({}, keadaan.pasal, { [n]: data }) }); return data; })
    .finally(() => { tandaiMemuat(k, false); delete janji[k]; });
  return janji[k];
}

export function muatTelaah(paksa) {
  if (keadaan.telaah && !paksa) {
    if (basi.telaah) { basi.telaah = false; muatTelaah(true).catch(() => {}); }
    return Promise.resolve(keadaan.telaah);
  }
  if (janjiTelaah) return janjiTelaah;
  set({ memuatTelaah: true, galatTelaah: '' });
  janjiTelaah = api.naskahTelaah()
    .then((data) => { set({ telaah: data, memuatTelaah: false }); return data; })
    .catch((e) => { set({ memuatTelaah: false, galatTelaah: (e && e.message) || String(e) }); throw e; })
    .finally(() => { janjiTelaah = null; });
  return janjiTelaah;
}

export function muatYatim(paksa) {
  if (keadaan.yatim && !paksa) return Promise.resolve(keadaan.yatim);
  if (janjiYatim) return janjiYatim;
  janjiYatim = api.naskahYatim()
    .then((data) => { set({ yatim: data }); return data; })
    .finally(() => { janjiYatim = null; });
  return janjiYatim;
}

/**
 * Seluruh bunyi dasar hukum satu pasal dalam satu permintaan (v5.2). Dipanggil saat pasal dibuka;
 * hasilnya mengisi salinan per kutipan sehingga klik kutipan tidak perlu menunggu.
 */
export function muatDasarHukumPasal(pasal) {
  const n = Number(pasal);
  if (!n) return Promise.resolve(null);
  const kunci = 'dhp:' + n;
  if (janji[kunci]) return janji[kunci];
  if (keadaan.dhPasal && keadaan.dhPasal[n]) return Promise.resolve(true);
  janji[kunci] = api.dasarHukumPasal(n)
    .then((data) => {
      set({
        hukum: Object.assign({}, keadaan.hukum, (data && data.hukum) || {}),
        dhPasal: Object.assign({}, keadaan.dhPasal, { [n]: true })
      });
      return true;
    })
    .finally(() => { delete janji[kunci]; });
  return janji[kunci];
}

/** Bunyi aturan untuk satu kutipan dasar hukum; disimpan per kutipan selama sesi. */
export async function muatDasarHukum(q) {
  const k = String(q || '').trim();
  if (!k) return null;
  if (keadaan.hukum[k]) return keadaan.hukum[k];
  // Bila pengambilan satu pasal sedang berjalan, tunggu itu dulu daripada membuka permintaan kedua.
  const berjalan = Object.keys(janji).filter((x) => x.indexOf('dhp:') === 0).map((x) => janji[x]);
  if (berjalan.length) {
    await Promise.all(berjalan.map((p) => p.catch(() => null)));
    if (keadaan.hukum[k]) return keadaan.hukum[k];
  }
  const kunci = 'dh:' + k;
  if (janji[kunci]) return janji[kunci];
  janji[kunci] = api.dasarHukum(k)
    .then((data) => { set({ hukum: Object.assign({}, keadaan.hukum, { [k]: data }) }); return data; })
    .finally(() => { delete janji[kunci]; });
  return janji[kunci];
}

/** Dipanggil tombol Refresh global sesudah cache server dibersihkan. */
export async function segarkanNaskah() {
  const adaInit = !!keadaan.init;
  const adaTelaah = !!keadaan.telaah;
  const adaYatim = !!keadaan.yatim;
  const babDimuat = Object.keys(keadaan.bab);
  const pasalDimuat = Object.keys(keadaan.pasal);
  set({ pasal: {}, bab: {}, hukum: {}, dhPasal: {}, kepatuhan: null, luar: null, hasilRapat: null, turunan: null });
  basi.teks = true;
  if (!adaInit && !adaTelaah) return;
  const kerja = [];
  if (adaInit) kerja.push(muatInitNaskah(true));
  if (adaTelaah) kerja.push(muatTelaah(true));
  if (adaYatim) kerja.push(muatYatim(true));
  kerja.push(muatHasilRapat(true).catch(() => null));
  await Promise.all(kerja);
  babDimuat.forEach((b) => { muatBab(b, true).catch(() => {}); });
  if (!babDimuat.length) pasalDimuat.slice(0, 6).forEach((p) => { muatPasal(p).catch(() => {}); });
}

/* ------------------------------------------------------------ simpan */

export function pasalDariId(id) {
  const m = /^[A-Z](\d{3})\.\d+$/.exec(String(id || ''));
  return m ? Number(m[1]) : 0;
}

function terapkanJejak(baris) {
  const pasal = Object.assign({}, keadaan.pasal);
  let ubah = false;
  Object.keys(pasal).forEach((n) => {
    const p = pasal[n];
    if (!p || !p.jejak) return;
    const i = p.jejak.findIndex((j) => j.id === baris.id);
    if (i === -1) return;
    const jejak = p.jejak.slice();
    jejak[i] = Object.assign({}, jejak[i], baris);
    pasal[n] = Object.assign({}, p, { jejak });
    ubah = true;
  });
  if (ubah) set({ pasal });
}

function rekapUlang() {
  // Penanda titik pada daftar pasal dihitung ulang dari salinan yang ada.
  if (!keadaan.init) return;
  const daftar = keadaan.init.daftar.map((d) => {
    const p = keadaan.pasal[d.pasal];
    if (!p) return d;
    const usulan = p.jejak.filter((j) => !j.dikonfirmasi).length;
    return Object.assign({}, d, { usulan, jmlJejak: p.jejak.length });
  });
  set({ init: Object.assign({}, keadaan.init, { daftar }) });
  // Telaah dihitung ulang di belakang; angka lama tetap tampil sampai yang baru tiba.
  if (keadaan.telaah) muatTelaah(true).catch(() => {});
}

/**
 * @param {Object} muatan {idJejak, id25?, id26?, status?, alasan?, dialihkan?, dikonfirmasi?, oleh?}
 */
export async function simpanJejak(muatan) {
  let sebelum = null;
  Object.keys(keadaan.pasal).forEach((n) => {
    const j = (keadaan.pasal[n].jejak || []).find((x) => x.id === muatan.idJejak);
    if (j && !sebelum) sebelum = Object.assign({}, j);
  });
  const patch = { id: muatan.idJejak };
  ['id25', 'id26', 'status', 'alasan', 'dialihkan', 'dikonfirmasi', 'oleh'].forEach((k) => {
    if (muatan[k] !== undefined) patch[k] = muatan[k];
  });
  terapkanJejak(patch);
  try {
    const hasil = await api.saveJejak(muatan);
    const bersih = Object.assign({}, hasil);
    delete bersih.selDitulis; delete bersih.dilewati;
    terapkanJejak(bersih);
    // Pasangan yang dipindah ke pasal lain: salinan pasal tujuan dibuang agar dimuat ulang.
    const buang = [bersih.id25, bersih.id26].map(pasalDariId).filter((n) => n && keadaan.pasal[n] &&
      !(keadaan.pasal[n].jejak || []).some((j) => j.id === bersih.id));
    if (buang.length) {
      const pasal = Object.assign({}, keadaan.pasal);
      const bab = Object.assign({}, keadaan.bab);
      buang.forEach((n) => { if (pasal[n]) delete bab[pasal[n].bab]; delete pasal[n]; });
      set({ pasal, bab });
    }
    rekapUlang();
    return hasil;
  } catch (e) {
    if (sebelum) terapkanJejak(sebelum);
    throw e;
  }
}

/**
 * Putusan atas ayat tanpa urusan (Lampiran Telaah). Optimistis seperti simpanJejak.
 * @param {Object} muatan {id26, putusan, alasan, urusan?, oleh?}
 */
export async function simpanPutusan(muatan) {
  const sebelumY = keadaan.yatim;
  const sebelumT = keadaan.telaah;
  const baris = { putusan: muatan.putusan, alasan: muatan.alasan, urusan: muatan.urusan || '', oleh: muatan.oleh || '' };
  const terapkan = (b) => {
    if (keadaan.yatim) set({ yatim: Object.assign({}, keadaan.yatim, { putusan: Object.assign({}, keadaan.yatim.putusan, { [muatan.id26]: b }) }) });
    if (keadaan.telaah) {
      const putusan = Object.assign({}, keadaan.telaah.putusan, { [muatan.id26]: b });
      const belum = (keadaan.telaah.yatim || []).filter((id) => !putusan[id]).length;
      const bilah = (keadaan.telaah.bilah || []).map((x) => (x.kode === 'YATIM' ? Object.assign({}, x, { jumlah: belum }) : x));
      set({ telaah: Object.assign({}, keadaan.telaah, { putusan, bilah }) });
    }
  };
  terapkan(baris);
  try {
    const hasil = await api.savePutusan(muatan);
    terapkan({ putusan: hasil.putusan, alasan: hasil.alasan, urusan: hasil.urusan, oleh: hasil.oleh, diperbarui: hasil.diperbarui });
    return hasil;
  } catch (e) {
    set({ yatim: sebelumY, telaah: sebelumT });
    throw e;
  }
}

/**
 * v5.4: putusan "Bukan kembar" atas satu pasangan dugaan ayat kembar. Pasangan langsung hilang dari daftar.
 * @param {Object} muatan {a, b, alasan, oleh?}
 */
export async function simpanKembar(muatan) {
  const sebelum = keadaan.telaah;
  const buang = (t) => {
    const sama = (x, y) => (x === muatan.a && y === muatan.b) || (x === muatan.b && y === muatan.a);
    const mirip = (t.mirip || []).filter((m) => !sama(m[0], m[1]));
    const kembar = (t.kembar || []).filter((m) => !sama(m.a, m.b));
    const bilah = (t.bilah || []).map((x) => (x.kode === 'MIRIP' ? Object.assign({}, x, { jumlah: mirip.length }) : x));
    return Object.assign({}, t, { mirip, kembar, bilah });
  };
  if (sebelum) set({ telaah: buang(sebelum) });
  try {
    return await api.saveKembar(muatan);
  } catch (e) {
    set({ telaah: sebelum });
    throw e;
  }
}

/* ------------------------------------------------------------ usulan redaksi (v5.1) */

function pasangRedaksi(nPasal, r) {
  const p = keadaan.pasal[nPasal];
  if (!p) return;
  const daftar = (p.redaksi || []).filter((x) => x.id !== r.id);
  if (r.status !== 'DIBATALKAN') daftar.push(r);
  set({ pasal: Object.assign({}, keadaan.pasal, { [nPasal]: Object.assign({}, p, { redaksi: daftar }) }) });
  if (keadaan.init) {
    const jml = daftar.filter((x) => x.status === 'USULAN').length;
    const d = keadaan.init.daftar.map((x) => (x.pasal === nPasal ? Object.assign({}, x, { redaksi: jml }) : x));
    set({ init: Object.assign({}, keadaan.init, { daftar: d }) });
  }
}

/**
 * Menyimpan atau mengubah usulan redaksi satu ayat. Tidak optimistis: layar berubah sesudah backend menerima.
 * @param {Object} muatan {id26, lama, baru, alasan, oleh}
 */
export async function simpanRedaksi(muatan) {
  const hasil = await api.saveRedaksi(muatan);
  pasangRedaksi(pasalDariId(hasil.id26 || muatan.id26), hasil);
  return hasil;
}

export async function batalRedaksi(usulan, oleh) {
  const hasil = await api.saveRedaksi({ idUsulan: usulan.id, id26: usulan.id26, batal: true, oleh: oleh || '' });
  pasangRedaksi(pasalDariId(usulan.id26), Object.assign({}, usulan, { status: 'DIBATALKAN' }));
  return hasil;
}

/** Menerapkan usulan ke Google Doc; bunyi ayat di layar diganti dengan hasil dari backend. */
export async function terapkanRedaksi(usulan, oleh) {
  const hasil = await api.terapkanRedaksi({ idUsulan: usulan.id, oleh: oleh || '' });
  const n = pasalDariId(usulan.id26);
  const p = keadaan.pasal[n];
  if (p && hasil.teks !== undefined) {
    const ayat26 = p.ayat26.map((a) => (a.id === usulan.id26
      ? Object.assign({}, a, { teks: hasil.teks, sorot: hasil.sorot && hasil.sorot.length ? hasil.sorot : undefined }) : a));
    set({ pasal: Object.assign({}, keadaan.pasal, { [n]: Object.assign({}, p, { ayat26 }) }) });
  }
  pasangRedaksi(n, Object.assign({}, usulan, hasil, { status: 'DITERAPKAN' }));
  if (keadaan.telaah) muatTelaah(true).catch(() => {});
  return hasil;
}

/* ------------------------------------------------------------ Telaah v5.3 */

function muatSekali(kunci, fn, medan, paksa) {
  if (keadaan[medan] && !paksa) return Promise.resolve(keadaan[medan]);
  if (janji[kunci]) return janji[kunci];
  janji[kunci] = fn()
    .then((data) => { set({ [medan]: data }); return data; })
    .finally(() => { delete janji[kunci]; });
  return janji[kunci];
}

export function muatKepatuhan(paksa) { return muatSekali('kepatuhan', api.naskahKepatuhan, 'kepatuhan', paksa); }
export function muatLuar(paksa) { return muatSekali('luar', api.naskahLuar, 'luar', paksa); }
export function muatHasilRapat(paksa) { return muatSekali('hasilRapat', api.naskahHasilRapat, 'hasilRapat', paksa); }
export function muatTurunan(paksa) { return muatSekali('turunan', api.naskahTurunan, 'turunan', paksa); }

/** v5.5: bunyi seluruh ayat untuk pencarian; dari salinan peramban bila ada, diperbarui sekali di latar. */
export function muatTeks() {
  if (keadaan.teks) {
    if (basi.teks) { basi.teks = false; muatSekali('teks', api.naskahTeks, 'teks', true).catch(() => {}); }
    return Promise.resolve(keadaan.teks);
  }
  return muatSekali('teks', api.naskahTeks, 'teks');
}

/** v5.5: simpan dokumen turunan, lalu baca ulang daftar (pencocokan dasar pasal dihitung server). */
export async function simpanTurunan(muatan) {
  const hasil = await api.saveTurunan(muatan);
  await muatTurunan(true);
  return hasil;
}

function rekapLuar(baris) {
  const rekap = { dibawa: 0, baru: 0, dihapus: 0, diputus: 0, pasal: 0, pasalBelum: 0, hapusBelum: 0 };
  const ps = {};
  baris.forEach((x) => {
    rekap[x.j]++;
    if ((x.j === 'dihapus' && x.jejak && x.jejak.dikonfirmasi) || (x.j !== 'dihapus' && x.pu)) rekap.diputus++;
    if (x.j === 'dihapus') { if (!(x.jejak && x.jejak.dikonfirmasi)) rekap.hapusBelum++; return; }
    if (!(x.pasal in ps)) ps[x.pasal] = false;
    if (!x.pu) ps[x.pasal] = true;
  });
  rekap.pasal = Object.keys(ps).length;
  rekap.pasalBelum = Object.keys(ps).filter((k) => ps[k]).length;
  return rekap;
}

function perbaruiLuar(cocok, patch) {
  if (!keadaan.luar) return;
  const f = typeof cocok === 'function' ? cocok : (x) => x.id === cocok;
  const baris = keadaan.luar.baris.map((x) => (f(x) ? Object.assign({}, x, patch) : x));
  set({ luar: Object.assign({}, keadaan.luar, { baris, rekap: rekapLuar(baris) }) });
}

/** v5.5: satu putusan untuk seluruh ayat tanpa urusan pada satu pasal (tab 09, ID "PASAL n"). */
export async function simpanPutusanPasal(muatan) {
  const h = await api.savePutusanPasal(muatan);
  perbaruiLuar((x) => x.j !== 'dihapus' && Number(x.pasal) === Number(muatan.pasal),
    { pu: { putusan: h.putusan, alasan: h.alasan, urusan: h.urusan, oleh: h.oleh, diperbarui: h.diperbarui } });
  return h;
}

/** Putusan atas satu ayat 2026 pada daftar "Muatan di luar peta" (disimpan ke tab 09). */
export async function simpanPutusanLuar(muatan) {
  const hasil = await simpanPutusan(muatan);
  perbaruiLuar(muatan.id26, { pu: { putusan: hasil.putusan, alasan: hasil.alasan, urusan: hasil.urusan, oleh: hasil.oleh, diperbarui: hasil.diperbarui } });
  return hasil;
}

/** "Setuju dihapus" untuk ayat 2025: jejaknya dikonfirmasi beserta alasan (tab 07). */
export async function konfirmasiHapusLuar(x, alasan, oleh) {
  const hasil = await api.saveJejak({ idJejak: x.jejak.id, dikonfirmasi: true, alasan, oleh: oleh || '' });
  perbaruiLuar(x.id, { jejak: Object.assign({}, x.jejak, { dikonfirmasi: true, alasan }) });
  // Salinan pasal dibuang supaya jejaknya dibaca ulang saat dibuka.
  const pasal = Object.assign({}, keadaan.pasal);
  const bab = Object.assign({}, keadaan.bab);
  if (pasal[x.pasal]) { delete bab[pasal[x.pasal].bab]; delete pasal[x.pasal]; set({ pasal, bab }); }
  return hasil;
}

/** Hasil pembahasan bunyi naskah per urusan (tab 12). */
export async function simpanHasilRapat(muatan) {
  const hasil = await api.saveHasilRapat(muatan);
  const lama = keadaan.hasilRapat || { hasil: {}, pilihan: [] };
  const peta = Object.assign({}, lama.hasil);
  if (hasil.hasil) peta[hasil.id] = { hasil: hasil.hasil, catatan: hasil.catatan, tgl: hasil.tgl, oleh: hasil.oleh };
  else delete peta[hasil.id];
  set({ hasilRapat: Object.assign({}, lama, { hasil: peta }) });
  return hasil;
}
