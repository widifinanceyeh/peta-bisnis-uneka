/**
 * telaah.js — logika tampilan Naskah dan Telaah (v5.2). Tanpa pustaka luar.
 * Tidak ada nama organ, warna, atau aturan bisnis yang ditulis tetap di sini:
 * semuanya datang dari Cfg_Organ, Cfg_Aksi, dan Cfg_App lewat backend.
 */
import { uraiRujukan, tautkan } from './rujukan';

/** ID ayat (B068.13) -> nomor pasal. */
export function pasalId(id) {
  const m = /^[A-Z](\d{3})\.\d+$/.exec(String(id || ''));
  return m ? Number(m[1]) : 0;
}

/**
 * Peta ayat 2026 -> urusan -> aras yang dituangkan di ayat itu.
 * @return {Object<string, Object<string, Set<string>>>}
 */
export function petaAyatUrusan(urusan, indeks26) {
  const out = {};
  if (!indeks26) return out;
  (urusan || []).forEach((u) => {
    if (!u.aras || u.adaDiRancangan === false) return;
    Object.keys(u.aras).forEach((kode) => {
      uraiRujukan((u.aras[kode] || {}).pasal).forEach((r) => {
        if (r.jenis !== 'ref') return;
        const ids = r.ayat && r.ayat.length ? tautkan(r, indeks26).id : ((indeks26[r.pasal] || []).map((x) => x[0]));
        ids.forEach((id) => {
          const l = (out[id] = out[id] || {});
          (l[u.id] = l[u.id] || new Set()).add(kode);
        });
      });
    });
  });
  return out;
}

/**
 * Peta ayat Statuta 2025 -> urusan, dari kolom dasar pasal peta 2025 (u.pasal).
 * Peta 2025 mencatat dasar pasal per urusan, bukan per aras, sehingga yang ditautkan adalah urusannya.
 * Nilai 'ayat' = ayat itu disebut langsung; 'pasal' = pasalnya disebut utuh (tampil sekali per pasal).
 * @return {Object<string, Object<string, 'ayat'|'pasal'>>}
 */
export function petaAyatLama(urusan, indeks25) {
  const out = {};
  if (!indeks25) return out;
  const norm = (n) => String(n || '').replace(/[().\s]/g, '');
  (urusan || []).forEach((u) => {
    if (!u.pasal || u.adaDiSumber === false) return;
    uraiRujukan(u.pasal).forEach((r) => {
      if (r.jenis !== 'ref') return;
      const daftar = indeks25[r.pasal] || [];
      if (r.ayat && r.ayat.length) {
        r.ayat.forEach((n) => {
          const t = daftar.find((x) => norm(x[1]) === String(n));
          if (t) (out[t[0]] = out[t[0]] || {})[u.id] = 'ayat';
        });
      } else {
        daftar.forEach((x) => { const o = (out[x[0]] = out[x[0]] || {}); if (!o[u.id]) o[u.id] = 'pasal'; });
      }
    });
  });
  return out;
}

/** Usulan redaksi per ID ayat 2026: {aktif, diterapkan:[]}. */
export function redaksiPerAyat(data) {
  const out = {};
  ((data && data.redaksi) || []).forEach((r) => {
    const o = (out[r.id26] = out[r.id26] || { aktif: null, diterapkan: [] });
    if (r.status === 'USULAN') o.aktif = r;
    else if (r.status === 'DITERAPKAN') o.diterapkan.push(r);
  });
  return out;
}

/**
 * Pemeriksaan awal di layar (backend tetap memeriksa ulang): apakah usulan dapat diterapkan
 * otomatis ke Google Doc, yaitu jumlah baris dan label rincian tetap.
 * @return {string} '' bila dapat, atau alasannya.
 */
export function cekStrukturRedaksi(lama, baru) {
  const a = String(lama || '').split('\n');
  const b = String(baru || '').split('\n');
  if (a.length !== b.length) return 'Jumlah baris berubah; menambah atau menghapus ayat dan rincian dikerjakan di Google Doc.';
  const label = /^(\s*(?:[a-zA-Z]\.|\d+\)|–)\s)/;
  for (let i = 1; i < a.length; i++) {
    const la = label.exec(a[i]);
    const lb = label.exec(b[i]);
    if ((la ? la[1] : '') !== (lb ? lb[1] : '')) return 'Label rincian baris ke-' + (i + 1) + ' berubah; penomoran dikerjakan di Google Doc.';
  }
  return '';
}

/**
 * Mengikat baris "Dasar perubahan" ke ayat 2026:
 *  - "ayat (n)" menunjuk ayat 2026 bernomor n;
 *  - "angka n" menunjuk ayat Statuta 2025 bernomor n, lalu diikuti jejaknya ke ayat 2026.
 * Baris tanpa nomor menjadi garis besar pasal.
 */
