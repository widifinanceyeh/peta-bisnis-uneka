import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import KartuAlur from '../components/KartuAlur';
import KartuAras from '../components/KartuAras';
import FormAras from '../components/FormAras';
import PenandaSimpan from '../components/PenandaSimpan';
import useSimpanOtomatis from '../hooks/useSimpanOtomatis';
import { bacaDraf, tulisDraf, hapusDraf } from '../hooks/useDraf';
import { butirMonev } from '../utils/monev';
import { bacaAturanTuang, barisLuarStatuta } from '../utils/tuang';
import { adaPasalAras, arasBerbeda, arasDariLama, gabungOrgan, indeksKelompok, izinTulis, jumlahArasKosong, labelKelompok, tetap } from '../utils/aras';
import { JEDA_SIMPAN_MS, STORAGE_KEY } from '../config';

/**
 * Halaman rincian satu urusan untuk rancangan format LIMA KOLOM ARAS (v4).
 *
 * Yang dapat disunting mengikuti Cfg_App!RANC_KOLOM_TULIS di backend:
 * organ dan unit kelima aras, status bahasan, penuangan, catatan, tanggal,
 * oleh. Selebihnya tampil baca-saja. Simpan otomatis tetap memakai
 * useSimpanOtomatis yang sama dengan versi 3.
 *
 * Versi 4.2: kepala menyebut kelompok Permen 16/2018. Urusan MUATAN TETAP
 * diberi panel penjelasan; aras usul–sah-nya mengikuti C1.1.
 */
function arasAwal(item, aksi) {
  const out = {};
  aksi.forEach((a) => {
    const v = (item.aras || {})[a.kode] || {};
    out[a.kode] = { organ: String(v.organ || ''), unit: String(v.unit || ''), pasal: String(v.pasal || '') };
  });
  return out;
}

