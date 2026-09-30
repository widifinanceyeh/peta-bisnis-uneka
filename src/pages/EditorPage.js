import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GridAksi from '../components/GridAksi';
import KartuAlur from '../components/KartuAlur';
import PenandaSimpan from '../components/PenandaSimpan';
import useSimpanOtomatis from '../hooks/useSimpanOtomatis';
import { nomoriUlang, samaPersis } from '../utils/langkah';
import { butirMonev } from '../utils/monev';
import { bacaAturanTuang, barisLuarStatuta } from '../utils/tuang';
import { ambilKombinasi, aksiDipakai, organDipakai } from '../utils/kolom';
import { JEDA_SIMPAN_MS, STORAGE_KEY } from '../config';

/**
 * Halaman rincian satu urusan. Memakai lebar layar penuh.
 *
 * Alasan memakai halaman penuh, bukan panel samping: kartu alur terbentang
 * MENDATAR dari langkah pertama sampai terakhir, dan grid organ kali aras
 * juga lebar. Keduanya kehilangan keterbacaan bila dipaksa masuk kolom sempit.
 * Peta menjawab pertanyaan "sudah sesuai atau belum"; halaman ini menjawab
 * "alurnya bagaimana". Dua pekerjaan berbeda, dua layar berbeda.
 *
 * Tidak ada tombol Simpan. Setiap perubahan dikirim otomatis sesudah jeda,
 * dan pengiriman dipaksa selesai sebelum berpindah halaman, sehingga
 * berpindah tidak pernah membuang perubahan.
 */
