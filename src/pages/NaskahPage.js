import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { langganNaskah, ambilNaskah, muatInitNaskah, muatBab, muatTelaah, muatDasarHukumPasal, muatTeks } from '../naskah';
import { RelAtas, TombolLaci } from '../components/TombolRel';
import TombolTautan from '../components/TombolTautan';
import BarisJejak, { TeksRujukan } from '../components/BarisJejak';
import PitaPeta from '../components/PitaPeta';
import PanelDasarHukum from '../components/PanelDasarHukum';
import { petaAyatUrusan, petaArasLama, redaksiPerAyat, ikatCatatan, penandaAyat, pasalBerpenanda, hitungTugas, monevPasal } from '../utils/telaah';
import { STORAGE_KEY } from '../config';
import { hanyaLabel, jenisJejak, judulSama } from '../utils/rujukanHukum';
import { ambilSasaran, langganSasaran, lepasSasaran } from '../utils/bukaAyat';
import { namaPasal, adaPasal } from '../utils/rujukan';

/** v5.15: pita dengan urusan sebanyak ini atau lebih tampil tertutup lebih dulu. */
const BATAS_RINGKAS = 6;

/**
 * Halaman Naskah (v5.4): berangkat dari Bab dan Pasal.
 * v5.4: menu Tampilan dihapus (tinggal dua sakelar: Peta bisnis, Sorot perubahan kata); "Hanya ayat yang berubah"
 * menjadi pilihan saringan; titik warna, lencana, dan legenda diganti satu penanda "perlu tindakan" beralasan.
 * Ruang Rapat/Kerja diatur sakelar di bilah atas.
 * Daftar pasal (kiri) dan naskah (kanan) digulir sendiri-sendiri; topbar dan kepala pasal tetap terlihat.
 * Saat naskah digulir, kepala pasal diringkas menjadi satu baris (Bab · Pasal · judul).
 *
 * Mode rapat  : bunyi ayat 2026 dan dasar perubahan ayat saja, huruf lebih besar — untuk dibaca bersama Pimpinan.
 *               Usulan redaksi yang masih terbuka ikut tampil (semula → menjadi, dan alasannya).
 * Mode kerja  : Statuta 2025 · Jejak · Rancangan 2026 · Dasar perubahan ayat; jejak dapat disunting,
 *               usulan redaksi dapat ditulis dan diterapkan ke Google Doc.
 * Kepala pasal (garis besar perubahan, sumber, dasar hukum) menempel di atas saat digulir.
 * Di bawah ayat: catatan asesor Monev, sorotan tugas YEH/UNEKA, rujukan silang patah, dugaan ayat mirip,
 * dan pita peta bisnis. Setiap naskah membawa petanya sendiri: pita peta 2025 di bawah ayat Statuta 2025
 * (Mode kerja) dan pita peta 2026 di bawah ayat rancangan 2026, sehingga perbedaan alur terbaca berdampingan.
 */
function bacaLokal(k, bawaan) {
  try { const v = window.localStorage.getItem(k); return v === null ? bawaan : v; } catch (e) { return bawaan; }
}
/**
 * v5.8: sidik isi pasal (bunyi ayat 2026 dan catatan) untuk tanda "berubah sejak terakhir dibuka".
 * Hanya dihitung di peramban dari data yang sudah dimuat; tidak ada permintaan tambahan ke server.
 */
function sidikPasal(d) {
  if (!d || !d.ayat26) return '';
  const s = JSON.stringify([d.ayat26.map((a) => [a.nomor, a.teks]), d.catatan ? [d.catatan.sumber, d.catatan.perubahan, d.catatan.hukum] : null]);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36) + '.' + s.length;
}

function tulisLokal(k, v) {
  try { window.localStorage.setItem(k, v); } catch (e) { /* abaikan */ }
}

// v5.13: saringan jenis perubahan ayat (label pada catatan ayat; ayat dihapus dari status jejak).
const JENIS = [['substansi', 'Substansi'], ['baru', 'Muatan baru'], ['hapus', 'Dihapus']];

const SARINGAN = [
  ['semua', 'Semua'], ['monev', 'Monev'], ['tugas', 'Tugas YEH/UNEKA'], ['usulan', 'Ayat dihapus belum dikonfirmasi'], ['temuan', 'Ada temuan'],
  ['redaksi', 'Usulan redaksi'], ['berubah', 'Hanya ayat yang berubah']
];

