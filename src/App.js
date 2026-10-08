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
import { langganNaskah, ambilNaskah, muatTelaah, muatInitNaskah, segarkanNaskah, mulaiPaket } from './naskah';
import { susunKerja } from './utils/telaah';
import { navigasi } from './navigasi';
import { adaPasal } from './utils/rujukan';

// Modul Naskah dan Telaah dimuat terpisah: tidak menambah berat pembukaan peta.
const NaskahPage = lazy(() => import('./pages/NaskahPage'));
const TelaahPage = lazy(() => import('./pages/TelaahPage'));
const DaftarKerjaPage = lazy(() => import('./pages/DaftarKerjaPage'));
const TurunanPage = lazy(() => import('./pages/TurunanPage'));

/**
 * Halaman awal dari alamat: #naskah-45, #naskah, #telaah, #telaah-A1.1, #turunan-DT02, #kerja-kode, #urusan-A1.1;
 * selain itu peta.
 */
function halamanDariHash() {
  let h = '';
  try { h = decodeURIComponent(String(window.location.hash || '')); } catch (e) { h = String(window.location.hash || ''); }
  const m = /^#naskah(?:-(\d+))?$/.exec(h);
  if (m) return { halaman: 'naskah', pasal: m[1] ? Number(m[1]) : null };
  const t = /^#telaah(?:-(.+))?$/.exec(h);
  if (t) return { halaman: 'telaah', pasal: null, telaah: t[1] || 'ring' };
  const k = /^#kerja(?:-(.+))?$/.exec(h);
  if (k) return { halaman: 'kerja', pasal: null, kerja: k[1] || '' };
  const d = /^#turunan(?:-(.+))?$/.exec(h);
  if (d) return { halaman: 'turunan', pasal: null, turunan: d[1] || '' };
  const u = /^#urusan-(.+)$/.exec(h);
  if (u) return { halaman: 'peta', pasal: null, id: u[1] };
  return { halaman: 'peta', pasal: null };
}

/**
 * v5.8: dibuka tanpa alamat halaman (tautan utama aplikasi) = lanjut dari posisi terakhir di perangkat ini.
 * Alamat yang dibawa tautan (mis. #naskah-45 kiriman rekan) selalu didahulukan.
 */
