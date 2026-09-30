import { API_URL, TIMEOUT_MS } from './config';

/**
 * Lapisan permintaan ke Apps Script.
 *
 * Versi 4.6:
 *  - Setiap permintaan baca dicoba sampai tiga kali (jeda 1,5 dan 4 detik) bila
 *    gagal karena jaringan, pengalihan, atau galat sementara 404/429/5xx.
 *    Apps Script kerap membalas 404 pada permintaan pertama saat backend masih
 *    dingin atau saat sesi Google baru dipulihkan.
 *  - Batas waktu dihitung per percobaan, bukan sekali untuk seluruh proses.
 *  - Tambahan action: init, teks, detail, versi (lihat Cepat.gs).
 *  - Versi 4.9: naskahInit, naskahBab, naskahPasal, saveJejak (lihat Naskah.gs).
 *  - Versi 5.0: naskahTelaah, naskahYatim, dasarHukum, savePutusan (lihat Telaah.gs); naskahUji dihapus.
 */

const PERCOBAAN = 3;
const JEDA_MS = [1500, 4000];
const TIMEOUT_PERCOBAAN_MS = Math.min(TIMEOUT_MS, 25000);

function tidur(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Waktu tunggu habis. Periksa koneksi.')), ms);
    promise.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); }
    );
  });
}

function periksaUrl() {
  if (!API_URL || API_URL.indexOf('GANTI_DENGAN') === 0) {
    throw new Error('URL API belum diisi. Isi REACT_APP_API_URL pada berkas .env lalu jalankan ulang aplikasi.');
  }
}

/**
 * Membaca balasan sebagai teks lebih dulu, baru diurai sebagai JSON.
 * Kalau server membalas HTML, itu hampir selalu halaman login Google —
 * pesan galatnya dibuat spesifik supaya penyebabnya langsung terbaca.
 */
async function bacaBalasan(res) {
  const teks = await res.text();
  const awal = teks.trim().slice(0, 1).toLowerCase();

  if (awal === '<') {
    throw new Error(
      'Server membalas halaman HTML, bukan data. Penyebab lazimnya: deployment dibatasi ' +
      'akun organisasi sementara aplikasi dibuka dari domain lain, sehingga permintaan ' +
      'dialihkan ke halaman login Google. Ubah akses deployment menjadi Anyone, atau buka ' +
      'aplikasi dari domain yang sama dengan akun organisasi.'
    );
  }

  let json;
  try {
    json = JSON.parse(teks);
  } catch (e) {
    throw new Error('Balasan server tidak dapat dibaca sebagai JSON: ' + teks.slice(0, 160));
  }

  if (!json || typeof json !== 'object') throw new Error('Balasan server tidak dikenali.');
  if (json.success === false || json.ok === false) {
    throw new Error(json.message || 'Permintaan ditolak server.');
  }
  return json.data;
}

function galatJaringan(e) {
  if (e instanceof TypeError) {
    const g = new Error(
      'Permintaan tidak sampai ke server. Penyebab lazimnya: URL /exec salah, deployment ' +
      'belum dibuat versi barunya setelah kode diubah, atau akses deployment memblokir ' +
      'permintaan dari alamat aplikasi ini.'
    );
    g.sementara = true;
    return g;
  }
  return e;
}

/** Galat yang masuk akal untuk dicoba ulang; galat data tidak diulang. */
function layakDiulang(e) {
  if (!e) return false;
  if (e.sementara) return true;
  const p = String(e.message || '');
  return (
    p.indexOf('HTTP 404') !== -1 ||
    p.indexOf('HTTP 429') !== -1 ||
    p.indexOf('HTTP 5') !== -1 ||
    p.indexOf('Waktu tunggu habis') !== -1 ||
    p.indexOf('tidak sampai ke server') !== -1
  );
}

async function sekaliGet(url, batas) {
  let res;
  try {
    res = await withTimeout(fetch(url, { method: 'GET', redirect: 'follow', cache: 'no-store' }), batas || TIMEOUT_PERCOBAAN_MS);
  } catch (e) {
    throw galatJaringan(e);
  }
  if (!res.ok) {
    const g = new Error('Gagal menghubungi server (HTTP ' + res.status + ').');
    g.sementara = res.status === 404 || res.status === 429 || res.status >= 500;
    throw g;
  }
  return bacaBalasan(res);
}

/**
 * @param {string} action
 * @param {Object} [params]
 * @param {Object} [opsi] onPercobaan: (ke, total) => void — dipakai penanda "menyambung ulang".
 *                        batas: batas waktu per percobaan (ms); percobaan: jumlah percobaan (v5.6).
 */
export async function apiGet(action, params, opsi) {
  periksaUrl();
  const q = new URLSearchParams({ action, _: String(Date.now()) });
  if (params) Object.keys(params).forEach((k) => q.append(k, params[k]));
  const url = API_URL + '?' + q.toString();

  let terakhir = null;
  const total = (opsi && opsi.percobaan) || PERCOBAAN;
  for (let ke = 1; ke <= total; ke++) {
    try {
      return await sekaliGet(url, opsi && opsi.batas);
    } catch (e) {
      terakhir = e;
      if (ke === total || !layakDiulang(e)) break;
      if (opsi && opsi.onPercobaan) { try { opsi.onPercobaan(ke, total); } catch (x) { /* abaikan */ } }
      await tidur(JEDA_MS[ke - 1] || 4000);
    }
  }
  throw terakhir;
}

