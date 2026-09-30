import { api } from './api';

/**
 * Sumber data tunggal aplikasi (versi 4.6).
 *
 * Tiga hal yang dijamin berkas ini:
 *  1. Satu permintaan saat dibuka (action=init), bukan dua yang berebut.
 *  2. Layar tidak pernah kosong atau merah bila aplikasi pernah dibuka di
 *     peramban ini: snapshot terakhir digambar lebih dulu, penyegaran menyusul.
 *  3. Perubahan tampak seketika (simpan optimistis); bila simpan gagal, nilai
 *     lama dikembalikan dan barisnya ditandai.
 *
 * Teks panjang (catatan, dasar hukum, alasan) diambil terpisah sesudah layar
 * tergambar, supaya muatan pembuka lebih ringan.
 */

const KUNCI_SNAPSHOT = 'pb.snapshot.v46';
const JEDA_PERIKSA_MS = 30000;

let keadaan = {
  cfg: null,
  urusan: [],
  format: 'LANGKAH',
  pilihan: { ORGAN: [], STATUS: [], PENUANGAN: [] },
  kelompok: [],
  ts: '',
  versi: '',
  memuat: true,
  menyegarkan: false,
  galat: '',
  koneksi: 'diam',      // diam | menyambung | menyambung-ulang
  dariSnapshot: false,
  menyimpan: false,
  tertunda: 0
};

const pendengar = new Set();
let mulaiDipanggil = false;
let terakhirPeriksa = 0;
let urutanMuat = 0;
let janjiSegar = null;

function beritahu() {
  const salinan = keadaan;
  pendengar.forEach((fn) => { try { fn(salinan); } catch (e) { /* abaikan */ } });
}

function setKeadaan(patch) {
  keadaan = Object.assign({}, keadaan, patch);
  beritahu();
}

export function langgan(fn) {
  pendengar.add(fn);
  fn(keadaan);
  return () => pendengar.delete(fn);
}

export function ambilKeadaan() {
  return keadaan;
}

/* ------------------------------------------------------------ snapshot */

function bacaSnapshot() {
  try {
    const s = window.localStorage.getItem(KUNCI_SNAPSHOT);
    if (!s) return null;
    const d = JSON.parse(s);
    return d && d.cfg && Array.isArray(d.urusan) ? d : null;
  } catch (e) {
    return null;
  }
}

function tulisSnapshot() {
  try {
    window.localStorage.setItem(KUNCI_SNAPSHOT, JSON.stringify({
      cfg: keadaan.cfg, urusan: keadaan.urusan, format: keadaan.format,
      pilihan: keadaan.pilihan, kelompok: keadaan.kelompok, ts: keadaan.ts, versi: keadaan.versi
    }));
  } catch (e) { /* kuota penuh: snapshot dilewati, aplikasi tetap jalan */ }
}

/* ------------------------------------------------------------ pemuatan */

function terapkanInit(data) {
  setKeadaan({
    cfg: data.cfg,
    urusan: gabungTeks(data.urusan || [], keadaan.urusan),
    format: String(data.format || 'LANGKAH').toUpperCase(),
    pilihan: Object.assign({ ORGAN: [], STATUS: [], PENUANGAN: [] }, data.pilihan || {}),
    kelompok: Array.isArray(data.kelompok) ? data.kelompok : [],
    ts: data.ts || '',
    versi: data.versi || '',
    memuat: false,
    galat: '',
    koneksi: 'diam',
    dariSnapshot: false
  });
  tulisSnapshot();
}

/** Teks panjang yang sudah ada di layar dipertahankan sampai teks baru tiba. */
function gabungTeks(baru, lama) {
  if (!lama || !lama.length) return baru;
  const peta = {};
  lama.forEach((u) => { peta[String(u.id)] = u; });
  return baru.map((u) => {
    const l = peta[String(u.id)];
    if (!l) return u;
    const t = {};
    ['riwayat', 'arahan', 'dasarMuatan', 'alasanMuatan'].forEach((k) => {
      if (u[k] === undefined && l[k] !== undefined) t[k] = l[k];
    });
    return Object.keys(t).length ? Object.assign({}, u, t) : u;
  });
}

async function muatTeks(token, paksa) {
  if (typeof api.teks !== 'function') return;
  try {
    const data = await api.teks();
    if (token !== urutanMuat) return;
    const peta = {};
    (data.urusan || []).forEach((u) => { peta[String(u.id)] = u; });
    setKeadaan({
      urusan: keadaan.urusan.map((u) => {
        const t = peta[String(u.id)];
        return t ? Object.assign({}, u, t, { id: u.id }) : u;
      })
    });
    tulisSnapshot();
  } catch (e) {
    if (paksa) throw e;
    /* teks panjang menyusul saat penyegaran berikutnya */
  }
}

async function muatInit(paksa) {
  const token = ++urutanMuat;
  setKeadaan({ koneksi: 'menyambung', galat: '' });
  try {
    const data = typeof api.init === 'function'
      ? await api.init({
          onPercobaan: () => {
            if (token === urutanMuat) setKeadaan({ koneksi: 'menyambung-ulang' });
          }
        })
      : await gabungLama_();

    // Hanya permintaan baca TERBARU yang boleh mengganti layar. Ini mencegah
    // respons lama datang belakangan lalu menimpa hasil Refresh yang lebih baru.
    if (token !== urutanMuat) return false;

    terapkanInit(data);
    await muatTeks(token, paksa);

    if (token !== urutanMuat) return false;
    terakhirPeriksa = Date.now();
    return true;
  } catch (e) {
    // Galat dari permintaan yang sudah kalah oleh permintaan baru diabaikan.
    if (token !== urutanMuat) return false;

    setKeadaan({
      memuat: false,
      koneksi: 'diam',
      // Bila layar sudah terisi snapshot, galat tidak mengosongkan tampilan.
      galat: (e && e.message) || String(e)
    });
    if (paksa) throw e;
    return false;
  }
}