function halamanAwal() {
  try {
    if (!window.location.hash) {
      const s = window.localStorage.getItem(STORAGE_KEY.POSISI);
      if (s && /^#[a-z]/.test(s)) window.history.replaceState(window.history.state, '', s);
    }
  } catch (e) { /* abaikan */ }
  return halamanDariHash();
}

/** v5.8: nomor langkah riwayat di dalam aplikasi; 0 = halaman pertama yang dibuka. */
function langkahKini() {
  try { const s = window.history.state; return s && typeof s.n === 'number' ? s.n : 0; } catch (e) { return 0; }
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

  const awalHalaman = useRef(null);
  if (!awalHalaman.current) awalHalaman.current = halamanAwal();
  const awal = awalHalaman.current;
  const [idTerpilih, setIdTerpilih] = useState(awal.id || null);
  const [halaman, setHalaman] = useState(awal.halaman);
  const [pasalNaskah, setPasalNaskah] = useState(awal.pasal);
  const [selTelaah, setSelTelaah] = useState(awal.telaah || 'ring');
  const [selTurunan, setSelTurunan] = useState(awal.turunan || '');   // v5.8: dokumen turunan terpilih
  const [selKerja, setSelKerja] = useState(awal.kerja || '');         // v5.8: butir Periksa terpilih
  const [langkah, setLangkah] = useState(langkahKini);               // v5.8: tombol Kembali pada bilah atas

  /** Riwayat peramban: setiap langkah di dalam aplikasi diberi nomor (n) supaya tombol Kembali tahu batasnya. */
  const dorong = useCallback((st, url) => {
    const n = langkahKini() + 1;
    window.history.pushState(Object.assign({}, st, { n }), '', url);
    setLangkah(n);
  }, []);
  const gantiRiwayat = useCallback((st, url) => {
    window.history.replaceState(Object.assign({}, st, { n: langkahKini() }), '', url);
  }, []);
  const [saringNaskah, setSaringNaskah] = useState('semua');
  const [ruang, setRuangState] = useState('kerja');   // selalu dibuka di Mode kerja
  const [naskah, setNaskah] = useState(ambilNaskah);
  useEffect(() => langganNaskah(setNaskah), []);
  // v5.6: paket Naskah dari peramban lebih dulu, lalu pemeriksaan versi di latar.
  useEffect(() => { mulaiPaket(); }, []);
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
    try {
      window.history.replaceState({ id: awal.id || null, halaman: awal.halaman, pasal: awal.pasal, telaah: awal.telaah || null,
        turunan: awal.turunan || null, kerja: awal.kerja || null, n: langkahKini() }, '', window.location.hash || '#peta');
    } catch (e) { /* abaikan */ }
    const onPop = (e) => {
      // Alamat yang diketik langsung (mis. #naskah-45) tidak membawa state: baca dari hash.
      const st = e.state || Object.assign({ id: null }, halamanDariHash());
      const terapkan = () => {
        setIdTerpilih(st.id || null);
        setHalaman(st.halaman || 'peta');
        if (adaPasal(st.pasal)) setPasalNaskah(st.pasal);
        if (st.telaah) setSelTelaah(st.telaah);
        if (st.turunan !== undefined) setSelTurunan(st.turunan || '');
        if (st.kerja !== undefined) setSelKerja(st.kerja || '');
        setLangkah(typeof st.n === 'number' ? st.n : 0);
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
    dorong({ id: u.id, halaman: 'peta' }, '#urusan-' + u.id);
  }, [dorong]);

  const kembaliKePeta = useCallback(() => {
    setIdTerpilih(null);
    setHalaman('peta');
    dorong({ id: null, halaman: 'peta' }, '#peta');
  }, [dorong]);

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
      const p = adaPasal(pasal) ? Number(pasal) : null;      // v5.16: Pasal 0 = Pembukaan
      if (p !== null) setPasalNaskah(p);
      dorong({ id: null, halaman: 'naskah', pasal: p }, p !== null ? '#naskah-' + p : '#naskah');
    });
  }, [sesudahSimpan, dorong]);

  const pilihPasal = useCallback((pasal, ganti) => {
    setPasalNaskah(Number(pasal));
    const st = { id: null, halaman: 'naskah', pasal: Number(pasal) };
    if (ganti) gantiRiwayat(st, '#naskah-' + pasal);
    else dorong(st, '#naskah-' + pasal);
  }, [dorong, gantiRiwayat]);

  const bukaTelaah = useCallback((sel) => {
    sesudahSimpan(() => {
      const t = sel || selTelaah || 'ring';
      setIdTerpilih(null);
      setHalaman('telaah');
      setSelTelaah(t);
      dorong({ id: null, halaman: 'telaah', telaah: t }, t === 'ring' ? '#telaah' : '#telaah-' + encodeURIComponent(t));
    });
  }, [sesudahSimpan, selTelaah, dorong]);

  const pilihTelaah = useCallback((t) => {
    setSelTelaah(t);
    dorong({ id: null, halaman: 'telaah', telaah: t }, t === 'ring' ? '#telaah' : '#telaah-' + encodeURIComponent(t));
  }, [dorong]);

  /** Dari Daftar kerja: membuka halaman Naskah dengan saringan pasal tertentu. */
  const bukaSaringNaskah = useCallback((saring, pasal) => {
    setSaringNaskah(saring || 'semua');
    bukaNaskah(adaPasal(pasal) ? pasal : pasalNaskah);
  }, [bukaNaskah, pasalNaskah]);

  const bukaKerja = useCallback(() => {
    sesudahSimpan(() => {
      setIdTerpilih(null);
      setHalaman('kerja');
      dorong({ id: null, halaman: 'kerja', kerja: selKerja }, selKerja ? '#kerja-' + encodeURIComponent(selKerja) : '#kerja');
    });
  }, [sesudahSimpan, dorong, selKerja]);

  /** v5.5: halaman Dokumen Turunan (kedua ruang; disunting hanya di ruang Kerja). */
  const bukaTurunan = useCallback(() => {
    sesudahSimpan(() => {
      setIdTerpilih(null);
      setHalaman('turunan');
      dorong({ id: null, halaman: 'turunan', turunan: selTurunan }, selTurunan ? '#turunan-' + encodeURIComponent(selTurunan) : '#turunan');
    });
  }, [sesudahSimpan, dorong, selTurunan]);

  /** v5.8: dokumen turunan dan butir Periksa yang dipilih ikut tercatat di riwayat (tombol Kembali, tautan, posisi terakhir). */
  const pilihTurunan = useCallback((id) => {
    setSelTurunan(id);
    dorong({ id: null, halaman: 'turunan', turunan: id }, id ? '#turunan-' + encodeURIComponent(id) : '#turunan');
  }, [dorong]);
  const pilihKerja = useCallback((kode) => {
    setSelKerja(kode);
    dorong({ id: null, halaman: 'kerja', kerja: kode }, kode ? '#kerja-' + encodeURIComponent(kode) : '#kerja');
  }, [dorong]);

  /** v5.9: dari Periksa (ayat delegasi, butir Monev) langsung ke satu dokumen turunan. */
  const bukaTurunanId = useCallback((id) => {
    sesudahSimpan(() => {
      setIdTerpilih(null);
      setHalaman('turunan');
      setSelTurunan(id || '');
      dorong({ id: null, halaman: 'turunan', turunan: id || '' }, id ? '#turunan-' + encodeURIComponent(id) : '#turunan');
    });
  }, [sesudahSimpan, dorong]);

  /** v5.9: lencana Monev (Naskah, Dokumen Turunan) membuka Periksa › Butir Monev pada butirnya; ruang Rapat beralih ke Kerja. */
  const bukaMonev = useCallback((butir) => {
    sesudahSimpan(() => {
      if (ruang !== 'kerja') {
        setRuangState('kerja');
        try { window.localStorage.setItem(STORAGE_KEY.RUANG, 'kerja'); } catch (e) { /* abaikan */ }
      }
      const kode = 'MONEV-' + butir;
      setIdTerpilih(null);
      setHalaman('kerja');
      setSelKerja(kode);
      dorong({ id: null, halaman: 'kerja', kerja: kode }, '#kerja-' + encodeURIComponent(kode));
    });
  }, [sesudahSimpan, dorong, ruang]);
  useEffect(() => { navigasi.bukaMonev = bukaMonev; return () => { navigasi.bukaMonev = null; }; }, [bukaMonev]);

  // v5.8: posisi terakhir disimpan per perangkat; dipakai bila aplikasi dibuka tanpa alamat halaman.
  useEffect(() => {
    try { if (window.location.hash) window.localStorage.setItem(STORAGE_KEY.POSISI, window.location.hash); } catch (e) { /* abaikan */ }
  }, [halaman, pasalNaskah, selTelaah, idTerpilih, selTurunan, selKerja]);

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
        memperbarui={!!naskah.memperbarui}
        kembali={langkah > 0 ? () => window.history.back() : null}
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
          <DaftarKerjaPage onBukaTelaah={bukaTelaah} onBukaNaskah={bukaSaringNaskah} onBukaTurunan={bukaTurunanId} onBukaUrusan={bukaUrusanId} urusan={urusan} ctx={ctx} pilih={selKerja} onPilih={pilihKerja}
                           onGalat={(m) => setToast({ pesan: m, jenis: 'galat' })} />
        </Suspense>
      ) : halaman === 'turunan' ? (
        <Suspense fallback={muatModul}>
          <TurunanPage ruang={ruang} onBukaPasal={bukaNaskah} onBukaTelaah={bukaTelaah} onBukaUrusan={bukaUrusanId} urusan={urusan} ctx={ctx}
                       pilih={selTurunan} onPilih={pilihTurunan}
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
