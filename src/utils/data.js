// Olah data mentah dari Sheet menjadi peta & turunan yang dipakai layar.
import { hariIni, kunciTanggal, selisihHari, teks, namaPendek, tglPanjang, rentangJam } from './format';

export const KOSONG = { isu: [], rapat: [], orang: [], itemRapat: [], itemArahan: [], tautanDokumen: [], notulen: [], tindakLanjut: [], arahan: [], opsi: [] };

export const BAWAAN = {
  STATUS_TL: ['Belum Dimulai', 'Progress', 'Selesai'],
  STATUS_ISU: ['Isu Awal', 'Dalam Pengembangan', 'Siap Dibahas', 'Dijadwalkan', 'Dalam Pembahasan', 'Menunggu Keputusan', 'Ditindaklanjuti', 'Selesai', 'Ditunda', 'Dibatalkan'],
  STATUS_RAPAT: ['Draft', 'Dijadwalkan', 'Selesai', 'Dibatalkan'],
  PRIORITAS: ['Rendah', 'Sedang', 'Tinggi', 'Kritis'],
  PENANDA: ['Perlu Keputusan', 'Perlu Dibahas', 'Perlu Revisi', 'Menunggu Dokumen'],
  STATUS_PEMBAHASAN: ['Belum Dibahas', 'Dibahas', 'Diputuskan', 'Ditunda', 'Tidak Dilanjutkan'],
  KATEGORI_ISU: ['Legal', 'Keuangan', 'SDM', 'Akademik', 'Operasional', 'Tata Kelola', 'Lainnya'],
  JENIS_RAPAT: ['Rapat Pembina', 'Rapat Pengurus', 'Rapat Pengawas', 'Rapat Gabungan', 'Rapat Koordinasi', 'Rapat Unit', 'Lainnya'],
  JENIS_DOKUMEN: ['Draft', 'Referensi', 'Lampiran', 'Kajian', 'Output', 'Final'],
  LEMBAGA: ['YEH', 'UNEKA', 'YEH & UNEKA'],
  FORUM_ARAHAN: ['Rapat pimpinan', 'Rapat internal unit', 'Diskusi lisan', 'Kunjungan lapangan', 'WhatsApp', 'Telepon', 'Disposisi surat', 'Lain-lain'],
  SIFAT_ARAHAN: ['Arahan/Instruksi', 'Informasi', 'Gagasan belum final', 'Peringatan'],
  STATUS_ARAHAN: ['Belum ditindaklanjuti', 'Sedang dikerjakan', 'Selesai', 'Tidak perlu tindakan'],
  MODE_RAPAT: ['Luring', 'Daring', 'Hibrida'],
  TEMPAT_RAPAT: ['Kantor YEH Surabaya', 'Kampus UNEKA Palangka Raya', 'Zoom', 'Google Meet'],
  JENIS_HASIL_TL: ['Aksi saja', 'Menghasilkan dokumen'],
  UNIT: ['YEH', 'UNEKA', 'Ketua Yayasan', 'Bendahara Yayasan', 'Finance', 'Accounting', 'Admin', 'Rektor',
    'Wakil Rektor I', 'Wakil Rektor II', 'Wakil Rektor III', 'Ketua Senat Akademik', 'Sekretaris Senat Akademik',
    'Ketua LPPM', 'Bagian Tata Usaha Umum dan Kepegawaian', 'Pihak luar'],
};

/** Pemisah nilai ganda pada satu sel (unit tujuan, unit terkait). Sama dengan Konfigurasi.gs. */
export const PISAH_GANDA = ' | ';
/** Sel unit → array. Nilai lama berkoma tetap utuh sebagai satu butir agar tidak salah pecah. */
export function unitList(v) {
  return teks(v).split(PISAH_GANDA).map((x) => x.trim()).filter(Boolean);
}
export const unitTeks = (list) => (Array.isArray(list) ? list : unitList(list)).join(PISAH_GANDA);
// Tahap yang diatur sistem; tidak ditawarkan untuk dipilih manual.
export const TAHAP_OTOMATIS = ['Dijadwalkan', 'Ditindaklanjuti'];
export const TAHAP_ARSIP = ['Selesai', 'Dibatalkan'];

