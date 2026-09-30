import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import './tambahan.css';
import './naskah.css';
import TopBar from './components/TopBar';
import Toast from './components/Toast';
import DiagnosaPanel from './components/Diagnosa';
import PetaPage from './pages/PetaPage';
import EditorPage from './pages/EditorPage';
import EditorArasPage from './pages/EditorArasPage';
import useBootstrap from './hooks/useBootstrap';
import useData from './hooks/useData';
import { buatIndeksOrgan } from './utils/langkah';
import { saringUrusan, FILTER_KOSONG } from './utils/saring';
import { buatKonteksAras } from './utils/aras';
import { STORAGE_KEY } from './config';
import { langganNaskah, ambilNaskah, muatTelaah, muatInitNaskah, segarkanNaskah } from './naskah';
import { susunKerja } from './utils/telaah';
import { navigasi } from './navigasi';

// Modul Naskah dan Telaah dimuat terpisah: tidak menambah berat pembukaan peta.
const NaskahPage = lazy(() => import('./pages/NaskahPage'));
const TelaahPage = lazy(() => import('./pages/TelaahPage'));
const DaftarKerjaPage = lazy(() => import('./pages/DaftarKerjaPage'));
const TurunanPage = lazy(() => import('./pages/TurunanPage'));

/** Halaman awal dari alamat: #naskah-45, #naskah, #telaah, #telaah-A1.1; selain itu peta. */
function halamanDariHash() {
  const h = decodeURIComponent(String(window.location.hash || ''));
  const m = /^#naskah(?:-(\d+))?$/.exec(h);
  if (m) return { halaman: 'naskah', pasal: m[1] ? Number(m[1]) : null };
  const t = /^#telaah(?:-(.+))?$/.exec(h);
  if (t) return { halaman: 'telaah', pasal: null, telaah: t[1] || 'ring' };
  if (h === '#kerja') return { halaman: 'kerja', pasal: null };
  if (h === '#turunan') return { halaman: 'turunan', pasal: null };
  return { halaman: 'peta', pasal: null };
}

/**
 * Dua halaman, satu pada satu waktu.
 *
 * Peta menjawab "alurnya sudah sesuai atau belum" dan memakai lebar penuh.
 * Rincian menjawab "alurnya bagaimana" dan juga memakai lebar penuh.
 * Saat kembali dari rincian, penyaring, posisi gulir, dan baris terpilih
 * dipulihkan persis, sehingga berpindah bolak-balik tidak terasa mahal.
 *
 * Versi 4.9: dua halaman tambahan, Naskah dan Uji Kecocokan, dipilih lewat menu
 * pada bilah atas. Riwayat peramban menyimpan halaman, urusan, dan pasal.
 * Versi 5.0: Uji Kecocokan diganti Telaah (berangkat dari urusan peta 2026).
 * Versi 5.3: sakelar ruang Rapat / Kerja untuk seluruh aplikasi (diingat per perangkat, awal: Rapat);
 * halaman Daftar kerja (hanya ruang Kerja) menggantikan angka-angka pada bilah atas.
 * Versi 5.4: Daftar kerja menjadi halaman Periksa (tujuan, patokan selesai, dan tindakan per butir).
 */
function bacaFilterTersimpan() {
  try {
    const s = window.localStorage.getItem(STORAGE_KEY.FILTER);
    return s ? Object.assign({}, FILTER_KOSONG, JSON.parse(s)) : FILTER_KOSONG;
  } catch (e) {
    return FILTER_KOSONG;
  }
}

