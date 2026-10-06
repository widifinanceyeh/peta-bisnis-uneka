/**
 * v5.13: rujukan peraturan di dalam kalimat catatan (mis. "Dasar: UU 12/2012 Pasal 64 ayat (2).")
 * dipecah menjadi potongan teks biasa dan potongan rujukan yang dapat dibuka bunyinya.
 * Kutipan (q) dikirim apa adanya ke pembaca dasar hukum yang sama dengan Dasar hukum pasal.
 */
const ATURAN = [
  'Undang-Undang Nomor \\d+ Tahun \\d{4}',
  'Peraturan Pemerintah Nomor \\d+ Tahun \\d{4}',
  '(?:Permendiktisaintek|Permenristekdikti|Permendikbudristek|Permendikbud)(?: Nomor \\d+ Tahun \\d{4}| \\d+\\/\\d{4})',
  'UU \\d+\\/\\d{4}',
  'PP \\d+\\/\\d{4}',
  'Anggaran Rumah Tangga(?: Yayasan Eka Harap)?',
  'Anggaran Dasar(?: Yayasan Eka Harap)?',
  'ART',
  'AD'
].join('|');
const ALAMAT_AWAL = 'Pasal \\d+[A-Z]?|Lampiran (?:Bagian )?[IVX]+';
const ALAMAT_LANJUT = 'Pasal \\d+[A-Z]?|Lampiran (?:Bagian )?[IVX]+|ayat \\(\\d+\\)|huruf [a-zA-Z]\\b|angka \\d+[a-z]?\\b';
const SAMBUNG = '(?:,\\s*|\\s+)(?:(?:dan|serta|sampai(?: dengan)?|jo\\.)\\s+)?';
const RX = new RegExp('\\b(' + ATURAN + ')\\s+((?:' + ALAMAT_AWAL + ')(?:' + SAMBUNG + '(?:' + ALAMAT_LANJUT + '))*)', 'g');

/** @return {Array<{t:string, q?:string}>} */
export function pecahRujukan(teks) {
  const s = String(teks || '');
  const out = [];
  let akhir = 0;
  let m;
  RX.lastIndex = 0;
  while ((m = RX.exec(s)) !== null) {
    if (m.index > akhir) out.push({ t: s.slice(akhir, m.index) });
    out.push({ t: m[0], q: m[0] });
    akhir = m.index + m[0].length;
  }
  if (akhir < s.length) out.push({ t: s.slice(akhir) });
  return out;
}

const LABEL_JENIS = /^(Rumusan tetap|Redaksional|Penyesuaian istilah|Substansi|Muatan baru|Dipindah)\./i;

/** Catatan yang hanya berisi label jenis ("Substansi."). */
export function hanyaLabel(teks) {
  const t = String(teks || '').trim();
  const m = LABEL_JENIS.exec(t);
  return !!m && m[0].length === t.length;
}

/**
 * Jenis perubahan satu baris jejak: 'substansi' | 'baru' | 'hapus' | 'lain'.
 * Server (v5.13) sudah mengirim j.jenis; fungsi ini cadangan bila data masih dari versi sebelumnya.
 */
export function jenisJejak(j, label) {
  if (!j) return 'lain';
  if (j.jenis) return j.jenis;
  const st = String(j.status || '').trim().toUpperCase();
  const L = label || {};
  if (L.HAPUS && st === String(L.HAPUS).toUpperCase()) return 'hapus';
  const a = String(j.alasan || '').trim();
  const m = LABEL_JENIS.exec(a);
  if (m) {
    const k = m[1].toLowerCase();
    if (k === 'substansi') return 'substansi';
    if (k === 'muatan baru') return 'baru';
    if (k === 'dipindah') return /substansi/i.test(a) ? 'substansi' : 'lain';
    return 'lain';
  }
  if (L.BARU && st === String(L.BARU).toUpperCase()) return 'baru';
  return 'lain';
}

/** Dua judul dianggap sama bila hanya berbeda huruf kapital, tanda baca, atau "&"/"dan". */
export function judulSama(a, b) {
  const n = (s) => String(s || '').toLowerCase().replace(/&/g, ' dan ').replace(/[^a-z0-9]+/g, '');
  return n(a) === n(b);
}