export default function NaskahPage({ pasal, onPilihPasal, onBukaUrusan, onTelaah, urusan, ctx, saring, setSaring, onGalat, ruang }) {
  const [n, setN] = useState(ambilNaskah);
  const [cari, setCari] = useState('');
  const [terbuka, setTerbuka] = useState(null);
  const [dh, setDh] = useState(null);
  const [sorot, setSorot] = useState(() => bacaLokal(STORAGE_KEY.NASKAH_SOROT, '0') === '1');
  const [pita, setPita] = useState(() => bacaLokal(STORAGE_KEY.NASKAH_PITA, '1') !== '0');
  const [ciut, setCiut] = useState(() => bacaLokal(STORAGE_KEY.NASKAH_CIUT, '0') === '1');
  const [jenis, setJenis] = useState(() => bacaLokal(STORAGE_KEY.NASKAH_JENIS, 'semua'));
  const [galatBab, setGalatBab] = useState('');
  const [digulir, setDigulir] = useState(false);
  const [tahan, setTahan] = useState(false);
  const gulir = useRef(null);
  const kepalaRef = useRef(null);
  // Tinggi kepala pasal dipakai sebagai posisi beku judul kolom tabel (--kepala-h).
  useEffect(() => {
    const el = kepalaRef.current, g = gulir.current;
    if (!el || !g || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => { g.style.setProperty('--kepala-h', el.offsetHeight + 'px'); });
    ro.observe(el);
    return () => ro.disconnect();
  });
  const onGulir = useCallback((e) => {
    // Ambang ganda: diringkas sesudah 80px, dibuka lagi hanya bila kembali ke puncak (menghindari kedip).
    const st = e.currentTarget.scrollTop;
    setDigulir((x) => (x ? st > 10 : st > 80));
  }, []);
  useEffect(() => langganNaskah(setN), []);
  useEffect(() => { muatInitNaskah().catch(() => {}); muatTelaah().catch(() => {}); }, []);
  useEffect(() => { setTerbuka(null); }, [ruang]);
  useEffect(() => { tulisLokal(STORAGE_KEY.NASKAH_SOROT, sorot ? '1' : '0'); }, [sorot]);
  useEffect(() => { tulisLokal(STORAGE_KEY.NASKAH_PITA, pita ? '1' : '0'); }, [pita]);
  useEffect(() => { tulisLokal(STORAGE_KEY.NASKAH_CIUT, ciut ? '1' : '0'); }, [ciut]);
  useEffect(() => { tulisLokal(STORAGE_KEY.NASKAH_JENIS, jenis); }, [jenis]);

  const init = n.init;
  const telaah = n.telaah;
  const daftar = useMemo(() => (init && init.daftar) || [], [init]);
  const cfg = (init && init.cfg) || {};
  const warna = cfg.warna || {};

  useEffect(() => {
    if (!init || !daftar.length || adaPasal(pasal)) return;
    const terakhir = Number(bacaLokal(STORAGE_KEY.NASKAH_PASAL, '0'));
    const ada = daftar.some((d) => d.pasal === terakhir);
    onPilihPasal(ada ? terakhir : daftar[0].pasal, true);
  }, [init, daftar, pasal, onPilihPasal]);

  const info = daftar.find((d) => d.pasal === pasal) || null;
  useEffect(() => {
    if (!info) return;
    tulisLokal(STORAGE_KEY.NASKAH_PASAL, String(info.pasal));
    setTerbuka(null);
    setGalatBab('');
    muatBab(info.bab).catch((e) => setGalatBab((e && e.message) || String(e)));
    if (gulir.current) gulir.current.scrollTop = 0;
    setDigulir(false);
    setTahan(false);
    // Pasal yang sedang dibuka ikut tampak pada daftar kiri.
    window.setTimeout(() => {
      const el = document.querySelector('.nk-item.aktif');
      if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
    }, 0);
  }, [info && info.pasal]); // eslint-disable-line react-hooks/exhaustive-deps

  const data = adaPasal(pasal) ? n.pasal[pasal] : null;
  // Bunyi dasar hukum pasal ini diambil di latar belakang, sehingga sudah tersedia saat kutipan diklik.
  const adaData = !!data;
  useEffect(() => { if (adaData && adaPasal(pasal)) muatDasarHukumPasal(pasal).catch(() => {}); }, [adaData, pasal]);
  // v5.14: ayat Statuta 2025 per aras (tab 04) ikut melekat pada urusan sebagai u.aras25.
  const urusanN = useMemo(() => {
    const r = (init && init.rujukan25) || null;
    if (!r || !urusan) return urusan;
    return urusan.map((u) => (r[u.id] ? Object.assign({}, u, { aras25: r[u.id] }) : u));
  }, [urusan, init]);
  const ayatUrusan = useMemo(() => petaAyatUrusan(urusanN, init && init.indeks26), [urusanN, init]);
  const arasLama = useMemo(() => petaArasLama(urusanN, init && init.indeks25), [urusanN, init]);
  // v5.15: ayat tujuan dari rujukan pita yang diklik; digulir dan disorot sesudah pasalnya termuat.
  const [sasaran, setSasaran] = useState(ambilSasaran);
  useEffect(() => langganSasaran(setSasaran), []);
  const redaksiAyat = useMemo(() => redaksiPerAyat(data), [data]);
  const indeksUrusan = useMemo(() => { const o = {}; (urusanN || []).forEach((u) => { o[u.id] = u; }); return o; }, [urusanN]);
  const penanda = useMemo(() => penandaAyat(telaah), [telaah]);
  const monevPsl = useMemo(() => monevPasal(telaah), [telaah]);
  const pasalMonev = useMemo(() => {
    const s = pasalBerpenanda(penanda, 'monev');
    Object.keys(monevPsl).forEach((p) => s.add(Number(p)));
    return s;
  }, [penanda, monevPsl]);
  const pasalTemuan = useMemo(() => pasalBerpenanda(penanda, 'temuan'), [penanda]);
  // v5.8: pasal yang bunyi atau catatannya berubah sejak terakhir dibuka di perangkat ini.
  const sidik = useMemo(() => {
    const o = {};
    Object.keys(n.pasal || {}).forEach((k) => { const x = sidikPasal(n.pasal[k]); if (x) o[k] = x; });
    return o;
  }, [n.pasal]);
  const [lihat, setLihat] = useState(() => {
    try { return JSON.parse(bacaLokal(STORAGE_KEY.LIHAT, 'null')); } catch (e) { return null; }
  });
  useEffect(() => {
    if (!Object.keys(sidik).length) return;
    setLihat((l) => {
      const o = Object.assign({}, l || {});
      let ubah = !l;
      // Pasal yang baru pertama kali terbaca dijadikan patokan (tidak ditandai); pasal yang sedang dibuka dianggap sudah dilihat.
      Object.keys(sidik).forEach((k) => { if (!(k in o)) { o[k] = sidik[k]; ubah = true; } });
      if (adaPasal(pasal) && sidik[pasal] && o[pasal] !== sidik[pasal]) { o[pasal] = sidik[pasal]; ubah = true; }
      return ubah ? o : l;
    });
  }, [sidik, pasal]);
  useEffect(() => { if (lihat) tulisLokal(STORAGE_KEY.LIHAT, JSON.stringify(lihat)); }, [lihat]);
  const berubah = useMemo(() => {
    const t = new Set();
    if (!lihat) return t;
    Object.keys(sidik).forEach((k) => { if (lihat[k] && lihat[k] !== sidik[k] && Number(k) !== pasal) t.add(Number(k)); });
    return t;
  }, [sidik, lihat, pasal]);
  const catatan = useMemo(() => ikatCatatan(data), [data]);
  // v5.12: catatan per ayat dari kolom Alasan jejak (tab 07) melengkapi baris Dasar perubahan dari Doc.
  const alasanAyat = useMemo(() => {
    const m = {};
    ((data && data.jejak) || []).forEach((j) => {
      const t = String(j.alasan || '').trim();
      if (!j.id26 || !t) return;
      m[j.id26] = m[j.id26] || [];
      if (m[j.id26].indexOf(t) === -1) m[j.id26].push(t);
    });
    return m;
  }, [data]);
  const baris = useMemo(() => susunBaris(data), [data]);
  const kerja = ruang === 'kerja';
  const hanyaBerubah = kerja && saring === 'berubah';
  // Mode rapat tidak menampilkan baris ayat 2025 yang dihapus, jadi saringan "Dihapus" hanya ada di Mode kerja.
  const jenisAktif = jenis !== 'semua' && (kerja || jenis !== 'hapus') ? jenis : 'semua';
  const jenisBaris = useCallback((b) => jenisJejak(b.jejak, cfg.label), [cfg.label]);
  const tampil = useMemo(() => {
    const cocok = (b) => jenisAktif === 'semua' || (b.jejak && jenisBaris(b) === jenisAktif);
    if (!kerja) {
      // Mode rapat: satu baris per ayat 2026, tanpa baris yang hanya berisi ayat 2025.
      const ada = new Set();
      return baris.filter((b) => { if (!b.kanan || ada.has(b.kanan.id) || !cocok(b)) return false; ada.add(b.kanan.id); return true; });
    }
    const dasar = hanyaBerubah && cfg.label ? baris.filter((b) => !b.jejak || b.jejak.status !== cfg.label.TETAP) : baris;
    return dasar.filter(cocok);
  }, [baris, kerja, hanyaBerubah, cfg.label, jenisAktif, jenisBaris]);
  // v5.15: gulir ke ayat tujuan rujukan pita yang diklik, lalu sorot sebentar.
  useEffect(() => {
    if (!sasaran || !data || sasaran.pasal !== pasal) return undefined;
    const t = window.setTimeout(() => {
      const el = document.querySelector('.jj-tabel ' + (sasaran.tahun === '2025' ? '[data-k="' : '[data-n="') + sasaran.id + '"]');
      if (!el && jenisAktif !== 'semua') { setJenis('semua'); return; }
      lepasSasaran();
      if (!el) return;
      if (el.scrollIntoView) el.scrollIntoView({ block: 'center' });
      el.classList.add('jj-sasaran');
      window.setTimeout(() => el.classList.remove('jj-sasaran'), 2400);
    }, 200);
    return () => window.clearTimeout(t);
  }, [sasaran, data, pasal, jenisAktif, tampil]);
  // Jumlah ayat per jenis pada pasal yang dibuka (ayat 2026 dihitung sekali; ayat dihapus per ayat 2025).
  const hitungJenis = useMemo(() => {
    const o = { substansi: 0, baru: 0, hapus: 0 };
    if (!data) return o;
    const sdh = new Set();
    baris.forEach((b) => {
      if (!b.jejak) return;
      const j = jenisBaris(b);
      if (j === 'hapus') { if (b.kiri && b.kiri.pasal === data.pasal) o.hapus++; return; }
      if (!b.kanan || b.kanan.pasal !== data.pasal || sdh.has(b.kanan.id)) return;
      sdh.add(b.kanan.id);
      if (o[j] !== undefined) o[j]++;
    });
    return o;
  }, [baris, data, jenisBaris]);

  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase();
    const sr = kerja ? saring : 'semua';        // ruang Rapat: tanpa saringan
    return daftar.filter((d) => {
      if (q && !(String(d.pasal) === q || String(d.judul || '').toLowerCase().indexOf(q) !== -1 || String(d.bab).toLowerCase() === q)) return false;
      if (jenisAktif !== 'semua' && d.jenis && !d.jenis[jenisAktif]) return false;
      const saring = sr;
      if (saring === 'monev') return pasalMonev.has(d.pasal);
      if (saring === 'tugas') return d.sorot > 0;
      if (saring === 'usulan') return d.hapus > 0;
      if (saring === 'temuan') return pasalTemuan.has(d.pasal);
      if (saring === 'redaksi') return d.redaksi > 0;
      return true;
    });
  }, [daftar, cari, saring, kerja, pasalMonev, pasalTemuan, jenisAktif]);

  // v5.5: cari isi ayat di seluruh naskah (≥ 3 huruf, bukan nomor pasal), dari salinan bunyi seluruh ayat.
  const qIsi = cari.trim().length >= 3 && !/^\d+$/.test(cari.trim()) ? cari.trim().toLowerCase() : '';
  useEffect(() => {
    if (!qIsi) return undefined;
    const t = window.setTimeout(() => { muatTeks().catch(() => {}); }, 350);
    return () => window.clearTimeout(t);
  }, [qIsi]);
  const hasilCari = useMemo(() => {
    if (!qIsi || !n.teks) return null;
    const out = [];
    for (const [id, p, no, t] of n.teks.ayat) {
      const i = t.toLowerCase().indexOf(qIsi);
      if (i !== -1) out.push({ id, pasal: p, nomor: no, teks: t, i });
      if (out.length >= 50) break;
    }
    return out;
  }, [qIsi, n.teks]);

  const posisi = daftar.findIndex((d) => d.pasal === pasal);
  const pindah = useCallback((arah) => {
    const t = daftar[posisi + arah];
    if (t) onPilihPasal(t.pasal);
  }, [daftar, posisi, onPilihPasal]);

  if (n.galat && !init) {
    return (
      <div className="halaman nk-halaman">
        <div className="galat-kotak">Modul naskah belum dapat dibaca: {n.galat}</div>
        <p className="kecil">Pastikan berkas Naskah.gs sudah dipasang dan deployment Apps Script sudah dibuat versi barunya.</p>
      </div>
    );
  }
  if (!init) return <div className="halaman nk-halaman"><div className="nk-muat">Membaca naskah…</div></div>;
  if (init.siap === false) {
    return (
      <div className="halaman nk-halaman">
        <div className="panel-info">
          <strong>Tab naskah belum dibuat.</strong> Pada Spreadsheet, jalankan menu Modul Naskah →
          “Pasang modul naskah”, lalu “Tarik naskah 2026 dari Google Doc”, lalu “Susun usulan jejak ayat”.
          Sesudah itu tekan Refresh.
        </div>
      </div>
    );
  }

  const babInfo = init.bab.find((b) => info && b.bab === info.bab) || {};
  const judulBab = babInfo.judulBab || '';
  // v5.13: judul pada Statuta 2025 (pasal asal menurut jejak) bila berbeda dari judul 2026.
  const babLama = (babInfo.lama || []).filter((x) => !(x.bab === babInfo.bab && judulSama(x.judulBab, judulBab)));
  const asal = info && info.asal;
  const judulLamaBeda = !!asal && (!asal.judul || !judulSama(asal.judul, info.judul) || asal.pasal !== info.pasal);
  const usulan = data && cfg.label ? data.jejak.filter((j) => !j.dikonfirmasi && j.status === cfg.label.HAPUS).length : 0;
  const tugas = {};
  if (data) data.ayat26.forEach((a) => { const t = hitungTugas(a.sorot, warna); Object.keys(t).forEach((k) => { tugas[k] = (tugas[k] || 0) + t[k]; }); });
  const monevBebas = (adaPasal(pasal) && monevPsl[pasal]) || [];
  const nMonev = (data ? data.ayat26.reduce((s, a) => s + ((penanda[a.id] && penanda[a.id].monev.length) || 0), 0) : 0) + monevBebas.length;
  const nMonevAda = data ? data.ayat26.reduce((s, a) => s + ((penanda[a.id] && penanda[a.id].monevAda.length) || 0), 0) : 0;
  const ringkas = digulir && !tahan;
  const hukum = data ? (data.catatan.hukumUrai || String(data.catatan.hukum || '').split('\n').filter(Boolean).map((t) => ({ t, q: t }))) : [];
  const nRedaksi = data ? (data.redaksi || []).filter((r) => r.status === 'USULAN').length : 0;
  const perlu = [];
  if (usulan) perlu.push(usulan + ' ayat dihapus belum dikonfirmasi');
  if (nRedaksi) perlu.push(nRedaksi + ' usulan redaksi');
  Object.keys(tugas).forEach((k) => perlu.push(tugas[k] + ' tugas ' + k));
  const sudah = new Set();
  const tampilPita = pita || !kerja;
  const pitaPeta = (tahun, d) => (d && d.length
    ? <PitaPeta tahun={tahun} daftar={d} ctx={ctx} onTelaah={onTelaah} onBukaUrusan={onBukaUrusan} onBukaPasal={onPilihPasal}
                ringkas={d.length >= BATAS_RINGKAS} />
    : null);

  return (
    <div className="nk-wrap">
      <aside className="nk-rel" aria-label="Daftar pasal">
        <RelAtas><input className="inp nk-cari" type="search" value={cari} onChange={(e) => setCari(e.target.value)}
               placeholder="Cari pasal atau isi ayat" /></RelAtas>
        {kerja ? (
          <select className="inp nk-saring-pilih" value={saring} onChange={(e) => setSaring(e.target.value)} aria-label="Saring pasal">
            {SARINGAN.map(([k, l]) => <option key={k} value={k}>{k === 'semua' ? 'Semua pasal' : l}</option>)}
          </select>
        ) : null}
        {qIsi ? (
          <div className="nk-daftar">
            <div className="nk-bab-judul">ISI AYAT{hasilCari ? ' · ' + hasilCari.length + (hasilCari.length >= 50 ? '+' : '') + ' ditemukan' : ''}</div>
            {!hasilCari ? <div className="redup kecil nk-kosong">Mencari…</div> : null}
            {(hasilCari || []).map((h) => (
              <button type="button" key={h.id} className={'nk-item nk-hasil' + (h.pasal === pasal ? ' aktif' : '')} onClick={() => onPilihPasal(h.pasal)}>
                <b>{h.pasal === 0 ? 'Pembukaan' : 'Ps ' + h.pasal}{h.nomor ? ' (' + h.nomor + ')' : ''}</b>
                <span className="nk-hasil-teks">{h.i > 40 ? '…' + h.teks.slice(h.i - 40, h.i) : h.teks.slice(0, h.i)}<mark>{h.teks.slice(h.i, h.i + qIsi.length)}</mark>{h.teks.slice(h.i + qIsi.length, h.i + qIsi.length + 60)}…</span>
              </button>
            ))}
            {hasilCari && !hasilCari.length ? <div className="redup kecil nk-kosong">Tidak ada ayat yang memuat kata ini.</div> : null}
          </div>
        ) : null}
        <div className="nk-daftar" hidden={!!qIsi}>
          {init.bab.map((b) => {
            const isi = tersaring.filter((d) => d.bab === b.bab);
            if (!isi.length) return null;
            return (
              <div key={b.bab} className="nk-bab">
                <div className="nk-bab-judul">{b.bab}{b.judulBab ? ' · ' + b.judulBab : ''}</div>
                {isi.map((d) => (
                  <button type="button" key={d.pasal} className={'nk-item' + (d.pasal === pasal ? ' aktif' : '')}
                          onClick={() => onPilihPasal(d.pasal)} title={d.judul}>
                    {kerja && alasanPasal(d, pasalTemuan).length
                      ? <i className="nk-perlu" title={'Perlu tindakan: ' + alasanPasal(d, pasalTemuan).join(', ')} aria-label="perlu tindakan">●</i>
                      : <span />}
                    <span className="nk-item-no">{namaPasal(d.pasal)}{berubah.has(d.pasal) ? <i className="nk-berubah" title="Berubah sejak terakhir dibuka" aria-label="berubah sejak terakhir dibuka">●</i> : null}
                      {jenisAktif !== 'semua' && d.jenis ? <span className="nk-jml" title={d.jenis[jenisAktif] + ' ayat ' + labelJenis(jenisAktif).toLowerCase()}>{d.jenis[jenisAktif]}</span> : null}</span>
                    <span className="nk-item-judul">{d.judul}</span>
                    {pasalMonev.has(d.pasal) ? <span className="tanda-m" title="Terkunci Monev">M</span> : <span />}
                  </button>
                ))}
              </div>
            );
          })}
          {!tersaring.length ? <div className="redup kecil nk-kosong">Tidak ada pasal pada saringan ini.</div> : null}
        </div>
        <div className="nk-legenda">
          {kerja ? <span><i className="nk-perlu">●</i> perlu tindakan (arahkan tetikus untuk alasannya)</span> : null}
          <span><span className="tanda-m">M</span> ditagih Monev</span>
          {berubah.size ? <span><i className="nk-berubah">●</i> berubah sejak terakhir dibuka ({berubah.size})</span> : null}
        </div>
      </aside>
      <TombolLaci label="Daftar pasal" />

      <div className="nk-gulir" ref={gulir} onScroll={onGulir}>
      <main className={'nk-utama' + (kerja ? '' : ' nk-rapat')}>
        <select className="inp nk-pilih-sempit" value={adaPasal(pasal) ? pasal : ''} onChange={(e) => onPilihPasal(Number(e.target.value))}
                aria-label="Pilih pasal">
          {daftar.map((d) => <option key={d.pasal} value={d.pasal}>{berubah.has(d.pasal) ? '● ' : ''}{d.pasal === 0 ? 'Pembukaan' : 'Pasal ' + d.pasal + ' · ' + d.judul}</option>)}
        </select>

        <div ref={kepalaRef} className={'nk-kepala5' + (ciut ? ' ciut' : '') + (ringkas ? ' ringkas' : '')}>
          <div className="rincian-no">{info ? info.bab : ''}{judulBab ? ' · ' + judulBab : ''}
            {babLama.length && !ringkas ? (
              <span className="nk-lama" title="Judul BAB pada Statuta 2025">{' '}Statuta 2025: {babLama.map((x, i) => (
                <React.Fragment key={x.bab}>{i ? '; ' : ''}<s>{x.bab} · {x.judulBab}</s></React.Fragment>))}</span>
            ) : null}
          </div>
          <div className="nk-judul-baris">
            <h2 className="nk-judul">{pasal === 0 ? 'Pembukaan' : 'Pasal ' + pasal + (info && info.judul ? ' · ' + info.judul : '')}</h2>
            {judulLamaBeda && !ringkas ? (
              <span className="nk-lama" title="Judul pasal pada Statuta 2025">Statuta 2025: {namaPasal(asal.pasal)}
                {asal.judul ? <> · <s>{asal.judul}</s></> : ' (tanpa judul)'}</span>
            ) : null}
            {nMonev ? <span className="lencana lencana-merah">Monev · {nMonev} butir</span> : null}
            {nMonevAda ? <span className="lencana lencana-abu" title="Butir Monev yang menurut Berita Acara sudah ada">Monev sudah ada · {nMonevAda}</span> : null}
            {kerja && perlu.length ? <span className="lencana lencana-perlu">Perlu tindakan: {perlu.join(' · ')}</span> : null}
            {adaPasal(pasal) ? <TombolTautan alamat={'#naskah-' + pasal} /> : null}
            <div className="nk-pindah">
              <button type="button" className="tbl tbl-ringan" onClick={() => pindah(-1)} disabled={posisi <= 0} aria-label="Pasal sebelumnya">‹</button>
              <button type="button" className="tbl tbl-ringan" onClick={() => pindah(1)} disabled={posisi >= daftar.length - 1} aria-label="Pasal berikutnya">›</button>
            </div>
          </div>
          {monevBebas.length && !ringkas ? (
            <div className="nk-monev-pasal">
              {monevBebas.map((m) => (
                <div key={m.butir}><b>Monev butir {m.butir}</b> · {m.alamat} — ditagih: {m.dokumen}. Berita Acara hanya menyebut pasal,
                  sehingga penempatan ayatnya bebas; isi kolom “Ayat tertuju” pada tab Monev bila ingin ditandai pada ayat tertentu.</div>
              ))}
            </div>
          ) : null}
          {data && !ciut && !ringkas ? (
            <div className="nk-gb">
              <div>
                <div className="blok-label">GARIS BESAR PERUBAHAN PASAL</div>
                {catatan.umum.length ? <ul className="daftar-rapat">{catatan.umum.map((b, i) => <li key={i}><TeksRujukan teks={b} onDh={setDh} /></li>)}</ul>
                  : <div className="redup kecil">{String(data.catatan.perubahan || '').trim() ? 'Seluruh catatan terikat ke ayat.' : '—'}</div>}
              </div>
              <div>
                <div className="blok-label">SUMBER</div>
                <div className="kecil-teks">{data.catatan.sumber || '—'}</div>
              </div>
              <div>
                <div className="blok-label">DASAR HUKUM</div>
                {hukum.length ? (
                  <div className="chip-baris">
                    {hukum.map((h, i) => {
                      // v5.9: baris judul ("Permendiktisaintek 39/2025:") hanya keterangan; kutipan yang alamatnya
                      // tidak (seluruhnya) ditemukan diberi tanda supaya terlihat tanpa harus dibuka.
                      if (h.judul) return <span key={i} className="chip-hukum-judul">{h.t}</span>;
                      const d = h.q ? n.hukum[h.q] : null;
                      const kurang = d ? (!d.ada ? 'gagal' : (d.alamat || []).some((a) => !a.ada) ? 'sebagian' : '') : '';
                      return (
                        <button type="button" key={i} className={'chip-hukum' + (kurang ? ' chip-hukum-' + kurang : '')} onClick={() => setDh(h)}
                                title={h.t + (kurang ? '\n' + (d.alasan || '') : '')}>
                          {kurang ? <span className="chip-hukum-tanda" aria-hidden="true">!</span> : null}
                          {h.t.length > 95 ? h.t.slice(0, 93) + '…' : h.t}
                        </button>
                      );
                    })}
                  </div>
                ) : <div className="tanda-awas-teks">Belum ada blok Dasar hukum pada naskah.</div>}
              </div>
            </div>
          ) : null}
          {ringkas ? (
            <button type="button" className="nk-lipat" onClick={() => { setTahan(true); if (ciut) setCiut(false); }}>▾ tampilkan catatan pasal</button>
          ) : (
            <button type="button" className="nk-lipat" onClick={() => { setCiut(!ciut); if (tahan) setTahan(false); }}>
              {ciut ? '▾ tampilkan catatan pasal' : '▴ ciutkan catatan pasal'}
            </button>
          )}

        {data ? (
          <div className="nk-jenis" role="group" aria-label="Saring jenis perubahan">
            <span className="nk-jenis-label">Tampilkan</span>
            <button type="button" className={'pil' + (jenisAktif === 'semua' ? ' aktif' : '')} onClick={() => setJenis('semua')} aria-pressed={jenisAktif === 'semua'}>Semua ayat</button>
            {JENIS.filter(([k]) => kerja || k !== 'hapus').map(([k, l]) => (
              <button type="button" key={k} className={'pil pil-jenis pil-' + k + (jenisAktif === k ? ' aktif' : '')} onClick={() => setJenis(jenisAktif === k ? 'semua' : k)}
                      aria-pressed={jenisAktif === k} disabled={!hitungJenis[k] && jenisAktif !== k}>
                {l} <b>{hitungJenis[k]}</b>
              </button>
            ))}
          </div>
        ) : null}
        {kerja ? (
          <div className="nk-alat">
            <button type="button" className={'pil' + (pita ? ' aktif' : '')} onClick={() => setPita(!pita)} aria-pressed={pita}>Peta bisnis</button>
            <button type="button" className={'pil' + (sorot ? ' aktif' : '')} onClick={() => setSorot(!sorot)} aria-pressed={sorot}>Sorot perubahan kata</button>
            <button type="button" className="tbl tbl-ringan nk-cetak" onClick={() => window.print()}>Cetak A4</button>
          </div>
        ) : null}
        </div>

        {galatBab ? <div className="galat-kotak">{galatBab}</div> : null}
        {!data && !galatBab ? <div className="nk-muat">Membaca {namaPasal(pasal)}…</div> : null}

        {data ? (
          <div className={'jj-tabel' + (kerja ? ' jj-kerja' : ' jj-rapat')}>
            <div className="jj-kepala">
              <div className="jj-k25">{cfg.labelLama || 'STATUTA 2025'}</div>
              <div className="jj-tengah-kepala">JEJAK</div>
              <div>{cfg.labelBaru || 'RANCANGAN 2026'}</div>
              <div>DASAR PERUBAHAN AYAT</div>
            </div>
            {!init.adaJejak ? (
              <div className="panel-info jj-info">Jejak belum disusun. Jalankan menu Modul Naskah → “Susun usulan jejak ayat”, lalu Refresh.</div>
            ) : null}
            {tampil.map((b) => {
              const k = b.kanan;
              const pertama = !!k && !sudah.has(k.id);
              if (k) sudah.add(k.id);
              // v5.15 — satu aturan untuk dua sisi: pita hanya pada ayat yang menyebut langkah urusan (bingkai biru);
              // setiap urusan yang tampil di satu sisi tampil juga di sisi lain pada baris yang sama. Bila ayat di sisi
              // itu tidak menuangkan langkahnya, urusan tampil redup dengan keterangan letak langkahnya.
              const l = b.kiri;
              let daftarUrusan = null;
              let daftarLama = null;
              if (tampilPita) {
                const R = (k && ayatUrusan[k.id]) || {};
                const L = (l && arasLama[l.id]) || {};
                if (!k || pertama) {
                  const ids = Object.keys(R).concat(Object.keys(L).filter((id) => !R[id])).filter((id) => indeksUrusan[id]);
                  daftarUrusan = ids.map((id) => (R[id] ? { u: indeksUrusan[id], aras: R[id] } : { u: indeksUrusan[id], cermin: true }));
                  daftarLama = ids.map((id) => (L[id] ? { u: indeksUrusan[id], aras: L[id] } : { u: indeksUrusan[id], cermin: true }));
                } else {
                  // Ayat 2026 yang sama sudah tampil (dan berpita) pada baris di atas.
                  daftarLama = Object.keys(L).filter((id) => indeksUrusan[id]).map((id) => ({ u: indeksUrusan[id], aras: L[id] }));
                }
              }
              return (
                <BarisJejak key={b.kunci} baris={b} pasal={pasal} cfg={cfg} init={init} sorot={kerja && sorot}
                            terbuka={terbuka === b.kunci} onBuka={() => setTerbuka(b.kunci)} onTutup={() => setTerbuka(null)}
                            onPilihPasal={onPilihPasal} onGalat={onGalat} bisaSunting={kerja} onDh={setDh}
                            pertama={pertama} dasar={k ? gabungDasar(catatan.per[k.id], alasanAyat[k.id]) : null} penanda={k ? penanda[k.id] : null}
                            warna={warna} redaksi={k ? redaksiAyat[k.id] : null}
                            pita={pitaPeta('2026', daftarUrusan)}
                            pitaKiri={pitaPeta('2025', daftarLama)} />
              );
            })}
            {!tampil.length ? (
              <div className="jj-kosong-semua">{jenisAktif !== 'semua'
                ? 'Tidak ada ayat ' + labelJenis(jenisAktif).toLowerCase() + ' pada pasal ini.'
                : 'Tidak ada baris yang berubah pada pasal ini.'}</div>
            ) : null}
          </div>
        ) : null}
      </main>
      </div>

      {dh ? <PanelDasarHukum item={dh} pasal={pasal} onTutup={() => setDh(null)} onBukaPasal={onPilihPasal} /> : null}
    </div>
  );
}