export function ikatCatatan(data) {
  const per = {};
  const umum = [];
  if (!data) return { per, umum };
  const baris = String((data.catatan && data.catatan.perubahan) || '').split('\n').map((s) => s.trim()).filter(Boolean);
  baris.forEach((b) => {
    const nomorAyat = (b.match(/ayat \((\d+)\)/g) || []).map((t) => t.replace(/\D/g, ''));
    const nomorAngka = (b.match(/angka (\d+)/g) || []).map((t) => t.replace(/\D/g, ''));
    const kumpul = [];
    nomorAyat.forEach((n) => {
      const a = data.ayat26.find((x) => String(x.nomor) === n);
      if (a) kumpul.push(a.id);
    });
    nomorAngka.forEach((n) => {
      const l = data.ayat25.find((x) => String(x.nomor).replace(/[().]/g, '') === n);
      if (l) (data.jejak || []).filter((j) => j.id25 === l.id && j.id26).forEach((j) => kumpul.push(j.id26));
    });
    const ids = Array.from(new Set(kumpul));
    if (ids.length) ids.forEach((id) => { (per[id] = per[id] || []).push(b); });
    else umum.push(b);
  });
  return { per, umum };
}

/**
 * Potongan teks bersorot: [{t, pihak|null}]. Setiap potongan sorotan dicari
 * berurutan di dalam teks; warna tanpa arti pada Cfg_App tidak ditandai.
 */
export function potongSorotan(teks, sorot, warna) {
  const s = String(teks || '');
  const tanda = [];
  let dari = 0;
  (sorot || []).forEach(([w, potong]) => {
    const pihak = (warna || {})[String(w).toLowerCase()];
    if (!pihak || !potong) return;
    let i = s.indexOf(potong, dari);
    if (i === -1) i = s.indexOf(potong);
    if (i === -1) return;
    tanda.push([i, i + potong.length, pihak]);
    dari = i + potong.length;
  });
  if (!tanda.length) return [{ t: s, pihak: null }];
  tanda.sort((a, b) => a[0] - b[0]);
  const out = [];
  let p = 0;
  tanda.forEach(([a, b, pihak]) => {
    if (a < p) return;
    if (a > p) out.push({ t: s.slice(p, a), pihak: null });
    out.push({ t: s.slice(a, b), pihak });
    p = b;
  });
  if (p < s.length) out.push({ t: s.slice(p), pihak: null });
  return out;
}

/** Jumlah potongan bersorot per pihak pada satu ayat. */
export function hitungTugas(sorot, warna) {
  const o = {};
  (sorot || []).forEach(([w]) => { const p = (warna || {})[String(w).toLowerCase()]; if (p) o[p] = (o[p] || 0) + 1; });
  return o;
}

/**
 * Penanda naskah dari hasil telaah, per ID ayat 2026:
 * {monev:[butir…], mirip:[{lawan, skor, beda}], silang:[sasaran]}.
 */
export function penandaAyat(telaah) {
  const out = {};
  if (!telaah) return out;
  const ambil = (id) => (out[id] = out[id] || { monev: [], monevAda: [], mirip: [], silang: [] });
  // v5.5: merah hanya butir berstatus BA "Belum ada"; butir yang sudah ada menjadi keterangan abu-abu.
  (telaah.monev || []).forEach((m) => (m.ids || []).forEach((id) => (monevBelum(m) ? ambil(id).monev : ambil(id).monevAda).push(m)));
  (telaah.mirip || []).forEach(([a, b, sk, beda]) => {
    ambil(a).mirip.push({ lawan: b, skor: sk, beda });
    ambil(b).mirip.push({ lawan: a, skor: sk, beda });
  });
  (telaah.silang || []).forEach(([id, sasaran]) => ambil(id).silang.push(sasaran));
  return out;
}

/** Himpunan pasal yang memuat penanda tertentu (untuk saringan daftar pasal). */
export function pasalBerpenanda(penanda, jenis) {
  const s = new Set();
  Object.keys(penanda || {}).forEach((id) => {
    const p = penanda[id];
    if (jenis === 'monev' ? p.monev.length : (p.silang.length || p.mirip.length)) s.add(pasalId(id));
  });
  return s;
}

/**
 * Butir Monev yang hanya menyebut pasal dan belum diberi "Ayat tertuju" (v5.2): {pasal: [butir…]}.
 * Butir ini tidak menandai ayat mana pun; tampil sekali pada kepala pasal.
 */
export function monevPasal(telaah) {
  const out = {};
  ((telaah && telaah.monev) || []).filter(monevBelum).forEach((m) => (m.pasalSaja || []).forEach((p) => { (out[p] = out[p] || []).push(m); }));
  return out;
}