export default function EditorPage({
  cfg, item, indeksOrgan, urutan, jumlah, sebelum, sesudah,
  onSimpan, onKembali, onPindah, onGalat, flushRef
}) {
  const [steps, setSteps] = useState({});
  const [catatan, setCatatan] = useState('');
  const [oleh, setOleh] = useState('');
  const [tanggal, setTanggal] = useState('');

  const jeda = Number(cfg.app.JEDA_SIMPAN_MS) > 0
    ? Number(cfg.app.JEDA_SIMPAN_MS)
    : JEDA_SIMPAN_MS;

  const { status, galat, jadwalkan, paksa, tetapkanAcuan, adaTertunda } =
    useSimpanOtomatis(onSimpan, jeda, onGalat);

  const idAktifRef = useRef(null);
  const siapRef = useRef(false);

  // Keadaan halaman di-set ulang HANYA ketika urusan yang dibuka berganti.
  // Kalau dipicu perubahan objek item, hasil klik yang sedang dalam perjalanan
  // ke sheet akan tertimpa balik oleh jawaban lama.
  useEffect(() => {
    siapRef.current = false;
    const awal = {
      id: item.id,
      steps: nomoriUlang(item.baru || {}),
      catatan: item.catatan || '',
      oleh: item.oleh || '',
      tanggal: item.tanggal || ''
    };
    setSteps(awal.steps);
    setCatatan(awal.catatan);
    setOleh(awal.oleh);
    setTanggal(awal.tanggal);
    tetapkanAcuan(awal);
    idAktifRef.current = item.id;
    window.scrollTo(0, 0);
    const t = window.setTimeout(() => { siapRef.current = true; }, 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  const muatan = useMemo(
    () => ({ id: item.id, steps, catatan, oleh, tanggal }),
    [item.id, steps, catatan, oleh, tanggal]
  );

  useEffect(() => {
    if (!siapRef.current) return;
    if (idAktifRef.current !== item.id) return;
    jadwalkan(muatan);
  }, [muatan, jadwalkan, item.id]);

  // Halaman induk memakai ini untuk memaksa pengiriman sebelum berpindah.
  useEffect(() => {
    if (!flushRef) return undefined;
    flushRef.current = async () => { if (adaTertunda()) await paksa(); };
    return () => { flushRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flushRef, paksa]);

  useEffect(() => {
    const onSembunyi = () => {
      if (document.visibilityState === 'hidden' && adaTertunda()) paksa();
    };
    document.addEventListener('visibilitychange', onSembunyi);
    return () => document.removeEventListener('visibilitychange', onSembunyi);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paksa]);

  useEffect(() => {
    if (!oleh) return;
    try { window.localStorage.setItem(STORAGE_KEY.OLEH, oleh); } catch (e) { /* abaikan */ }
  }, [oleh]);

  const pindah = useCallback(async (tujuan) => {
    if (!tujuan) return;
    if (adaTertunda()) await paksa();
    onPindah(tujuan);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paksa, onPindah]);

  const kembali = useCallback(async () => {
    if (adaTertunda()) await paksa();
    onKembali();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paksa, onKembali]);

  // Panah kiri dan kanan berpindah urusan selama fokus tidak di dalam isian.
  useEffect(() => {
    const onTombol = (e) => {
      const t = e.target && e.target.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
      if (e.key === 'ArrowLeft') pindah(sebelum);
      if (e.key === 'ArrowRight') pindah(sesudah);
      if (e.key === 'Escape') kembali();
    };
    window.addEventListener('keydown', onTombol);
    return () => window.removeEventListener('keydown', onTombol);
  }, [pindah, kembali, sebelum, sesudah]);

  const indeksAksi = useMemo(() => {
    const idx = {};
    cfg.aksi.forEach((a) => { idx[a.kode] = a; });
    return idx;
  }, [cfg.aksi]);

  const kombRancangan = useMemo(() => ambilKombinasi(cfg, 'RANCANGAN'), [cfg]);
  const organGrid = useMemo(() => organDipakai(cfg.organ, kombRancangan), [cfg.organ, kombRancangan]);
  const aksiGrid = useMemo(() => aksiDipakai(cfg.aksi, kombRancangan), [cfg.aksi, kombRancangan]);

  const salinDariLama = () => {
    const sumber = item.lama || {};
    const tersaring = {};
    Object.keys(sumber).forEach((k) => {
      if (typeof sumber[k] === 'number' && kombRancangan.has(k)) tersaring[k] = sumber[k];
    });
    const dibuang = Object.keys(sumber).filter(
      (k) => typeof sumber[k] === 'number' && !kombRancangan.has(k)
    );
    setSteps(nomoriUlang(tersaring));
    if (dibuang.length && onGalat) {
      onGalat(
        dibuang.length + ' langkah tidak ikut disalin karena tidak ada kolomnya pada rancangan: ' +
        dibuang.join(', ') + '.'
      );
    }
  };

  const isiNamaTersimpan = () => {
    try {
      const v = window.localStorage.getItem(STORAGE_KEY.OLEH);
      if (v) setOleh(v);
    } catch (e) { /* abaikan */ }
  };

  const aturan = useMemo(() => bacaAturanTuang(cfg), [cfg]);
  const luar = barisLuarStatuta(aturan, item);

  const tanpaPadanan = item.adaDiSumber === false;
  const butir = butirMonev(item.monev);
  const sama = samaPersis(steps, item.lama || {});

  return (
    <div className="halaman halaman-rincian">

      <div className="rincian-bar">
        <button className="tbl tbl-ringan" onClick={kembali}>‹ Kembali ke peta</button>

        <div className="rincian-pindah">
          <button className="tbl tbl-ringan" onClick={() => pindah(sebelum)}
                  disabled={!sebelum}
                  title={sebelum ? 'Urusan ' + sebelum.id + ' — ' + sebelum.urusan : 'Sudah di urusan pertama'}>
            ‹
          </button>
          <span className="rincian-urutan">{urutan} dari {jumlah}</span>
          <button className="tbl tbl-ringan" onClick={() => pindah(sesudah)}
                  disabled={!sesudah}
                  title={sesudah ? 'Urusan ' + sesudah.id + ' — ' + sesudah.urusan : 'Sudah di urusan terakhir'}>
            ›
          </button>
        </div>

        <PenandaSimpan status={status} galat={galat} />
      </div>

      <div className="rincian-kepala">
        <div className="rincian-no">Urusan {item.id}</div>
        <h2 className="rincian-judul">{item.urusan}</h2>
      </div>

      <div className="fakta">
        {item.bidang ? <Fakta label="Bidang" nilai={item.bidang} /> : null}
        {item.butir ? <Fakta label="Butir Lampiran Permen 16/2018" nilai={item.butir} /> : null}
        {item.muatan ? <Fakta label="Sumber muatan" nilai={item.muatan} tebal /> : null}
        {item.status ? <Fakta label="Status pengaturan Statuta 2025" nilai={item.status} /> : null}
        {item.statusRancangan ? <Fakta label="Status penyelarasan" nilai={item.statusRancangan} /> : null}
        {item.pasal ? (
          <Fakta label="Dasar pasal Statuta 2025"
                 nilai={String(item.pasal).replace(/\s*\n\s*/g, ' ')} lebar />
        ) : null}
        {item.produk ? <Fakta label="Bentuk produk hukum turunan" nilai={item.produk} lebar /> : null}
      </div>

      {butir ? (
        <div className="peringatan peringatan-kunci">
          <strong>Penomoran terkunci Monev — {butir}.</strong> Rumusan boleh diperbaiki di
          tempat, tetapi nomor pasal dan ayat pada baris ini tidak boleh bergeser. Penambahan
          dilakukan sebagai ayat atau huruf baru di akhir pasal.
        </div>
      ) : null}

      {luar ? (
        <div className="peringatan peringatan-luar">
          <strong>Tidak dituangkan ke dalam Statuta.</strong> Urusan ini sudah diatur Anggaran
          Dasar atau Anggaran Rumah Tangga dan hanya mengikat organ Yayasan. Barisnya disimpan
          sebagai catatan letak kewenangan. Ketiadaan pengulangan dalam Statuta bukan kekosongan.
        </div>
      ) : null}

      {tanpaPadanan ? (
        <div className="peringatan peringatan-info">
          Urusan tambahan. Tidak ada padanannya pada tab Statuta 2025, sehingga blok kondisi
          lama memang kosong.
        </div>
      ) : null}

      <div className="kartu-baris">
        <KartuAlur
          judul={String(cfg.app.LABEL_BLOK_LAMA || 'STATUTA LAMA')}
          steps={item.lama}
          indeksOrgan={indeksOrgan}
          indeksAksi={indeksAksi}
          aturan={aturan}
          barisLuar={luar}
        />
        <KartuAlur
          judul={String(cfg.app.LABEL_BLOK_BARU || 'RANCANGAN')}
          steps={steps}
          indeksOrgan={indeksOrgan}
          indeksAksi={indeksAksi}
          aturan={aturan}
          barisLuar={luar}
          putus
        />
      </div>

      <div className="rincian-alat">
        <button className="tbl tbl-ringan" onClick={salinDariLama} disabled={tanpaPadanan}
                title={tanpaPadanan ? 'Urusan ini tidak ada pada Statuta 2025' : 'Salin susunan langkah dari kondisi lama'}>
          Salin dari kondisi lama
        </button>
        <button className="tbl tbl-ringan" onClick={() => setSteps({})}>Kosongkan</button>
        {sama && !tanpaPadanan ? <span className="tanda-sama">alur sama dengan Statuta 2025</span> : null}
      </div>

      <GridAksi
        organ={organGrid}
        aksi={aksiGrid}
        steps={steps}
        setSteps={setSteps}
        kombinasi={kombRancangan}
      />

      <div className="rincian-catatan">
        <label className="catatan-utama">
          <span>Catatan perubahan</span>
          <textarea className="inp" rows={3} value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    placeholder="Alasan atau dasar keputusan" />
        </label>
        <label>
          <span>Diputuskan pada</span>
          <input className="inp" type="date" value={tanggal}
                 onChange={(e) => setTanggal(e.target.value)} />
        </label>
        <label>
          <span>Oleh</span>
          <input className="inp" type="text" value={oleh}
                 onChange={(e) => setOleh(e.target.value)}
                 onFocus={() => { if (!oleh) isiNamaTersimpan(); }}
                 placeholder="Forum atau nama" />
        </label>
      </div>

      <div className="rincian-kaki">
        <button className="tbl tbl-ringan" onClick={kembali}>‹ Kembali ke peta</button>
        <span className="kecil rincian-bantuan">
          Perubahan tersimpan sendiri. Panah kiri dan kanan berpindah urusan, Esc kembali ke peta.
        </span>
      </div>
    </div>
  );
}

function Fakta({ label, nilai, tebal, lebar }) {
  return (
    <div className={'fakta-item' + (lebar ? ' fakta-lebar' : '')}>
      <div className="fakta-label">{label}</div>
      <div className={'fakta-nilai' + (tebal ? ' tebal' : '')}>{nilai}</div>
    </div>
  );
}