export default function App() {
  const { cfg, memuat: memuatCfg, galat: galatCfg, muatUlang: muatCfg } = useBootstrap();
  const { urusan, format, pilihan, kelompok, memuat: memuatData, menyegarkan, galat: galatData, segarkan, simpan } = useData();

  const [idTerpilih, setIdTerpilih] = useState(null);
  const awalHalaman = useRef(halamanDariHash()).current;
  const [halaman, setHalaman] = useState(awalHalaman.halaman);
  const [pasalNaskah, setPasalNaskah] = useState(awalHalaman.pasal);
  const [selTelaah, setSelTelaah] = useState(awalHalaman.telaah || 'ring');
  const [saringNaskah, setSaringNaskah] = useState('semua');
  const [ruang, setRuangState] = useState(() => {
    try { return window.localStorage.getItem(STORAGE_KEY.RUANG) === 'kerja' ? 'kerja' : 'rapat'; } catch (e) { return 'rapat'; }
  });
  const [naskah, setNaskah] = useState(ambilNaskah);
  useEffect(() => langganNaskah(setNaskah), []);
  const [filter, setFilter] = useState(bacaFilterTersimpan);
  const [toast, setToast] = useState({ pesan: '', jenis: 'info' });
  const [bukaDiagnosa, setBukaDiagnosa] = useState(false);
  const [ringkas, setRingkas] = useState(() => {
    try { return window.localStorage.getItem(STORAGE_KEY.RINGKAS) !== '0'; } catch (e) { return true; }
  });
  const [tampilLama, setTampilLama] = useState(() => {
    try { return window.localStorage.getItem(STORAGE_KEY.LAMA) !== '0'; } catch (e) { return true; }
  });
  const [tampilPasal, setTampilPasal] = useState(() => {
    try { return window.localStorage.getItem(STORAGE_KEY.PASAL) === '1'; } catch (e) { return false; }
  });

  // Kelompok yang dilipat pada peta (v4.2); disimpan per peramban.
  const [tutup, setTutup] = useState(() => {
    try { return new Set(JSON.parse(window.localStorage.getItem(STORAGE_KEY.TUTUP) || '[]')); } catch (e) { return new Set(); }
  });
  const lipat = useCallback((kode) => {
    setTutup((s) => {
      const n = new Set(s);
      if (n.has(kode)) n.delete(kode); else n.add(kode);
      try { window.localStorage.setItem(STORAGE_KEY.TUTUP, JSON.stringify(Array.from(n))); } catch (e) { /* abaikan */ }
      return n;
    });
  }, []);

  // Posisi gulir tabel peta, dipulihkan saat kembali dari rincian.
  const gulirRef = useRef(0);
  // Diisi halaman rincian; dipakai memaksa simpan sebelum berpindah.
  const flushRef = useRef(null);

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY.FILTER, JSON.stringify(filter)); } catch (e) { /* abaikan */ }
  }, [filter]);

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY.RINGKAS, ringkas ? '1' : '0'); } catch (e) { /* abaikan */ }
  }, [ringkas]);

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY.LAMA, tampilLama ? '1' : '0'); } catch (e) { /* abaikan */ }
  }, [tampilLama]);

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY.PASAL, tampilPasal ? '1' : '0'); } catch (e) { /* abaikan */ }
  }, [tampilPasal]);

  // Tombol Back peramban. Perubahan tertunda tetap dikirim lebih dulu.
  useEffect(() => {
    try { window.history.replaceState({ id: null, halaman: awalHalaman.halaman, pasal: awalHalaman.pasal, telaah: awalHalaman.telaah || null }, '', window.location.hash || '#peta'); } catch (e) { /* abaikan */ }
    const onPop = (e) => {
      // Alamat yang diketik langsung (mis. #naskah-45) tidak membawa state: baca dari hash.
      const st = e.state || Object.assign({ id: null }, halamanDariHash());
      const terapkan = () => {
        setIdTerpilih(st.id || null);
        setHalaman(st.halaman || 'peta');
        if (st.pasal) setPasalNaskah(st.pasal);
        if (st.telaah) setSelTelaah(st.telaah);
      };
      const kirim = flushRef.current;
      if (kirim) { Promise.resolve(kirim()).then(terapkan); }
      else terapkan();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const indeksOrgan = useMemo(() => buatIndeksOrgan(cfg ? cfg.organ : []), [cfg]);

  // Format rancangan: dari data (readAll) lebih dulu, lalu dari bootstrap.
  const formatAras = String(format || (cfg && cfg.format) || '').toUpperCase() === 'ARAS';
  const ctx = useMemo(() => buatKonteksAras(cfg), [cfg]);

  const mode = cfg ? String(cfg.app.MODE_URUSAN || 'SEMUA').toUpperCase() : 'SEMUA';
  const organSorot = cfg ? String(cfg.app.ORGAN_SOROT || '').trim() : '';

  // Daftar tersaring dihitung di sini juga, supaya tombol pindah pada halaman
  // rincian mengikuti penyaring yang sedang aktif, bukan seluruh daftar urusan.
  const daftar = useMemo(
    () => saringUrusan(urusan, filter, mode, organSorot, formatAras ? ctx : null),
    [urusan, filter, mode, organSorot, formatAras, ctx]
  );

  const posisi = useMemo(
    () => daftar.findIndex((u) => String(u.id) === String(idTerpilih)),
    [daftar, idTerpilih]
  );

  const item = useMemo(
    () => urusan.find((u) => String(u.id) === String(idTerpilih)) || null,
    [urusan, idTerpilih]
  );

  const bukaRincian = useCallback((u) => {
    setIdTerpilih(u.id);
    setHalaman('peta');
    window.history.pushState({ id: u.id, halaman: 'peta' }, '', '#urusan-' + u.id);
  }, []);

  const kembaliKePeta = useCallback(() => {
    setIdTerpilih(null);
    setHalaman('peta');
    window.history.pushState({ id: null, halaman: 'peta' }, '', '#peta');
  }, []);

  /** Perubahan editor yang masih menunggu dikirim lebih dulu sebelum berpindah halaman. */
  const sesudahSimpan = useCallback(async (fn) => {
    const kirim = flushRef.current;
    if (kirim) { try { await kirim(); } catch (e) { /* galat simpan sudah ditampilkan editor */ } }
    fn();
  }, []);

  const bukaNaskah = useCallback((pasal) => {
    sesudahSimpan(() => {
      setIdTerpilih(null);
      setHalaman('naskah');
      if (pasal) setPasalNaskah(Number(pasal));
      const p = pasal || null;
      window.history.pushState({ id: null, halaman: 'naskah', pasal: p }, '', p ? '#naskah-' + p : '#naskah');
    });
  }, [sesudahSimpan]);

  const pilihPasal = useCallback((pasal, ganti) => {
    setPasalNaskah(Number(pasal));
    const st = { id: null, halaman: 'naskah', pasal: Number(pasal) };
    if (ganti) window.history.replaceState(st, '', '#naskah-' + pasal);
    else window.history.pushState(st, '', '#naskah-' + pasal);
  }, []);

  const bukaTelaah = useCallback((sel) => {
    sesudahSimpan(() => {
      const t = sel || selTelaah || 'ring';
      setIdTerpilih(null);
      setHalaman('telaah');
      setSelTelaah(t);
      window.history.pushState({ id: null, halaman: 'telaah', telaah: t }, '', t === 'ring' ? '#telaah' : '#telaah-' + encodeURIComponent(t));
    });
  }, [sesudahSimpan, selTelaah]);

  const pilihTelaah = useCallback((t) => {
    setSelTelaah(t);
    window.history.pushState({ id: null, halaman: 'telaah', telaah: t }, '', t === 'ring' ? '#telaah' : '#telaah-' + encodeURIComponent(t));
  }, []);

  /** Dari Daftar kerja: membuka halaman Naskah dengan saringan pasal tertentu. */
  const bukaSaringNaskah = useCallback((saring, pasal) => {
    setSaringNaskah(saring || 'semua');
    bukaNaskah(pasal || pasalNaskah);
  }, [bukaNaskah, pasalNaskah]);

  const bukaKerja = useCallback(() => {
    sesudahSimpan(() => {
      setIdTerpilih(null);
      setHalaman('kerja');
      window.history.pushState({ id: null, halaman: 'kerja' }, '', '#kerja');
    });
  }, [sesudahSimpan]);

  /** v5.5: halaman Dokumen Turunan (kedua ruang; disunting hanya di ruang Kerja). */
  const bukaTurunan = useCallback(() => {
    sesudahSimpan(() => {
      setIdTerpilih(null);
      setHalaman('turunan');
      window.history.pushState({ id: null, halaman: 'turunan' }, '', '#turunan');
    });
  }, [sesudahSimpan]);

  /** Sakelar ruang. Daftar kerja hanya ada di ruang Kerja; bila berpindah ke Rapat, kembali ke Naskah. */
  const setRuang = useCallback((r) => {
    setRuangState(r);
    try { window.localStorage.setItem(STORAGE_KEY.RUANG, r); } catch (e) { /* abaikan */ }
    if (r === 'rapat' && halaman === 'kerja') bukaNaskah(pasalNaskah);
  }, [halaman, bukaNaskah, pasalNaskah]);

  const bukaPeta = useCallback(() => {
    sesudahSimpan(() => kembaliKePeta());
  }, [sesudahSimpan, kembaliKePeta]);

  const bukaUrusanId = useCallback((id) => {
    const u = urusan.find((x) => String(x.id) === String(id));
    if (!u) { setToast({ pesan: 'Urusan ' + id + ' tidak ditemukan pada peta.', jenis: 'galat' }); return; }
    sesudahSimpan(() => bukaRincian(u));
  }, [urusan, sesudahSimpan, bukaRincian]);

  useEffect(() => {
    navigasi.bukaNaskah = bukaNaskah;
    navigasi.bukaUrusan = bukaUrusanId;
    return () => { navigasi.bukaNaskah = null; navigasi.bukaUrusan = null; };
  }, [bukaNaskah, bukaUrusanId]);

  // Angka telaah pada bilah atas: dibaca sesudah peta tergambar, tidak menunda pembukaan.
  const adaCfg = !!cfg;
  useEffect(() => {
    if (!adaCfg) return undefined;
    const t = window.setTimeout(() => {
      muatTelaah().catch(() => {});
      // Angka halaman Periksa (ruang Kerja) membutuhkan daftar pasal.
      if (ruang === 'kerja') muatInitNaskah().catch(() => {});
    }, 1500);
    return () => window.clearTimeout(t);
  }, [adaCfg, ruang]);

  const onSegarkan = useCallback(async () => {
    try {
      // Pastikan perubahan editor yang masih menunggu autosave diselesaikan
      // sebelum cache dibersihkan dan data dibaca ulang.
      if (flushRef.current) await flushRef.current();

      // Satu panggilan saja. useBootstrap dan useData memakai store global yang
      // sama, sehingga segarkan() sudah memperbarui konfigurasi + data sekaligus.
      await segarkan();
      // Cache naskah di server ikut dibersihkan oleh clearCache; salinan di layar dibaca ulang.
      try { await segarkanNaskah(); } catch (e) { /* modul naskah belum terpasang: abaikan */ }

      const waktu = new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
      setToast({
        pesan: 'Refresh berhasil. Data terbaru dibaca dari sheet pada ' + waktu + '.',
        jenis: 'info'
      });
    } catch (e) {
      setToast({
        pesan: 'Refresh gagal: ' + ((e && e.message) || String(e)),
        jenis: 'galat'
      });
    }
  }, [segarkan]);

  /**
   * Dipanggil simpan otomatis. Karena berjalan tanpa perintah pengguna,
   * keberhasilan TIDAK memunculkan toast — penandanya sudah ada di halaman.
   * Yang tetap dimunculkan hanya hal yang perlu diketahui: langkah yang tidak
   * memiliki kolom penyimpanan.
   */
  const onSimpan = useCallback(async (muatan) => {
    const hasil = await simpan(muatan);
    const diabaikan = (hasil && hasil.diabaikan) || [];
    const dilewati = (hasil && hasil.dilewati) || [];
    if (dilewati.length) {
      setToast({
        pesan: dilewati.length + ' isian TIDAK tersimpan karena selnya berumus: ' + dilewati.join(', ') + '.',
        jenis: 'galat'
      });
    } else if (diabaikan.length) {
      setToast({
        pesan:
          diabaikan.length + ' langkah TIDAK tersimpan karena tidak memiliki kolom pada ' +
          'sheet rancangan: ' + diabaikan.join(', ') + '. Periksa Cfg_Kolom.',
        jenis: 'galat'
      });
    }
    return hasil;
  }, [simpan]);

  const galat = galatCfg || galatData;
  const memuat = memuatCfg || memuatData;
  const sedangRefresh = Boolean(menyegarkan);

  if (memuat && !cfg) {
    return <div className="layar-pesan">Membaca konfigurasi dari Spreadsheet…</div>;
  }

  if (galatCfg && !cfg) {
    return (
      <div className="layar-pesan layar-galat">
        <p><strong>Gagal membaca konfigurasi.</strong></p>
        <p>{galatCfg}</p>
        <p className="kecil">
          Periksa API_URL pada config.js, dan pastikan deployment Apps Script sudah dibuat
          ulang setelah Code.gs diganti versi 4.0.0.
        </p>
        <button className="tbl" onClick={muatCfg}>Coba lagi</button>
      </div>
    );
  }

  const judulMenu = (k, cadangan) => String(cfg.app[k] || cadangan);
  const menu = [
    { kode: 'peta', label: judulMenu('JUDUL_MODUL_PETA', 'Peta'), aktif: halaman === 'peta', onClick: bukaPeta },
    { kode: 'naskah', label: judulMenu('JUDUL_MODUL_NASKAH', 'Naskah'), aktif: halaman === 'naskah', onClick: () => bukaNaskah(pasalNaskah) },
    { kode: 'telaah', label: judulMenu('JUDUL_MODUL_TELAAH', 'Telaah'), aktif: halaman === 'telaah', onClick: () => bukaTelaah() },
    { kode: 'turunan', label: judulMenu('JUDUL_MODUL_TURUNAN', 'Dokumen Turunan'), aktif: halaman === 'turunan', onClick: bukaTurunan }
  ];
  if (ruang === 'kerja') {
    const terbuka = susunKerja(naskah).filter((x) => x.jumlah > 0).length;
    menu.push({ kode: 'kerja', label: 'Periksa', aktif: halaman === 'kerja', onClick: bukaKerja, jumlah: terbuka });
  }
  const halamanLain = halaman !== 'peta';
  const muatModul = <div className="halaman"><div className="nk-muat">Membuka halaman…</div></div>;

  return (
    <div className={'app' + (item || halamanLain ? ' app-rincian' : '')}>
      <TopBar
        judul={String(cfg.app.NAMA_APLIKASI || 'Peta Bisnis')}
        subJudul={item || halamanLain ? '' : String(cfg.app.SUB_JUDUL || '')}
        onSegarkan={onSegarkan}
        onDiagnosa={() => setBukaDiagnosa(true)}
        sedangMuat={memuat || sedangRefresh}
        kembali={null}
        menu={menu}
        ruang={ruang}
        onRuang={setRuang}
      />

      {galat ? <div className="galat-bar">{galat}</div> : null}

      {halaman === 'naskah' ? (
        <Suspense fallback={muatModul}>
          <NaskahPage pasal={pasalNaskah} onPilihPasal={pilihPasal} onBukaUrusan={bukaUrusanId} onTelaah={bukaTelaah}
                      urusan={urusan} ctx={ctx} saring={saringNaskah} setSaring={setSaringNaskah} ruang={ruang}
                      onGalat={(m) => setToast({ pesan: m, jenis: 'galat' })} />
        </Suspense>
      ) : halaman === 'kerja' && ruang === 'kerja' ? (
        <Suspense fallback={muatModul}>
          <DaftarKerjaPage onBukaTelaah={bukaTelaah} onBukaNaskah={bukaSaringNaskah} urusan={urusan}
                           onGalat={(m) => setToast({ pesan: m, jenis: 'galat' })} />
        </Suspense>
      ) : halaman === 'turunan' ? (
        <Suspense fallback={muatModul}>
          <TurunanPage ruang={ruang} onBukaPasal={bukaNaskah} onBukaTelaah={bukaTelaah}
                       onGalat={(m) => setToast({ pesan: m, jenis: 'galat' })} />
        </Suspense>
      ) : halaman === 'telaah' ? (
        <Suspense fallback={muatModul}>
          <TelaahPage sel={selTelaah} onPilih={pilihTelaah} judul={judulMenu('JUDUL_MODUL_TELAAH', 'Telaah')}
                      onBukaPasal={bukaNaskah} onBukaUrusan={bukaUrusanId}
                      urusan={urusan} ctx={ctx} kelompok={kelompok} ruang={ruang}
                      onGalat={(m) => setToast({ pesan: m, jenis: 'galat' })} />
        </Suspense>
      ) : item && formatAras ? (
        <EditorArasPage
          key={item.id}
          cfg={cfg}
          ctx={ctx}
          pilihan={pilihan}
          kelompok={kelompok}
          item={item}
          indeksOrgan={indeksOrgan}
          urutan={posisi >= 0 ? posisi + 1 : 1}
          jumlah={daftar.length || 1}
          sebelum={posisi > 0 ? daftar[posisi - 1] : null}
          sesudah={posisi >= 0 && posisi < daftar.length - 1 ? daftar[posisi + 1] : null}
          onSimpan={onSimpan}
          onKembali={kembaliKePeta}
          onPindah={bukaRincian}
          onGalat={(m) => setToast({ pesan: m, jenis: 'galat' })}
          onInfo={(m) => setToast({ pesan: m, jenis: 'info' })}
          ringkas={ringkas}
          flushRef={flushRef}
        />
      ) : item ? (
        <EditorPage
          key={item.id}
          cfg={cfg}
          item={item}
          indeksOrgan={indeksOrgan}
          urutan={posisi >= 0 ? posisi + 1 : 1}
          jumlah={daftar.length || 1}
          sebelum={posisi > 0 ? daftar[posisi - 1] : null}
          sesudah={posisi >= 0 && posisi < daftar.length - 1 ? daftar[posisi + 1] : null}
          onSimpan={onSimpan}
          onKembali={kembaliKePeta}
          onPindah={bukaRincian}
          onGalat={(m) => setToast({ pesan: m, jenis: 'galat' })}
          flushRef={flushRef}
        />
      ) : (
        <PetaPage
          cfg={cfg}
          urusan={urusan}
          indeksOrgan={indeksOrgan}
          filter={filter}
          setFilter={setFilter}
          ringkas={ringkas}
          setRingkas={setRingkas}
          idTerpilih={idTerpilih}
          gulirRef={gulirRef}
          onPilih={bukaRincian}
          formatAras={formatAras}
          ctx={ctx}
          pilihan={pilihan}
          tampilLama={tampilLama}
          setTampilLama={setTampilLama}
          tampilPasal={tampilPasal}
          setTampilPasal={setTampilPasal}
          kelompok={kelompok}
          tutup={tutup}
          onLipat={lipat}
        />
      )}

      {bukaDiagnosa ? <DiagnosaPanel onTutup={() => setBukaDiagnosa(false)} /> : null}

      <Toast
        pesan={toast.pesan}
        jenis={toast.jenis}
        onTutup={() => setToast({ pesan: '', jenis: 'info' })}
      />
    </div>
  );
}