/** Label nomor ayat untuk tampilan: "Ps 68 (13)" / "Ps 68 angka 5". */
export function labelAyat(p, nomor, lama) {
  const n = String(nomor || '').trim();
  if (!n) return 'Ps ' + p + ' pembuka';
  if (lama) return /^\(/.test(n) ? 'Ps ' + p + ' ' + n.replace(/\.$/, '') : 'Ps ' + p + ' angka ' + n.replace(/[().]/g, '');
  return 'Ps ' + p + ' (' + n + ')';
}

export const KODE_TEMUAN = ['SESUAI', 'DITAMBAH', 'BERUBAH', 'PERIKSA', 'BELUM', 'BAWAH'];
export const NAMA_TEMUAN = {
  SESUAI: 'tetap', DITAMBAH: 'ditambah', BERUBAH: 'organ berubah', PERIKSA: 'periksa', BELUM: 'belum tertuang', BAWAH: 'di bawah Statuta'
};

/**
 * Daftar periksa (v5.4, ruang Kerja). Setiap butir membawa tujuan, patokan selesai, dan cara menyelesaikannya,
 * supaya yang dibuka dari daftar jelas harus diputus apa. jumlah null = datanya belum dimuat.
 */
/** v5.5: butir Monev yang masih ditagih (status Berita Acara "Belum ada" atau kosong). */
export function monevBelum(m) {
  const st = String((m && m.status) || '').trim();
  return !st || /^belum/i.test(st);
}

export function susunKerja(n) {
  const t = (n && n.telaah) || null;
  const init = (n && n.init) || null;
  const bilah = (k) => { const b = t && (t.bilah || []).find((x) => x.kode === k); return b ? b.jumlah : null; };
  const permen = t && t.kerja ? (t.kerja.permen || {}) : null;
  const luar = n && n.luar ? n.luar.rekap : null;
  const pasalBila = (f) => (init ? init.daftar.filter(f).map((d) => d.pasal) : null);
  const redaksi = pasalBila((d) => d.redaksi > 0);
  const monev = t ? (t.monev || []).filter((m) => m.hilang && m.hilang.length) : null;
  return [
    { kode: 'PERMEN', label: 'Butir Permen 16/2018 belum terpenuhi',
      jumlah: permen ? (permen.SEBAGIAN || 0) + (permen['BELUM ADA'] || 0) : null,
      tujuan: 'Muatan yang diwajibkan Permenristekdikti 16/2018 ada di naskah 2026.',
      selesai: 'Tidak ada butir berstatus sebagian atau belum ada.',
      cara: 'Lengkapi naskah di Google Doc (isi data yang masih penanda, atau tambah satu ayat delegasi), lalu ubah Status butir di tab 04C menjadi TERPENUHI.' },
    { kode: 'LUAR', label: 'Pasal di luar peta belum diputus',
      jumlah: luar ? luar.pasalBelum : null,
      tujuan: 'Setiap ayat 2026 punya pijakan: dirujuk urusan peta, atau sengaja dipertahankan sebagai norma di luar peta.',
      selesai: 'Setiap pasal yang ayatnya tidak dirujuk urusan mana pun sudah diputus.',
      cara: 'Satu putusan per pasal: Dipertahankan (norma, tetap di luar peta), Masukkan ke urusan, atau Dihapus — dengan alasan. Ayat pada pasal yang dirujuk urusan dianggap sudah tertaut.' },
    { kode: 'KEMBAR', label: 'Dugaan ayat kembar', jumlah: t ? (t.mirip || []).length : null,
      tujuan: 'Tidak ada dua ayat yang mengatur hal sama untuk organ yang sama; pengaturan ganda bisa saling bertentangan bila salah satunya diubah.',
      selesai: 'Setiap pasangan sudah diputus.',
      cara: 'Bandingkan kedua ayat. Bila memang kembar: hapus atau gabungkan di Google Doc, lalu Tarik naskah — pasangan hilang sendiri. Bila berbeda: tekan "Bukan kembar".' },
    { kode: 'JEJAK', label: 'Ayat 2025 dihapus belum dikonfirmasi', jumlah: luar ? luar.hapusBelum : (t && t.kerja ? t.kerja.jejakBelum : null),
      tujuan: 'Muatan Statuta 2025 tidak hilang tanpa sengaja. Jejak lain (tetap, ubah, pindah, baru) dianggap selesai dan tetap dapat dikoreksi.',
      selesai: 'Setiap ayat 2025 yang dihapus sudah dikonfirmasi beserta alasannya.',
      cara: 'Baca ayat 2025 yang dihapus. Setuju dihapus: tulis alasan lalu tekan "Setuju dihapus". Bila perlu dipertahankan: buka Naskah dan ubah jejaknya.' },
    { kode: 'REDAKSI', label: 'Usulan redaksi terbuka', jumlah: redaksi ? init.daftar.reduce((x, d) => x + (d.redaksi || 0), 0) : null, pasal: redaksi || [],
      tujuan: 'Tidak ada usulan perubahan kata yang menggantung.',
      selesai: 'Semua usulan sudah diterapkan ke Doc atau ditolak.',
      cara: 'Buka pasal, tinjau usulan pada ayatnya, lalu Terapkan ke Doc atau tolak.' },
    { kode: 'MONEV', label: 'Alamat Monev tidak ditemukan', jumlah: monev ? monev.length : bilah('MONEV'), monev: monev || [],
      tujuan: 'Setiap temuan BA Monev menunjuk ayat yang ada di naskah 2026, supaya pemenuhannya bisa ditelusuri.',
      selesai: 'Semua butir Monev menunjuk ayat yang ada.',
      cara: 'Perbaiki kolom "Ayat tertuju" pada tab 08-MONEV mengikuti penomoran naskah 2026.' }
  ];
}
