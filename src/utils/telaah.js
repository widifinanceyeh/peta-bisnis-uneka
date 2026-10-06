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
    if (!u.pasal || u.adaDiSumber === false || adaAras25(u)) return;   // v5.14: urusan berayat per aras ditaut lewat petaArasLama
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

/** v5.9: seluruh butir Monev (termasuk yang sudah ada menurut BA) per ID ayat 2026. */
export function monevPerAyat(telaah) {
  const out = {};
  ((telaah && telaah.monev) || []).forEach((m) => (m.ids || []).forEach((id) => { (out[id] = out[id] || []).push(m); }));
  return out;
}

/**
 * v5.10: tahap dokumen turunan: ADA (status "Ada"), PROSES (status penyusunan atau sudah ada tautan draf), BELUM.
 */
export function tahapTurunan(d) {
  const st = String((d && d.status) || '').trim();
  if (/^ada\b/i.test(st)) return 'ADA';
  if (/penyusunan|proses|draf/i.test(st) || String((d && d.drafTautan) || '').trim()) return 'PROSES';
  return 'BELUM';
}

/** v5.10: jenis berkas dari tautan, untuk label kecil di samping judul draf. */
export function jenisTautan(url) {
  const u = String(url || '').toLowerCase();
  if (!u) return '';
  if (u.indexOf('docs.google.com/document') !== -1) return 'Google Doc';
  if (u.indexOf('docs.google.com/spreadsheets') !== -1) return 'Google Sheet';
  if (u.indexOf('docs.google.com/presentation') !== -1) return 'Google Slides';
  if (/\.pdf(\?|#|$)/.test(u)) return 'PDF';
  if (/\.docx?(\?|#|$)/.test(u)) return 'Word';
  if (/\.xlsx?(\?|#|$)/.test(u)) return 'Excel';
  if (u.indexOf('drive.google.com') !== -1) return 'Google Drive';
  return 'Tautan';
}

/** v5.9: pemilik setiap ayat pada dokumen turunan: {idAyat: {id, dokumen, status}}. */
export function pemilikTurunan(turunan) {
  const out = {};
  ((turunan && turunan.dokumen) || []).forEach((d) => (d.baris || []).forEach((b) => {
    if (!out[b.id]) out[b.id] = { id: d.id, dokumen: d.dokumen, status: d.status || '', drafJudul: d.drafJudul || '', drafTautan: d.drafTautan || '', tahap: tahapTurunan(d) };
  }));
  return out;
}

/** v5.9: nomor ayat 2026 dari bunyi seluruh naskah: {idAyat: {pasal, nomor, teks}}. */
export function indeksTeks(teks) {
  const out = {};
  ((teks && teks.ayat) || []).forEach(([id, pasal, nomor, t]) => { out[id] = { pasal, nomor, teks: t }; });
  return out;
}

/**
 * Seluruh butir Berita Acara Monev beserta keadaannya (v5.9; patokan diubah v5.10).
 * Tahap mengikuti kenyataan dokumennya:
 *   - butir yang ayatnya menjadi dasar dokumen turunan: tahap dokumen itu (ADA / PROSES / BELUM; bila lebih dari
 *     satu dokumen, yang paling belum);
 *   - butir tanpa dokumen turunan (mis. keputusan pengangkatan): status BA "Ada" = ADA, selain itu BELUM.
 * Alamat yang tidak ditemukan di naskah 2026 selalu BELUM.
 */
export function daftarMonev(n) {
  const t = n && n.telaah;
  if (!t || !n.turunan) return null;
  const milik = pemilikTurunan(n.turunan);
  const urut = { BELUM: 0, PROSES: 1, ADA: 2 };
  return (t.monev || []).map((m) => {
    const ids = m.ids || [];
    const dok = ids.map((id) => milik[id]).filter(Boolean);
    const adaBA = !monevBelum(m);
    const hilang = (m.hilang || []).length > 0;
    let tahap;
    let sebab = '';
    if (hilang) { tahap = 'BELUM'; sebab = 'Alamat tidak ada di naskah 2026: ' + m.hilang.join(', ') + '.'; }
    else if (!ids.length) { tahap = adaBA ? 'ADA' : 'BELUM'; sebab = 'Berita Acara hanya menyebut pasal; isi kolom "Ayat tertuju" pada tab 08-MONEV.'; }
    else if (dok.length) {
      tahap = dok.map((d) => d.tahap).sort((x, y) => urut[x] - urut[y])[0];
      if (dok.length < ids.length) { tahap = 'BELUM'; sebab = 'Sebagian ayat belum menjadi dasar dokumen turunan.'; }
    } else tahap = adaBA ? 'ADA' : 'BELUM';
    if (!sebab && tahap === 'BELUM' && !dok.length && !adaBA) sebab = 'Ayat belum menjadi dasar dokumen turunan mana pun.';
    return Object.assign({}, m, { dok, milik: ids.map((id) => milik[id] || null), tahap, selesai: tahap === 'ADA', sebab, adaBA });
  });
}

// v5.9: ayat yang memerintahkan pengaturan lebih lanjut dengan peraturan (bukan keputusan perorangan).
const RX_DELEGASI = /((ditetapkan|diatur)\s+(lebih lanjut\s+)?(dengan|dalam)\s+(Peraturan (Yayasan|Rektor)|Ketetapan Senat))|(sesuai dengan Peraturan (Rektor|Yayasan)\b)|(bagian dari Peraturan Rektor)/i;
const RX_BUKAN_DELEGASI = /perubahan Statuta|belum diatur dalam Statuta/i;

/** v5.9: ayat delegasi beserta dokumen turunannya (kosong = belum punya dokumen). */
export function daftarDelegasi(n) {
  if (!n || !n.teks || !n.turunan) return null;
  const milik = pemilikTurunan(n.turunan);
  return ((n.teks && n.teks.ayat) || [])
    .filter(([, , , t]) => RX_DELEGASI.test(t) && !RX_BUKAN_DELEGASI.test(t))
    .map(([id, pasal, nomor, t]) => ({ id, pasal, nomor, teks: t, dok: milik[id] || null }));
}

/** v5.9: pasangan kembar yang sudah diputus "Bukan kembar" (dari tab 09), lengkap dengan bunyi kedua ayat. */
export function kembarDiputus(n) {
  const t = n && n.telaah;
  if (!t) return [];
  const ix = indeksTeks(n.teks);
  return Object.keys(t.putusan || {}).filter((k) => /^KEMBAR /.test(k)).map((k) => {
    const [a, b] = k.slice(7).split('|');
    const A = ix[a] || {}, B = ix[b] || {};
    return { a, b, pa: A.pasal || pasalId(a), na: A.nomor || '', ta: A.teks || '', pb: B.pasal || pasalId(b), nb: B.nomor || '', tb: B.teks || '', putusan: t.putusan[k] };
  });
}

/** v5.9: seluruh usulan redaksi dari pasal yang sudah dimuat: [{pasal, id26, status, …}]. */
export function daftarRedaksi(n) {
  const out = [];
  Object.keys((n && n.pasal) || {}).forEach((p) => ((n.pasal[p] && n.pasal[p].redaksi) || []).forEach((r) => out.push(Object.assign({ pasal: Number(p) }, r))));
  return out.sort((x, y) => x.pasal - y.pasal || String(x.id26).localeCompare(String(y.id26)));
}

export function susunKerja(n) {
  const t = (n && n.telaah) || null;
  const init = (n && n.init) || null;
  const permen = t && t.kerja ? (t.kerja.permen || {}) : null;
  const luar = n && n.luar ? n.luar.rekap : null;
  const pasalBila = (f) => (init ? init.daftar.filter(f).map((d) => d.pasal) : null);
  const redaksi = pasalBila((d) => d.redaksi > 0);
  const monev = daftarMonev(n);
  const delegasi = daftarDelegasi(n);
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
    { kode: 'MONEV', label: 'Butir Monev Berita Acara', jumlah: monev ? monev.filter((m) => !m.selesai).length : null, total: monev ? monev.length : null, monev: monev || [],
      tujuan: 'Setiap butir yang ditagih Berita Acara Monev benar-benar terpenuhi: dokumen yang diminta asesor ada.',
      selesai: 'Dokumen turunannya berstatus "Ada"; untuk butir tanpa dokumen turunan, status Berita Acara "Ada". Proses = dokumen sedang disusun atau sudah ada tautan draf.',
      cara: 'Isi tautan draf di menu Dokumen Turunan (status otomatis menjadi penyusunan); ubah status menjadi "Ada" sesudah dokumen ditetapkan. Alamat yang tidak ditemukan: perbaiki kolom "Ayat tertuju" pada tab 08-MONEV.' },
    { kode: 'DELEGASI', label: 'Ayat delegasi belum punya dokumen turunan', jumlah: delegasi ? delegasi.filter((d) => !d.dok).length : null, total: delegasi ? delegasi.length : null, delegasi: delegasi || [],
      tujuan: 'Setiap ayat yang memerintahkan pengaturan lebih lanjut dengan Peraturan Yayasan, Peraturan Rektor, atau Ketetapan Senat sudah dipetakan ke satu dokumen turunan.',
      selesai: 'Semua ayat delegasi menjadi dasar satu dokumen turunan.',
      cara: 'Buka menu Dokumen Turunan, pilih dokumen yang sesuai (atau buat baru), lalu tambahkan ayatnya beserta pokok urusan.' }
  ];
}

/** v5.14: urusan peta 2025 yang sudah punya ayat per aras (tab 04, kolom "Ayat · …"). */
export function adaAras25(u) {
  return !!(u && u.aras25 && Object.keys(u.aras25).some((k) => /Pasal\s+\d+/.test(String(u.aras25[k]))));
}

/**
 * v5.14: peta ayat Statuta 2025 -> urusan -> aras yang dituangkan di ayat itu, dari u.aras25.
 * Bentuknya sama dengan petaAyatUrusan (peta 2026), sehingga pita 2025 dapat membingkai aras "ayat ini".
 * @return {Object<string, Object<string, Set<string>>>}
 */
export function petaArasLama(urusan, indeks25) {
  const out = {};
  if (!indeks25) return out;
  const norm = (n) => String(n || '').replace(/[().\s]/g, '');
  (urusan || []).forEach((u) => {
    if (!adaAras25(u) || u.adaDiSumber === false) return;
    Object.keys(u.aras25).forEach((kode) => {
      uraiRujukan(u.aras25[kode]).forEach((r) => {
        if (r.jenis !== 'ref') return;
        const daftar = indeks25[r.pasal] || [];
        const kena = r.ayat && r.ayat.length ? r.ayat.map((n) => daftar.find((x) => norm(x[1]) === String(n))).filter(Boolean) : daftar;
        kena.forEach((t) => {
          const l = (out[t[0]] = out[t[0]] || {});
          (l[u.id] = l[u.id] || new Set()).add(kode);
        });
      });
    });
  });
  return out;
}