export const LABEL_STATUS_TL = { 'Belum Dimulai': 'Belum Dimulai', Progress: 'Sedang Dikerjakan', Selesai: 'Selesai' };
export const labelStatusTl = (s) => LABEL_STATUS_TL[s] || s || '—';

export function nadaTahap(s) {
  return ({
    'Isu Awal': 'abu', 'Dalam Pengembangan': 'abu', 'Siap Dibahas': 'biru-muda', Dijadwalkan: 'biru',
    'Dalam Pembahasan': 'pink', 'Menunggu Keputusan': 'kuning', Ditindaklanjuti: 'hijau-muda', Selesai: 'hijau',
    Ditunda: 'redup', Dibatalkan: 'redup',
  })[s] || 'abu';
}
export function nadaStatusTl(s) { return ({ 'Belum Dimulai': 'abu', Progress: 'biru', Selesai: 'hijau' })[s] || 'abu'; }
export function nadaPrioritas(s) { return ({ Kritis: 'merah', Tinggi: 'kuning', Sedang: 'abu', Rendah: 'redup' })[s] || 'abu'; }
export function nadaStatusArahan(s) {
  return ({ 'Belum ditindaklanjuti': 'abu', 'Sedang dikerjakan': 'biru', Selesai: 'hijau', 'Tidak perlu tindakan': 'redup' })[s] || 'abu';
}
/** Status arahan yang dianggap belum tuntas; dipakai saringan dan blok pantauan Beranda. */
export const ARAHAN_TERBUKA = ['', 'Belum ditindaklanjuti', 'Sedang dikerjakan'];
export function nadaPembahasan(s) { return ({ Diputuskan: 'hijau', Dibahas: 'biru-muda', Ditunda: 'kuning', 'Tidak Dilanjutkan': 'redup' })[s] || 'abu'; }

/** Daftar pilihan: Config_Opsi (aktif, berurutan) + bawaan; nilai lama tetap dapat ditampilkan. */
export function opsi(data, kunci) {
  const bawaan = BAWAAN[kunci] || [];
  const hasil = [];
  const seen = {};
  const tambah = (v) => { const t = teks(v); if (t && !seen[t.toLowerCase()]) { seen[t.toLowerCase()] = true; hasil.push(t); } };
  (data.opsi || []).filter((r) => teks(r.KUNCI).toUpperCase() === kunci && teks(r.AKTIF) !== 'Tidak')
    .sort((a, b) => (Number(a.URUTAN) || 0) - (Number(b.URUTAN) || 0)).forEach((r) => tambah(r.NILAI));
  bawaan.forEach(tambah);
  return hasil;
}

function petaDari(list, kunci) {
  const p = {};
  list.forEach((x) => { const k = teks(x[kunci]); if (k) p[k] = x; });
  return p;
}

export function urgensi(t, hari) {
  if (t.STATUS === 'Selesai') return 'hijau';
  const target = kunciTanggal(t.TANGGAL_TARGET);
  if (target) {
    const n = selisihHari(target, hari);
    if (n < 0) return 'merah';
    if (n <= 3) return 'kuning';
    return 'abu';
  }
  const upd = kunciTanggal(t.TANGGAL_UPDATE_TERAKHIR);
  if (upd) {
    const diam = selisihHari(hari, upd);
    if (diam > 14) return 'merah';
    if (diam > 7) return 'kuning';
  }
  return 'abu';
}