export default function EditorArasPage({
  cfg, ctx, pilihan, kelompok, item, indeksOrgan, urutan, jumlah, sebelum, sesudah,
  ringkas, onSimpan, onKembali, onPindah, onGalat, onInfo, flushRef
}) {
  const hanya2025 = item.adaDiSumber !== false && item.adaDiRancangan === false;

  const [aras, setAras] = useState({});
  const [statusBahasan, setStatusBahasan] = useState('');
  const [penuangan, setPenuangan] = useState('');
  const [catatan, setCatatan] = useState('');
  const [oleh, setOleh] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [dasarMuatan, setDasarMuatan] = useState('');
  const [alasanMuatan, setAlasanMuatan] = useState('');
  const [suntingMuatan, setSuntingMuatan] = useState(false);

  const jeda = Number(cfg.app.JEDA_SIMPAN_MS) > 0 ? Number(cfg.app.JEDA_SIMPAN_MS) : JEDA_SIMPAN_MS;
  const { status, galat, jadwalkan, paksa, tetapkanAcuan, adaTertunda, tandaiTertunda } = useSimpanOtomatis(onSimpan, jeda, onGalat);

  const idAktifRef = useRef(null);
  const siapRef = useRef(false);

  useEffect(() => {
    siapRef.current = false;
    const awal = {
      id: item.id,
      aras: arasAwal(item, ctx.aksi),
      statusBahasan: item.statusBahasan || '',
      penuangan: item.penuangan || '',
      catatan: item.catatan || '',
      oleh: item.oleh || '',
      tanggal: item.tanggal || '',
      dasarMuatan: item.dasarMuatan || '',
      alasanMuatan: item.alasanMuatan || ''
    };
    // v5.6: perubahan yang belum tersimpan (mis. simpan gagal lalu halaman ditutup) dipulihkan dari draf.
    const drafPeta = bacaDraf('urusan:' + item.id);
    const pulih = drafPeta && drafPeta.id === item.id && JSON.stringify(drafPeta) !== JSON.stringify(awal) ? drafPeta : null;
    const isi = pulih || awal;
    if (drafPeta && !pulih) hapusDraf('urusan:' + item.id);
    setAras(isi.aras);
    setDasarMuatan(isi.dasarMuatan);
    setAlasanMuatan(isi.alasanMuatan);
    setSuntingMuatan(false);
    setStatusBahasan(isi.statusBahasan);
    setPenuangan(isi.penuangan);
    setCatatan(isi.catatan);
    setOleh(isi.oleh);
    setTanggal(isi.tanggal);
    tetapkanAcuan(awal);
    if (pulih) tandaiTertunda(pulih, 'Perubahan yang belum tersimpan dipulihkan.');
    idAktifRef.current = item.id;
    window.scrollTo(0, 0);
    const t = window.setTimeout(() => { siapRef.current = true; }, 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  const muatanTetap = tetap(item);
  const muatan = useMemo(
    () => ({ id: item.id, aras, statusBahasan, penuangan, catatan, oleh, tanggal, dasarMuatan, alasanMuatan }),
    [item.id, aras, statusBahasan, penuangan, catatan, oleh, tanggal, dasarMuatan, alasanMuatan]
  );
  const namaKelompok = useMemo(() => labelKelompok(item, indeksKelompok(kelompok)), [item, kelompok]);

  useEffect(() => {
    if (hanya2025) return;
    if (!siapRef.current) return;
    if (idAktifRef.current !== item.id) return;
    tulisDraf('urusan:' + item.id, muatan);
    jadwalkan(muatan);
  }, [muatan, jadwalkan, item.id, hanya2025]);

  // v5.6: draf dilepas begitu tersimpan di sheet.
  useEffect(() => {
    if (status === 'tersimpan' && idAktifRef.current) hapusDraf('urusan:' + idAktifRef.current);
  }, [status]);

  useEffect(() => {
    if (!flushRef) return undefined;
    if (hanya2025) {
      flushRef.current = async () => {};
      return () => { flushRef.current = null; };
    }
    flushRef.current = async () => { if (adaTertunda()) await paksa(); };
    return () => { flushRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flushRef, paksa, hanya2025]);

  useEffect(() => {
    if (hanya2025) return undefined;
    const onSembunyi = () => { if (document.visibilityState === 'hidden' && adaTertunda()) paksa(); };
    document.addEventListener('visibilitychange', onSembunyi);
    return () => document.removeEventListener('visibilitychange', onSembunyi);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paksa, hanya2025]);

  useEffect(() => {
    if (!oleh) return;
    try { window.localStorage.setItem(STORAGE_KEY.OLEH, oleh); } catch (e) { /* abaikan */ }
  }, [oleh]);

  const pindah = useCallback(async (tujuan) => {
    if (!tujuan) return;
    if (!hanya2025 && adaTertunda()) await paksa();
    onPindah(tujuan);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paksa, onPindah, hanya2025]);

  const kembali = useCallback(async () => {
    if (!hanya2025 && adaTertunda()) await paksa();
    onKembali();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paksa, onKembali, hanya2025]);

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

  const aturan = useMemo(() => bacaAturanTuang(cfg), [cfg]);
  const luar = barisLuarStatuta(aturan, item);
  const tanpaPadanan = item.adaDiSumber === false;
  const butir = butirMonev(item.monev);
  const pilihanOrgan = (pilihan && pilihan.ORGAN) || [];
  const beda = useMemo(
    () => new Set((tanpaPadanan || hanya2025) ? [] : arasBerbeda({ aras, lama: item.lama, adaDiSumber: item.adaDiSumber }, ctx)),
    [aras, item.lama, item.adaDiSumber, tanpaPadanan, hanya2025, ctx]
  );
  const kosong = jumlahArasKosong(aras, ctx);
  const izin = useMemo(() => izinTulis(cfg), [cfg]);
  const tampilPasal = adaPasalAras(cfg);
  const bolehMuatan = izin.has('DASARMUATAN') || izin.has('ALASANMUATAN');
  const adaMuatan = !!(item.dasarMuatan || item.alasanMuatan || dasarMuatan || alasanMuatan);

  /** Mengisi organ kosong dari Statuta 2025 (sesudah dipadankan). Unit tidak disentuh. */
  const salinDariLama = () => {
    const dariLama = arasDariLama(item.lama, ctx);
    const baru = Object.assign({}, aras);
    let diisi = 0;
    ctx.aksi.forEach((a) => {
      const organLama = dariLama[a.kode] || [];
      const kini = baru[a.kode] || { organ: '', unit: '' };
      if (!String(kini.organ || '').trim() && organLama.length) {
        baru[a.kode] = Object.assign({}, kini, { organ: gabungOrgan(organLama, ctx.pemisah) });
        diisi++;
      }
    });
    setAras(baru);
    const beritahu = onInfo || onGalat;
    if (beritahu) {
      beritahu(diisi
        ? diisi + ' aras kosong diisi dari Statuta 2025. Aras yang sudah berisi tidak diubah.'
        : 'Tidak ada aras kosong yang bisa diisi dari Statuta 2025.');
    }
  };

  const isiNamaTersimpan = () => {
    try { const v = window.localStorage.getItem(STORAGE_KEY.OLEH); if (v) setOleh(v); } catch (e) { /* abaikan */ }
  };

  const opsi = (daftar, kini) => {
    const out = (daftar || []).slice();
    if (kini && out.indexOf(kini) === -1) out.push(kini); // nilai lama tetap tampil
    return out;
  };

  if (hanya2025) {
    const tujuan = namaKelompok || item.kelompok || 'kelompok urusan yang relevan';
    const jembatan = String(item.riwayat || '').trim() ||
      ('Substansi urusan ini tidak dihilangkan, tetapi tidak lagi dipetakan sebagai urusan kewenangan tersendiri pada Rancangan 2026. ' +
       'Substansinya digabung atau melekat pada ' + tujuan + '.');

    return (
      <div className="halaman halaman-rincian">
        <div className="rincian-bar">
          <button className="tbl tbl-ringan" onClick={kembali}>‹ Kembali ke peta</button>
          <div className="rincian-pindah">
            <button className="tbl tbl-ringan" onClick={() => pindah(sebelum)} disabled={!sebelum}
                    title={sebelum ? 'Urusan ' + sebelum.id + ' — ' + sebelum.urusan : 'Sudah di urusan pertama'}>‹</button>
            <span className="rincian-urutan">{urutan} dari {jumlah}</span>
            <button className="tbl tbl-ringan" onClick={() => pindah(sesudah)} disabled={!sesudah}
                    title={sesudah ? 'Urusan ' + sesudah.id + ' — ' + sesudah.urusan : 'Sudah di urusan terakhir'}>›</button>
          </div>
          <span className="lencana lencana-abu">BACA SAJA</span>
        </div>

        <div className="rincian-kepala">
          <div className="rincian-no">
            Urusan {item.id}{namaKelompok ? ' · ' + namaKelompok : (item.bidang ? ' · ' + item.bidang : '')}
            <span className="lencana lencana-abu rincian-jenis">2025 saja</span>
          </div>
          <h2 className="rincian-judul">{item.urusan}</h2>
        </div>

        <div className="fakta">
          {item.pasal ? <Fakta label="Dasar pasal Statuta 2025" nilai={String(item.pasal).replace(/\s*\n\s*/g, ' ')} lebar /> : null}
          {item.status ? <Fakta label="Status pengaturan Statuta 2025" nilai={item.status} /> : null}
          {item.produk ? <Fakta label="Produk/ketentuan 2025" nilai={item.produk} lebar /> : null}
          <Fakta label="Keadaan pada Rancangan 2026" nilai="Tidak lagi menjadi urusan mandiri" tebal />
          <Fakta label="Digabung / melekat pada" nilai={tujuan} lebar />
        </div>

        {butir ? (
          <div className="peringatan peringatan-kunci">
            <strong>Riwayat Monev — {butir}.</strong> Penanda ini berasal dari pemetaan Statuta 2025.
          </div>
        ) : null}

        <div className="peringatan peringatan-info">
          <strong>Urusan ini tidak hilang tanpa penjelasan.</strong> Pada Rancangan 2026 substansinya
          tidak lagi berdiri sebagai satu business process tersendiri dan dialihkan/melekat pada
          kelompok urusan yang ditunjukkan di atas.
        </div>

        <div className="kartu-baris">
          <KartuAlur judul={String(cfg.app.LABEL_BLOK_LAMA || 'STATUTA 2025')} steps={item.lama}
                     indeksOrgan={indeksOrgan} indeksAksi={indeksAksi} aturan={aturan} barisLuar={luar}
                     ringkas={ringkas} />
          <div className="kartu">
            <div className="kartu-judul">{String(cfg.app.LABEL_BLOK_BARU || 'RANCANGAN 2026')}</div>
            <div className="kartu-kosong">
              <strong>Tidak lagi menjadi urusan mandiri.</strong><br />
              Digabung / melekat pada: {tujuan}.
            </div>
          </div>
        </div>

        <div className="arahan">
          <div className="fakta-label">Jembatan perubahan 2025 → 2026</div>
          <div className="arahan-isi">{jembatan}</div>
        </div>

        <div className="rincian-kaki">
          <button className="tbl tbl-ringan" onClick={kembali}>‹ Kembali ke peta</button>
          <span className="kecil rincian-bantuan">
            Baris ini hanya pembanding Statuta 2025 dan tidak dapat diedit dari web.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="halaman halaman-rincian">
      <div className="rincian-bar">
        <button className="tbl tbl-ringan" onClick={kembali}>‹ Kembali ke peta</button>
        <div className="rincian-pindah">
          <button className="tbl tbl-ringan" onClick={() => pindah(sebelum)} disabled={!sebelum}
                  title={sebelum ? 'Urusan ' + sebelum.id + ' — ' + sebelum.urusan : 'Sudah di urusan pertama'}>‹</button>
          <span className="rincian-urutan">{urutan} dari {jumlah}</span>
          <button className="tbl tbl-ringan" onClick={() => pindah(sesudah)} disabled={!sesudah}
                  title={sesudah ? 'Urusan ' + sesudah.id + ' — ' + sesudah.urusan : 'Sudah di urusan terakhir'}>›</button>
        </div>
        <PenandaSimpan status={status} galat={galat} onUlang={() => paksa()} />
      </div>

      <div className="rincian-kepala">
        <div className="rincian-no">
          Urusan {item.id}{namaKelompok ? ' · ' + namaKelompok : (item.bidang ? ' · ' + item.bidang : '')}
          {muatanTetap ? <span className="lencana lencana-abu rincian-jenis">muatan tetap</span> : null}
        </div>
        <h2 className="rincian-judul">{item.urusan}</h2>
      </div>

      {item.muatan || adaMuatan ? (
        <div className="muatan-wajib">
          <div className="mw-kepala">
            <span className="fakta-label">Muatan wajib</span>
            {item.muatan ? <span className="mw-label">{item.muatan}</span> : null}
            {item.butir ? <span className="mw-butir">Butir Lampiran {item.butir}</span> : null}
            {bolehMuatan ? (
              <button type="button" className="tbl tbl-ringan mw-sunting" onClick={() => setSuntingMuatan(!suntingMuatan)}>
                {suntingMuatan ? 'Selesai' : 'Sunting'}
              </button>
            ) : null}
          </div>
          {suntingMuatan ? (
            <div className="mw-form">
              <label><span>Dasar hukum muatan</span>
                <textarea className="inp" rows={3} value={dasarMuatan} readOnly={!izin.has('DASARMUATAN')}
                          onChange={(e) => setDasarMuatan(e.target.value)} /></label>
              <label><span>Alasan wajib dimuat</span>
                <textarea className="inp" rows={3} value={alasanMuatan} readOnly={!izin.has('ALASANMUATAN')}
                          onChange={(e) => setAlasanMuatan(e.target.value)} /></label>
            </div>
          ) : (
            <div className="mw-isi">
              <div><div className="mw-sub">Dasar hukum</div><div className={dasarMuatan.indexOf('[VERIFIKASI]') !== -1 ? 'mw-teks mw-verifikasi' : 'mw-teks'}>{dasarMuatan || '—'}</div></div>
              <div><div className="mw-sub">Mengapa wajib dimuat</div><div className={alasanMuatan.indexOf('[VERIFIKASI]') !== -1 ? 'mw-teks mw-verifikasi' : 'mw-teks'}>{alasanMuatan || '—'}</div></div>
            </div>
          )}
        </div>
      ) : null}

      <div className="fakta">
        {item.kelengkapan ? <Fakta label="Kelengkapan lima aras" nilai={item.kelengkapan} tebal /> : null}
        {item.dilengkapi ? <Fakta label="Aras dilengkapi tanpa pembahasan" nilai={item.dilengkapi} /> : null}
        {item.pasalBaru ? <Fakta label="Dasar pasal Statuta 2026" nilai={item.pasalBaru} lebar /> : null}
        {item.produk ? <Fakta label="Bentuk produk hukum" nilai={item.produk} lebar /> : null}
        {item.pasal ? <Fakta label="Dasar pasal Statuta 2025" nilai={String(item.pasal).replace(/\s*\n\s*/g, ' ')} lebar /> : null}
        {item.status ? <Fakta label="Status pengaturan Statuta 2025" nilai={item.status} /> : null}
      </div>

      {butir ? (
        <div className="peringatan peringatan-kunci">
          <strong>Penomoran terkunci Monev — {butir}.</strong> Rumusan boleh diperbaiki di tempat, tetapi nomor
          pasal dan ayat pada baris ini tidak boleh bergeser.
        </div>
      ) : null}
      {luar ? (
        <div className="peringatan peringatan-luar">
          <strong>Tidak dituangkan ke dalam Statuta.</strong> Urusan ini sudah diatur Anggaran Dasar atau Anggaran
          Rumah Tangga dan hanya mengikat organ Yayasan.
        </div>
      ) : null}
      {tanpaPadanan ? (
        <div className="peringatan peringatan-info">
          Urusan tambahan. Tidak ada padanannya pada tab Statuta 2025, sehingga blok kondisi lama memang kosong.
        </div>
      ) : null}

      {item.arahan ? (
        <div className={'arahan' + (item.arahan.indexOf('[VERIFIKASI]') !== -1 ? ' arahan-verifikasi' : '')}>
          <div className="fakta-label">Arahan rapat dan dasar</div>
          <div className="arahan-isi">{item.arahan}</div>
        </div>
      ) : null}

      {muatanTetap ? (
        <div className="panel-tetap">
          <div className="fakta-label">Muatan tetap</div>
          <p>
            Isinya cukup dinyatakan dalam batang tubuh Statuta:{' '}
            <b>{item.pasalBaru || 'letak belum diisi pada kolom Dasar pasal Statuta 2026'}</b>.
            Karena hanya berubah lewat perubahan Statuta, aras mengusulkan sampai mengesahkan disamakan
            dengan urusan C1.1; aras melaksanakan diisi pelaksana nyata urusan ini.
          </p>
        </div>
      ) : null}

      <div className="kartu-baris">
        <KartuAlur judul={String(cfg.app.LABEL_BLOK_LAMA || 'STATUTA LAMA')} steps={item.lama}
                   indeksOrgan={indeksOrgan} indeksAksi={indeksAksi} aturan={aturan} barisLuar={luar}
                   ringkas={ringkas} />
        <KartuAras judul={String(cfg.app.LABEL_BLOK_BARU || 'RANCANGAN')} aras={aras} ctx={ctx}
                   ringkas={ringkas} />
      </div>

      <div className="rincian-alat">
        <button className="tbl tbl-ringan" onClick={salinDariLama} disabled={tanpaPadanan || kosong === 0}
                title={tanpaPadanan ? 'Urusan ini tidak ada pada Statuta 2025'
                  : kosong === 0 ? 'Semua aras sudah berisi' : 'Isi aras yang kosong dari Statuta 2025'}>
          Isi aras kosong dari Statuta 2025
        </button>
        {!tanpaPadanan ? (
          beda.size === 0
            ? <span className="tanda-sama">organ tiap aras sama dengan Statuta 2025</span>
            : <span className="tanda-beda">berbeda dari Statuta 2025 pada {beda.size} aras</span>
        ) : null}
        {kosong ? <span className="tanda-kosong">{kosong} aras belum diisi</span> : null}
      </div>

      <FormAras aksi={ctx.aksi} nilai={aras} setNilai={setAras} pilihanOrgan={pilihanOrgan} ctx={ctx} arasBeda={beda}
                ringkas={ringkas} tampilPasal={tampilPasal} bolehPasal={izin.has('PASALARAS')} bolehAras={izin.has('ARAS')}
                idUrusan={item.id} />

      <div className="rincian-status">
        <label>
          <span>Status bahasan</span>
          <select className="inp" value={statusBahasan} onChange={(e) => setStatusBahasan(e.target.value)}>
            <option value="">—</option>
            {opsi(pilihan && pilihan.STATUS, statusBahasan).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label>
          <span>Penuangan ke Statuta</span>
          <select className="inp" value={penuangan} onChange={(e) => setPenuangan(e.target.value)}>
            <option value="">—</option>
            {opsi(pilihan && pilihan.PENUANGAN, penuangan).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>

      <div className="rincian-catatan">
        <label className="catatan-utama">
          <span>Catatan perubahan</span>
          <textarea className="inp" rows={3} value={catatan} onChange={(e) => setCatatan(e.target.value)}
                    placeholder="Alasan atau dasar keputusan" />
        </label>
        <label>
          <span>Diputuskan pada</span>
          <input className="inp" type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
        </label>
        <label>
          <span>Oleh</span>
          <input className="inp" type="text" value={oleh} onChange={(e) => setOleh(e.target.value)}
                 onFocus={() => { if (!oleh) isiNamaTersimpan(); }} placeholder="Forum atau nama" />
        </label>
      </div>

      {item.riwayat ? (
        <details className="riwayat">
          <summary>Catatan dari tab riwayat</summary>
          <p>{item.riwayat}</p>
        </details>
      ) : null}

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
