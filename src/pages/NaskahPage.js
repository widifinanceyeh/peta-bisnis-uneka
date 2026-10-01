import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { langganNaskah, ambilNaskah, muatInitNaskah, muatBab, muatTelaah, muatDasarHukumPasal, muatTeks } from '../naskah';
import { RelAtas, TombolLaci } from '../components/TombolRel';
import TombolTautan from '../components/TombolTautan';
import BarisJejak from '../components/BarisJejak';
import PitaPeta, { PetaBaris } from '../components/PitaPeta';
import PanelDasarHukum from '../components/PanelDasarHukum';
import { petaAyatUrusan, petaAyatLama, redaksiPerAyat, ikatCatatan, penandaAyat, pasalBerpenanda, hitungTugas, monevPasal } from '../utils/telaah';
import { STORAGE_KEY } from '../config';

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

  const init = n.init;
  const telaah = n.telaah;
  const daftar = useMemo(() => (init && init.daftar) || [], [init]);
  const cfg = (init && init.cfg) || {};
  const warna = cfg.warna || {};

  useEffect(() => {
    if (!init || !daftar.length || pasal) return;
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

  const data = pasal ? n.pasal[pasal] : null;
  // Bunyi dasar hukum pasal ini diambil di latar belakang, sehingga sudah tersedia saat kutipan diklik.
  const adaData = !!data;
  useEffect(() => { if (adaData && pasal) muatDasarHukumPasal(pasal).catch(() => {}); }, [adaData, pasal]);
  const ayatUrusan = useMemo(() => petaAyatUrusan(urusan, init && init.indeks26), [urusan, init]);
  const ayatLama = useMemo(() => petaAyatLama(urusan, init && init.indeks25), [urusan, init]);
  const redaksiAyat = useMemo(() => redaksiPerAyat(data), [data]);
  const indeksUrusan = useMemo(() => { const o = {}; (urusan || []).forEach((u) => { o[u.id] = u; }); return o; }, [urusan]);
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
      if (pasal && sidik[pasal] && o[pasal] !== sidik[pasal]) { o[pasal] = sidik[pasal]; ubah = true; }
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
  const baris = useMemo(() => susunBaris(data), [data]);
  const kerja = ruang === 'kerja';
  const hanyaBerubah = kerja && saring === 'berubah';
  const tampil = useMemo(() => {
    if (!kerja) {
      // Mode rapat: satu baris per ayat 2026, tanpa baris yang hanya berisi ayat 2025.
      const ada = new Set();
      return baris.filter((b) => { if (!b.kanan || ada.has(b.kanan.id)) return false; ada.add(b.kanan.id); return true; });
    }
    return hanyaBerubah && cfg.label ? baris.filter((b) => !b.jejak || b.jejak.status !== cfg.label.TETAP) : baris;
  }, [baris, kerja, hanyaBerubah, cfg.label]);

  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase();
    const sr = kerja ? saring : 'semua';        // ruang Rapat: tanpa saringan
    return daftar.filter((d) => {
      if (q && !(String(d.pasal) === q || String(d.judul || '').toLowerCase().indexOf(q) !== -1 || String(d.bab).toLowerCase() === q)) return false;
      const saring = sr;
      if (saring === 'monev') return pasalMonev.has(d.pasal);
      if (saring === 'tugas') return d.sorot > 0;
      if (saring === 'usulan') return d.hapus > 0;
      if (saring === 'temuan') return pasalTemuan.has(d.pasal);
      if (saring === 'redaksi') return d.redaksi > 0;
      return true;
    });
  }, [daftar, cari, saring, kerja, pasalMonev, pasalTemuan]);

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

  const judulBab = (init.bab.find((b) => info && b.bab === info.bab) || {}).judulBab || '';
  const usulan = data && cfg.label ? data.jejak.filter((j) => !j.dikonfirmasi && j.status === cfg.label.HAPUS).length : 0;
  const tugas = {};
  if (data) data.ayat26.forEach((a) => { const t = hitungTugas(a.sorot, warna); Object.keys(t).forEach((k) => { tugas[k] = (tugas[k] || 0) + t[k]; }); });
  const monevBebas = (pasal && monevPsl[pasal]) || [];
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
  const sudahLama = new Set();

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
                <b>Ps {h.pasal}{h.nomor ? ' (' + h.nomor + ')' : ''}</b>
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
                    <span className="nk-item-no">Pasal {d.pasal}{berubah.has(d.pasal) ? <i className="nk-berubah" title="Berubah sejak terakhir dibuka" aria-label="berubah sejak terakhir dibuka">●</i> : null}</span>
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
        <select className="inp nk-pilih-sempit" value={pasal || ''} onChange={(e) => onPilihPasal(Number(e.target.value))}
                aria-label="Pilih pasal">
          {daftar.map((d) => <option key={d.pasal} value={d.pasal}>{berubah.has(d.pasal) ? '● ' : ''}Pasal {d.pasal} · {d.judul}</option>)}
        </select>

        <div ref={kepalaRef} className={'nk-kepala5' + (ciut ? ' ciut' : '') + (ringkas ? ' ringkas' : '')}>
          <div className="rincian-no">{info ? info.bab : ''}{judulBab ? ' · ' + judulBab : ''}</div>
          <div className="nk-judul-baris">
            <h2 className="nk-judul">Pasal {pasal}{info && info.judul ? ' · ' + info.judul : ''}</h2>
            {nMonev ? <span className="lencana lencana-merah">Monev · {nMonev} butir</span> : null}
            {nMonevAda ? <span className="lencana lencana-abu" title="Butir Monev yang menurut Berita Acara sudah ada">Monev sudah ada · {nMonevAda}</span> : null}
            {kerja && perlu.length ? <span className="lencana lencana-perlu">Perlu tindakan: {perlu.join(' · ')}</span> : null}
            {pasal ? <TombolTautan alamat={'#naskah-' + pasal} /> : null}
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
                {catatan.umum.length ? <ul className="daftar-rapat">{catatan.umum.map((b, i) => <li key={i}>{b}</li>)}</ul>
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

        {kerja ? (
          <div className="nk-alat">
            <button type="button" className={'pil' + (pita ? ' aktif' : '')} onClick={() => setPita(!pita)} aria-pressed={pita}>Peta bisnis</button>
            <button type="button" className={'pil' + (sorot ? ' aktif' : '')} onClick={() => setSorot(!sorot)} aria-pressed={sorot}>Sorot perubahan kata</button>
            <button type="button" className="tbl tbl-ringan nk-cetak" onClick={() => window.print()}>Cetak A4</button>
          </div>
        ) : null}
        </div>

        {galatBab ? <div className="galat-kotak">{galatBab}</div> : null}
        {!data && !galatBab ? <div className="nk-muat">Membaca Pasal {pasal}…</div> : null}

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
              const daftarUrusan = k && pertama && (pita || !kerja) && ayatUrusan[k.id]
                ? Object.keys(ayatUrusan[k.id]).map((id) => ({ u: indeksUrusan[id], aras: ayatUrusan[k.id][id] })).filter((x) => x.u)
                : null;
              // Pita peta 2025: peta 2025 tidak membedakan aras per ayat, jadi satu urusan cukup tampil sekali
              // per pasal 2025, pada ayat pertama yang disebut, dengan keterangan ayat mana saja yang menjadi dasarnya.
              const l = b.kiri;
              let daftarLama = null;
              if (kerja && pita && l && ayatLama[l.id]) {
                daftarLama = Object.keys(ayatLama[l.id]).filter((id) => {
                  const kunci = id + '|P' + l.pasal;
                  if (sudahLama.has(kunci)) return false;
                  sudahLama.add(kunci);
                  return true;
                }).map((id) => ({ u: indeksUrusan[id], lingkup: ayatLama[l.id][id], dasar: dasarLama(init.indeks25, ayatLama, l.pasal, id) }))
                  .filter((x) => x.u);
              }
              return (
                <BarisJejak key={b.kunci} baris={b} pasal={pasal} cfg={cfg} init={init} sorot={kerja && sorot}
                            terbuka={terbuka === b.kunci} onBuka={() => setTerbuka(b.kunci)} onTutup={() => setTerbuka(null)}
                            onPilihPasal={onPilihPasal} onGalat={onGalat} bisaSunting={kerja}
                            pertama={pertama} dasar={k ? catatan.per[k.id] : null} penanda={k ? penanda[k.id] : null}
                            warna={warna} redaksi={k ? redaksiAyat[k.id] : null}
                            pita={daftarUrusan && daftarUrusan.length
                              ? (kerja
                                ? <PitaPeta tahun="2026" daftar={daftarUrusan} ctx={ctx} onTelaah={onTelaah} onBukaUrusan={onBukaUrusan} />
                                : <PetaBaris daftar={daftarUrusan} ctx={ctx} onTelaah={onTelaah} />)
                              : null}
                            pitaKiri={daftarLama && daftarLama.length
                              ? <PitaPeta tahun="2025" daftar={daftarLama} ctx={ctx} onTelaah={onTelaah} onBukaUrusan={onBukaUrusan} />
                              : null} />
              );
            })}
            {!tampil.length ? <div className="jj-kosong-semua">Tidak ada baris yang berubah pada pasal ini.</div> : null}
          </div>
        ) : null}
      </main>
      </div>

      {dh ? <PanelDasarHukum item={dh} pasal={pasal} onTutup={() => setDh(null)} onBukaPasal={onPilihPasal} /> : null}
    </div>
  );
}

/** Keterangan dasar urusan pada satu pasal Statuta 2025: "seluruh Pasal 8" atau "Pasal 4 ayat (1), (2), (3), (5)". */
function dasarLama(indeks25, ayatLama, pasal, idUrusan) {
  const daftar = (indeks25 && indeks25[pasal]) || [];
  const kena = daftar.filter((x) => ayatLama[x[0]] && ayatLama[x[0]][idUrusan]);
  if (kena.length && kena.every((x) => ayatLama[x[0]][idUrusan] === 'pasal')) return 'seluruh Pasal ' + pasal;
  const nomor = kena.filter((x) => ayatLama[x[0]][idUrusan] === 'ayat').map((x) => String(x[1] || '').trim()).filter(Boolean);
  if (!nomor.length) return 'Pasal ' + pasal;
  const kurung = /^\(/.test(nomor[0]);
  return 'Pasal ' + pasal + (kurung ? ' ayat ' + nomor.map((x) => x.replace(/\.$/, '')).join(', ')
    : ' angka ' + nomor.map((x) => x.replace(/[().]/g, '')).join(', '));
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