export function olah(raw) {
  const d = Object.assign({}, KOSONG, raw || {});
  Object.keys(KOSONG).forEach((k) => { if (!Array.isArray(d[k])) d[k] = []; });
  const hari = hariIni();
  const anak = {};
  d.tindakLanjut.forEach((t) => { if (t.ID_INDUK) anak[t.ID_INDUK] = (anak[t.ID_INDUK] || 0) + 1; });
  const pTl = petaDari(d.tindakLanjut, 'ID_TINDAKLANJUT');
  d.tindakLanjut = d.tindakLanjut.map((t) => {
    let lvl = 0; let cur = t; const seen = {};
    while (cur && cur.ID_INDUK && lvl < 20 && !seen[cur.ID_TINDAKLANJUT]) { seen[cur.ID_TINDAKLANJUT] = 1; cur = pTl[cur.ID_INDUK]; if (cur) lvl++; }
    return Object.assign({}, t, { URGENSI: urgensi(t, hari), JUMLAH_ANAK: anak[t.ID_TINDAKLANJUT] || 0, TINGKAT: lvl });
  });
  const relArahan = {};
  d.itemArahan.forEach((r) => { const a = teks(r.ID_ARAHAN); (relArahan[a] = relArahan[a] || []).push(teks(r.ID_ISU)); });
  d.arahan = d.arahan.map((a) => Object.assign({}, a, { ID_ISU_LIST: (relArahan[teks(a.ID_ARAHAN)] || []).filter(Boolean) }));
  d.peta = {
    isu: petaDari(d.isu, 'ID_ISU'), rapat: petaDari(d.rapat, 'ID_RAPAT'), notulen: petaDari(d.notulen, 'ID_NOTULEN'),
    tl: petaDari(d.tindakLanjut, 'ID_TINDAKLANJUT'), orang: petaDari(d.orang, 'ID_ORANG'), arahan: petaDari(d.arahan, 'ID_ARAHAN'),
  };
  d.tautanPer = {};
  d.tautanDokumen.forEach((x) => { const k = x.JENIS_ENTITAS + '|' + teks(x.ID_ENTITAS); (d.tautanPer[k] = d.tautanPer[k] || []).push(x); });
  d.agendaPer = {};
  d.itemRapat.forEach((x) => { (d.agendaPer[x.ID_RAPAT] = d.agendaPer[x.ID_RAPAT] || []).push(x); });
  Object.keys(d.agendaPer).forEach((k) => d.agendaPer[k].sort((a, b) => Number(a.URUTAN_AGENDA || 0) - Number(b.URUTAN_AGENDA || 0)));
  d.hari = hari;
  return d;
}