/** Alasan satu pasal ditandai "perlu tindakan" pada daftar pasal (ruang Kerja). */
function alasanPasal(d, pasalTemuan) {
  const a = [];
  if (d.hapus > 0) a.push(d.hapus + ' ayat dihapus belum dikonfirmasi');
  if (d.redaksi > 0) a.push(d.redaksi + ' usulan redaksi');
  if (d.masalah > 0 || pasalTemuan.has(d.pasal)) a.push('ada temuan (Monev, rujukan patah, atau ayat kembar)');
  return a;
}

/**
 * Menyusun baris tampilan dari jejak pasal. Ayat yang belum punya jejak tetap tampil
 * (tanpa status) supaya naskah terbaca utuh walau jejak belum disusun.
 */
function susunBaris(data) {
  if (!data) return [];
  const a25 = {};
  const a26 = {};
  data.ayat25.forEach((a) => { a25[a.id] = Object.assign({ pasal: data.pasal }, a); });
  data.ayat26.forEach((a) => { a26[a.id] = Object.assign({ pasal: data.pasal }, a); });
  const luar = data.luar || {};
  const cari = (peta, id) => (id ? (peta[id] || (luar[id] ? Object.assign({ id }, luar[id]) : null)) : null);
  const dipakai25 = {};
  const dipakai26 = {};
  const out = data.jejak.map((j) => {
    const kiri = cari(a25, j.id25);
    const kanan = cari(a26, j.id26);
    if (j.id25) dipakai25[j.id25] = true;
    if (j.id26) dipakai26[j.id26] = true;
    return { kunci: j.id, jejak: j, kiri, kanan };
  });
  data.ayat25.forEach((a) => { if (!dipakai25[a.id]) out.push({ kunci: 'L' + a.id, jejak: null, kiri: a25[a.id], kanan: null }); });
  data.ayat26.forEach((a) => { if (!dipakai26[a.id]) out.push({ kunci: 'B' + a.id, jejak: null, kiri: null, kanan: a26[a.id] }); });
  const urut = (b) => {
    if (b.kanan && b.kanan.pasal === data.pasal) return b.kanan.urutan * 100 + (b.kiri && b.kiri.pasal === data.pasal ? b.kiri.urutan : 0);
    if (b.kiri && b.kiri.pasal === data.pasal) return b.kiri.urutan * 100 + 50;
    return 99999;
  };
  return out.sort((x, y) => urut(x) - urut(y));
}

/**
 * v5.12: baris Dasar perubahan dari Doc lebih dulu, lalu catatan Alasan jejak yang belum tertulis.
 * v5.13: catatan yang hanya berupa label jenis ("Substansi.") diletakkan di depan baris pertama dari Doc.
 */
function gabungDasar(dariDoc, dariJejak) {
  const out = (dariDoc || []).slice();
  const label = (dariJejak || []).filter(hanyaLabel);
  (dariJejak || []).forEach((t) => { if (!hanyaLabel(t) && out.indexOf(t) === -1) out.push(t); });
  if (label.length) {
    if (out.length && !/^(Rumusan tetap|Redaksional|Penyesuaian istilah|Substansi|Muatan baru|Dipindah)\./i.test(out[0])) out[0] = label[0] + ' ' + out[0];
    else if (!out.length) out.push(label[0]);
  }
  return out;
}

function labelJenis(k) { return (JENIS.find((x) => x[0] === k) || ['', ''])[1]; }