/** Cadangan bila Code.gs belum memakai jalur cepat: pakai dua permintaan lama. */
async function gabungLama_() {
  const cfg = await api.bootstrap();
  const data = await api.readAll();
  return Object.assign({}, data, { cfg: cfg, versi: String(Date.now()) });
}

/** Dipanggil sekali oleh hook pertama yang hidup. */
export function mulai() {
  if (mulaiDipanggil) return;
  mulaiDipanggil = true;

  const snap = bacaSnapshot();
  if (snap) {
    keadaan = Object.assign({}, keadaan, snap, { memuat: false, dariSnapshot: true, koneksi: 'menyambung' });
    beritahu();
  }
  muatInit(false);

  const periksa = () => {
    if (document.visibilityState === 'hidden') return;
    if (Date.now() - terakhirPeriksa < JEDA_PERIKSA_MS) return;
    terakhirPeriksa = Date.now();
    if (typeof api.versi !== 'function') return;  // api.js versi lama: lewati, jangan sampai menggagalkan halaman
    api.versi()
      .then((v) => { if (v && v.versi && v.versi !== keadaan.versi) muatInit(false); })
      .catch(() => { /* pemeriksaan ringan; kegagalannya tidak ditampilkan */ });
  };
  window.addEventListener('focus', periksa);
  document.addEventListener('visibilitychange', periksa);
}

/**
 * Tombol Refresh manual.
 *
 * Jaminan semantik:
 * - hanya satu Refresh boleh berjalan pada satu waktu;
 * - cache Apps Script HARUS berhasil dibersihkan sebelum pembacaan ulang;
 * - tombol baru dianggap berhasil setelah init + teks panjang selesai dibaca;
 * - bila ada pembacaan lama yang masih terbang, hasil lama tidak boleh menimpa
 *   hasil Refresh yang lebih baru (dijaga oleh token pada muatInit).
 */
export function segarkanPaksa() {
  if (janjiSegar) return janjiSegar;

  janjiSegar = (async () => {
    setKeadaan({ menyegarkan: true, galat: '', koneksi: 'menyambung' });

    try {
      const hasilCache = await api.clearCache();
      if (!hasilCache || hasilCache.dibersihkan !== true) {
        throw new Error('Cache server tidak mengonfirmasi bahwa data sudah dibersihkan. Refresh dibatalkan.');
      }

      const ok = await muatInit(true);
      if (!ok) {
        throw new Error('Pembacaan ulang tidak selesai. Silakan coba Refresh sekali lagi.');
      }
      return true;
    } finally {
      setKeadaan({ menyegarkan: false });
      janjiSegar = null;
    }
  })();

  return janjiSegar;
}

/* ------------------------------------------------------------ simpan */

const MEDAN_SALIN = ['aras', 'statusBahasan', 'penuangan', 'catatan', 'oleh', 'tanggal', 'dasarMuatan', 'alasanMuatan'];
const MEDAN_HASIL = ['aras', 'statusBahasan', 'penuangan', 'kelengkapan', 'dilengkapi', 'catatan', 'tanggal', 'oleh',
  'dasarMuatan', 'alasanMuatan', 'riwayat', 'arahan'];

function terapkanBaris(id, patch) {
  setKeadaan({
    urusan: keadaan.urusan.map((u) => {
      if (String(u.id) !== String(id)) return u;
      const baru = Object.assign({}, u, patch);
      if (patch.statusBahasan !== undefined) baru.statusRancangan = patch.statusBahasan;
      return baru;
    })
  });
}

/**
 * Simpan optimistis: layar diubah lebih dulu, permintaan menyusul.
 * Bila gagal, nilai lama dikembalikan dan galatnya dilempar ke pemanggil.
 */
export async function simpanBaris(muatan) {
  const id = muatan && muatan.id;
  const sebelum = keadaan.urusan.find((u) => String(u.id) === String(id));
  const cadangan = {};
  if (sebelum) MEDAN_HASIL.forEach((k) => { cadangan[k] = sebelum[k]; });

  const patch = {};
  MEDAN_SALIN.forEach((k) => { if (muatan[k] !== undefined) patch[k] = muatan[k]; });
  terapkanBaris(id, patch);
  setKeadaan({ menyimpan: true, tertunda: keadaan.tertunda + 1 });

  try {
    const hasil = await api.saveUrusan(muatan);
    const dariServer = {};
    MEDAN_HASIL.forEach((k) => { if (hasil && hasil[k] !== undefined) dariServer[k] = hasil[k]; });
    if (hasil && hasil.steps) dariServer.baru = hasil.steps;
    terapkanBaris(id, dariServer);
    setKeadaan({ versi: String(Date.now()) });
    tulisSnapshot();
    return hasil;
  } catch (e) {
    if (sebelum) terapkanBaris(id, cadangan);
    throw e;
  } finally {
    const sisa = Math.max(0, keadaan.tertunda - 1);
    setKeadaan({ tertunda: sisa, menyimpan: sisa > 0 });
  }
}