/* ---------------- Relasi ---------------- */
export function tautan(d, jenis, id, legacyUrl, legacyJudul) {
  const list = (d.tautanPer[jenis + '|' + teks(id)] || []).map((x) => ({ id: x.ID_TAUTAN, judul: x.JUDUL_TAUTAN, url: x.URL, jenisDokumen: x.JENIS_DOKUMEN, jenisBerkas: x.JENIS_BERKAS || '', catatan: x.CATATAN }));
  if (!list.length && urlAman(legacyUrl)) return [{ judul: legacyJudul || 'Dokumen', url: legacyUrl, jenisDokumen: 'Referensi', catatan: '' }];
  return list;
}
/* ---------------- Jenis berkas (sama dengan Simpan.gs) ---------------- */
export const JENIS_BERKAS = [
  { label: 'Google Doc', kode: 'DOC', kelas: 'doc' }, { label: 'Google Sheet', kode: 'SHEET', kelas: 'sheet' },
  { label: 'Google Slides', kode: 'SLIDE', kelas: 'slide' }, { label: 'Google Form', kode: 'FORM', kelas: 'form' },
  { label: 'Folder Drive', kode: 'FOLDER', kelas: 'folder' }, { label: 'PDF', kode: 'PDF', kelas: 'pdf' },
  { label: 'Gambar', kode: 'IMG', kelas: 'img' }, { label: 'Word', kode: 'WORD', kelas: 'word' },
  { label: 'Excel', kode: 'XLS', kelas: 'xls' }, { label: 'PowerPoint', kode: 'PPT', kelas: 'ppt' },
  { label: 'Video', kode: 'VIDEO', kelas: 'video' }, { label: 'Berkas lain', kode: 'FILE', kelas: 'lain' },
  { label: 'Tautan web', kode: 'WEB', kelas: 'web' },
];
const TAK_TERDETEKSI = { label: 'Berkas Drive', kode: 'DRIVE', kelas: 'tak', tak: true };
function idBerkasDrive(url) {
  const u = teks(url);
  if (!/^https?:\/\/(drive|docs)\.google\.com\//i.test(u)) return '';
  let m = u.match(/\/file\/d\/([\w-]{10,})/);
  if (m) return m[1];
  if (/\/(open|uc)\b/i.test(u)) { m = u.match(/[?&]id=([\w-]{10,})/); if (m) return m[1]; }
  return '';
}
function dariNama(x) {
  const m = String(x || '').toLowerCase().split(/[?#]/)[0].match(/\.([a-z0-9]{2,5})$/);
  const ext = m ? m[1] : '';
  if (ext === 'pdf') return 'PDF';
  if (/^(jpe?g|png|gif|webp|bmp|heic)$/.test(ext)) return 'Gambar';
  if (/^(docx?|odt|rtf)$/.test(ext)) return 'Word';
  if (/^(xlsx?|csv|ods)$/.test(ext)) return 'Excel';
  if (/^(pptx?|odp)$/.test(ext)) return 'PowerPoint';
  if (/^(mp4|mov|avi|mkv|webm)$/.test(ext)) return 'Video';
  return '';
}
export function jenisDariAlamat(url, judul) {
  const u = teks(url).toLowerCase();
  if (!u) return '';
  if (/docs\.google\.com\/document\//.test(u)) return 'Google Doc';
  if (/docs\.google\.com\/spreadsheets\//.test(u)) return 'Google Sheet';
  if (/docs\.google\.com\/presentation\//.test(u)) return 'Google Slides';
  if (/docs\.google\.com\/forms\/|forms\.gle\//.test(u)) return 'Google Form';
  if (/drive\.google\.com\/(drive\/(u\/\d+\/)?folders\/|folderview)/.test(u)) return 'Folder Drive';
  if (/youtube\.com\/|youtu\.be\//.test(u)) return 'Video';
  const a = dariNama(u);
  if (a) return a;
  if (idBerkasDrive(url)) return dariNama(judul);
  return dariNama(judul) || 'Tautan web';
}
/** Jenis berkas untuk tampilan: isian sheet (otomatis/manual) → tebakan dari alamat → "Berkas Drive" (belum terdeteksi). */
export function jenisBerkas(t) {
  const simpan = teks(t && t.jenisBerkas).toLowerCase();
  const tersimpan = JENIS_BERKAS.find((j) => j.label.toLowerCase() === simpan);
  if (tersimpan) return tersimpan;
  const tebak = jenisDariAlamat(t && t.url, t && t.judul);
  return JENIS_BERKAS.find((j) => j.label === tebak) || TAK_TERDETEKSI;
}

export function urlAman(v) {
  const s = teks(v);
  if (!s) return '';
  try { const u = new URL(s); return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : ''; } catch (e) { return ''; }
}
export function unik(list) {
  const seen = {};
  return list.filter((l) => { const k = urlAman(l && l.url); if (!k || seen[k]) return false; seen[k] = true; return true; });
}
export function tlUtama(d, idIsu) {
  if (!idIsu) return null;
  return d.tindakLanjut.filter((t) => t.ID_ISU === idIsu && !t.ID_INDUK && !t.ID_ARAHAN_ASAL)
    .sort((a, b) => new Date(b.TANGGAL_UPDATE_TERAKHIR || 0) - new Date(a.TANGGAL_UPDATE_TERAKHIR || 0))[0] || null;
}
export function agendaPokok(d, idIsu) {
  return d.itemRapat.filter((a) => a.ID_ISU === idIsu || (a.JENIS_ITEM === 'Pokok Bahasan' && a.ID_REFERENSI === idIsu));
}
export function arahanPokok(d, idIsu) { return d.arahan.filter((a) => a.ID_ISU_LIST.indexOf(idIsu) !== -1); }
export function tlPokok(d, idIsu) { return d.tindakLanjut.filter((t) => t.ID_ISU === idIsu); }
export function judulAgenda(d, a) {
  if (a.JENIS_ITEM === 'Tindak Lanjut') { const t = d.peta.tl[a.ID_REFERENSI]; return t ? t.JUDUL : 'Tindak lanjut'; }
  const i = d.peta.isu[a.ID_ISU || a.ID_REFERENSI]; return i ? i.JUDUL : 'Pokok bahasan';
}
export function dokumenPokok(d, idIsu) {
  const list = [].concat(tautan(d, 'Pokok Bahasan', idIsu));
  arahanPokok(d, idIsu).forEach((a) => list.push.apply(list, tautan(d, 'Arahan', a.ID_ARAHAN)));
  tlPokok(d, idIsu).forEach((t) => list.push.apply(list, tautan(d, 'Tindak Lanjut', t.ID_TINDAKLANJUT, t.LINK_DOKUMEN, 'Dokumen/output')));
  agendaPokok(d, idIsu).forEach((a) => {
    const r = d.peta.rapat[a.ID_RAPAT];
    if (r) list.push.apply(list, tautan(d, 'Rapat', r.ID_RAPAT));
    const n = d.peta.notulen[a.ID_NOTULEN || (r && r.ID_NOTULEN)];
    if (n) list.push.apply(list, tautan(d, 'Notulen', n.ID_NOTULEN, n.LINK_DOKUMEN, 'Notulen'));
  });
  return unik(list);
}

/** Status tampilan rapat (gabungan status sheet + notulen + tanggal). */
export function statusRapat(r, hari) {
  if (r.ID_NOTULEN) return { kunci: 'selesai', label: 'Selesai', nada: 'hijau' };
  if (r.STATUS === 'Dibatalkan') return { kunci: 'batal', label: 'Dibatalkan', nada: 'redup' };
  if (r.STATUS === 'Draft') return { kunci: 'draft', label: 'Draft', nada: 'abu' };
  const k = kunciTanggal(r.TANGGAL);
  if (r.STATUS === 'Selesai' || (k && k < hari)) return { kunci: 'perlu-hasil', label: 'Perlu hasil', nada: 'kuning' };
  return { kunci: 'mendatang', label: 'Terjadwal', nada: 'biru' };
}

/* ---------------- Orang & PIC ---------------- */
function token(s) { return teks(s).toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter((x) => x.length >= 3); }
/** Apakah isian PIC (bebas) menunjuk orang ini? "widi" cocok "Titis Widiyanti". */
export function picCocok(pic, orang) {
  if (!pic || !orang) return false;
  const p = teks(pic).toLowerCase();
  const nama = namaPendek(orang.NAMA).toLowerCase();
  if (!p) return false;
  if (p === teks(orang.NAMA).toLowerCase() || p === nama) return true;
  const tp = token(namaPendek(pic));
  const tn = token(nama);
  return tp.length > 0 && tp.every((a) => tn.some((b) => b.indexOf(a) !== -1));
}
export function cariOrang(d, teksNama) {
  const t = teks(teksNama);
  if (!t) return null;
  const persis = d.orang.find((o) => teks(o.NAMA).toLowerCase() === t.toLowerCase() || namaPendek(o.NAMA).toLowerCase() === namaPendek(t).toLowerCase());
  if (persis) return persis;
  const cocok = d.orang.filter((o) => picCocok(t, o));
  return cocok.length === 1 ? cocok[0] : null;
}
export function opsiOrang(d) {
  const no = {};
  d.orang.forEach((o, i) => { no[o.ID_ORANG] = i; });
  return d.orang.filter((o) => o.STATUS !== 'Nonaktif').slice().sort((a, b) => namaPendek(a.NAMA).localeCompare(namaPendek(b.NAMA)))
    .map((o) => ({ value: o.NAMA, label: namaPendek(o.NAMA), meta: [o.JABATAN, o.UNIT].filter(Boolean).join(' · '), cari: [o.NAMA, o.JABATAN, o.UNIT].join(' '), id: o.ID_ORANG,
      jabatan: teks(o.JABATAN), unit: teks(o.UNIT), no: no[o.ID_ORANG] }));
}

/**
 * Kelompokkan orang per UNIT. Urutan unit mengikuti urutan baris pertama unit itu di DaftarOrang;
 * beda huruf besar-kecil/spasi dianggap sama; UNIT kosong masuk "Lainnya" (paling akhir).
 * items: [{ unit, no, ... }] → [{ kunci, label, items }]
 */
export function kelompokUnit(items) {
  const peta = {};
  const urut = [];
  items.forEach((x) => {
    const u = teks(x.unit);
    const k = u ? u.replace(/\s+/g, ' ').toUpperCase() : '~LAINNYA';
    if (!peta[k]) { peta[k] = { kunci: k, label: u || 'Lainnya', items: [], no: Infinity }; urut.push(peta[k]); }
    peta[k].items.push(x);
    const n = typeof x.no === 'number' ? x.no : Infinity;
    if (n < peta[k].no) { peta[k].no = n; if (u) peta[k].label = u; } // ejaan unit mengikuti baris teratas di DaftarOrang
  });
  return urut.sort((a, b) => (a.kunci === '~LAINNYA') - (b.kunci === '~LAINNYA') || a.no - b.no || a.label.localeCompare(b.label));
}

/** Peserta rapat (ID_PESERTA) sebagai daftar orang lengkap untuk tampilan. */
export function pesertaRapat(d, r) {
  const no = {};
  d.orang.forEach((o, i) => { no[o.ID_ORANG] = i; });
  return String(r.ID_PESERTA || '').split(',').map((s) => s.trim()).filter(Boolean).map((id) => {
    const x = d.peta.orang[id];
    return x ? { id, nama: x.NAMA, jabatan: teks(x.JABATAN), unit: teks(x.UNIT), no: no[id] } : { id, nama: id, jabatan: '', unit: '', no: Infinity };
  });
}
export function opsiOrangId(d) {
  return opsiOrang(d).map((o) => Object.assign({}, o, { value: o.id }));
}

/* ---------------- Bahan notulen untuk /susun-notulen ---------------- */
export function bahanNotulen(d, r) {
  const o = (id, cadangan) => { const x = d.peta.orang[id]; return x ? x.NAMA + (x.JABATAN ? ' (' + x.JABATAN + ')' : '') : (cadangan || '[perlu dilengkapi]'); };
  const peserta = String(r.ID_PESERTA || '').split(',').map((s) => s.trim()).filter(Boolean).map((id) => o(id, id));
  const agenda = d.agendaPer[r.ID_RAPAT] || [];
  const baris = [
    'BAHAN NOTULEN — ' + r.JUDUL_RAPAT,
    '',
    'Hari / Tanggal : ' + tglPanjang(r.TANGGAL),
    'Jam            : ' + (rentangJam(r) ? rentangJam(r) + ' WIB' : '[perlu dilengkapi]'),
    'Jenis rapat    : ' + (r.JENIS_RAPAT || '-'),
    'Sifat pertemuan: ' + (r.MODE || 'Luring'),
    'Tempat         : ' + (teks(r.TEMPAT) || '[perlu dilengkapi]'),
    'Tautan daring  : ' + (teks(r.TAUTAN_RAPAT) || '-'),
    'Pimpinan rapat : ' + o(r.ID_PIMPINAN, r.PIMPINAN_RAPAT),
    'Notulis rapat  : ' + o(r.ID_NOTULIS, r.NOTULIS),
    'Peserta rapat  : ' + (peserta.length ? peserta.join('; ') : (r.PESERTA || 'Sesuai lampiran daftar kehadiran')),
    '',
    'Agenda rapat (Kode Agenda — Pokok Bahasan):',
  ];
  agenda.forEach((a, i) => baris.push((i + 1) + '. ' + a.ID_ITEM_RAPAT + ' — ' + judulAgenda(d, a) + (teks(a.SUSULAN) ? ' [selipan, dicatat setelah notulen terbit]' : '')));
  if (!agenda.length) baris.push('(belum ada agenda; isi Kode Agenda dengan "-")');
  baris.push('', 'Wajib: di akhir notulen tambahkan tabel "LAMPIRAN — RINGKASAN KEPUTUSAN DAN TINDAK LANJUT" dengan kolom',
    'Kode Agenda | Pokok Bahasan | Ringkasan Pembahasan | Keputusan | Tindak Lanjut | PIC | Target',
    'Satu baris untuk satu tindak lanjut. Target ditulis dd/mm/yyyy. PIC ditulis nama lengkap.');
  return baris.join('\n');
}

export function salinTeks(t) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(t);
  return new Promise((resolve, reject) => {
    const ta = document.createElement('textarea');
    ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); resolve(); } catch (e) { reject(e); } finally { document.body.removeChild(ta); }
  });
}