export async function apiPost(payload) {
  periksaUrl();
  let res;
  try {
    res = await withTimeout(
      fetch(API_URL, {
        method: 'POST',
        redirect: 'follow',
        cache: 'no-store',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      }),
      TIMEOUT_PERCOBAAN_MS
    );
  } catch (e) {
    throw galatJaringan(e);
  }
  if (!res.ok) {
    const g = new Error('Gagal menghubungi server (HTTP ' + res.status + ').');
    g.sementara = res.status === 404 || res.status === 429 || res.status >= 500;
    throw g;
  }
  return bacaBalasan(res);
}

/**
 * Simpan lewat POST. Bila POST gagal karena masalah jaringan, CORS, atau
 * pengalihan ke halaman login, dicoba ulang sekali lagi lewat POST, lalu
 * lewat GET dengan muatan pada parameter p. Galat dari sisi data — misalnya
 * ID tidak ditemukan — tidak diulang.
 */
async function simpanDenganCadangan(payload) {
  return simpanDenganCadanganAksi(payload, 'saveUrusan');
}

async function simpanDenganCadanganAksi(payload, aksiGet) {
  let ePost = null;
  for (let ke = 1; ke <= 2; ke++) {
    try {
      return await apiPost(payload);
    } catch (e) {
      ePost = e;
      if (!layakDiulang(e)) throw e;
      if (ke === 1) await tidur(JEDA_MS[0]);
    }
  }
  try {
    return await apiGet(aksiGet, { p: JSON.stringify(payload) });
  } catch (eGet) {
    throw new Error(
      'Simpan gagal lewat POST maupun jalur cadangan GET.\n' +
      'POST: ' + (ePost && ePost.message) + '\n' +
      'GET: ' + eGet.message
    );
  }
}

export const api = {
  ping: () => apiGet('ping'),
  init: (opsi) => apiGet('init', null, opsi),
  teks: () => apiGet('teks'),
  detail: (id) => apiGet('detail', { id }),
  versi: () => apiGet('versi'),
  bootstrap: () => apiGet('bootstrap'),
  readAll: () => apiGet('readAll'),
  getVersion: () => apiGet('getVersion'),
  clearCache: () => apiGet('clearCache'),
  diagnosa: () => apiGet('diagnosa'),
  saveUrusan: (payload) => simpanDenganCadangan(Object.assign({ action: 'saveUrusan' }, payload)),
  // Modul Naskah (v4.9, lihat Naskah.gs).
  naskahInit: () => apiGet('naskahInit'),
  naskahBab: (bab) => apiGet('naskahBab', { bab }),
  naskahPasal: (pasal) => apiGet('naskahPasal', { pasal }),
  saveJejak: (payload) => simpanDenganCadanganAksi(Object.assign({ action: 'saveJejak' }, payload), 'saveJejak'),
  // Telaah (v5, lihat Telaah.gs).
  naskahTelaah: () => apiGet('naskahTelaah'),
  naskahYatim: () => apiGet('naskahYatim'),
  dasarHukum: (t) => apiGet('dasarHukum', { t }),
  dasarHukumPasal: (pasal) => apiGet('dasarHukumPasal', { pasal }),   // v5.2: seluruh kutipan satu pasal
  // v5.3: butir Permen (04C), muatan di luar peta, hasil rapat per urusan.
  naskahKepatuhan: () => apiGet('naskahKepatuhan'),
  naskahLuar: () => apiGet('naskahLuar'),
  naskahHasilRapat: () => apiGet('naskahHasilRapat'),
  saveHasilRapat: (payload) => simpanDenganCadanganAksi(Object.assign({ action: 'saveHasilRapat' }, payload), 'saveHasilRapat'),
  // v5.5: Dokumen Turunan, bunyi seluruh ayat untuk pencarian, putusan per pasal.
  naskahTurunan: () => apiGet('naskahTurunan'),
  naskahTeks: () => apiGet('naskahTeks'),
  // v5.6 (Paket.gs): j = 'n' naskah | 'h' dasar hukum; v = versi yang sudah dimiliki; bangun = susun sekarang.
  paketVersi: () => apiGet('paketVersi', null, { batas: 15000 }),
  paket: (j, v, bangun) => apiGet('paket', { j, v: v || '', bangun: bangun ? '1' : '0' },
    bangun ? { batas: 150000, percobaan: 1 } : { batas: 30000 }),
  saveTurunan: (payload) => simpanDenganCadanganAksi(Object.assign({ action: 'saveTurunan' }, payload), 'saveTurunan'),
  savePutusanPasal: (payload) => simpanDenganCadanganAksi(Object.assign({ action: 'savePutusanPasal' }, payload), 'savePutusanPasal'),
  saveKembar: (payload) => simpanDenganCadanganAksi(Object.assign({ action: 'saveKembar' }, payload), 'saveKembar'),   // v5.4
  savePutusan: (payload) => simpanDenganCadanganAksi(Object.assign({ action: 'savePutusan' }, payload), 'savePutusan'),
  // Usulan redaksi (v5.1, lihat Redaksi.gs). Terapkan aman diulang: backend mengenali usulan yang sudah diterapkan.
  saveRedaksi: (payload) => simpanDenganCadanganAksi(Object.assign({ action: 'saveRedaksi' }, payload), 'saveRedaksi'),
  terapkanRedaksi: (payload) => simpanDenganCadanganAksi(Object.assign({ action: 'terapkanRedaksi' }, payload), 'terapkanRedaksi')
};