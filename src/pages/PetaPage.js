import React, { useMemo } from 'react';
import FilterBar from '../components/FilterBar';
import MatriksPeta from '../components/MatriksPeta';
import MatriksAras from '../components/MatriksAras';
import { samaPersis, urutkan } from '../utils/langkah';
import { terkunciMonev } from '../utils/monev';
import { bacaAturanTuang, barisLuarStatuta } from '../utils/tuang';
import { saringUrusan, FILTER_KOSONG } from '../utils/saring';
import { ambilKombinasi, aksiDipakai, organDipakai } from '../utils/kolom';
import { adaPasalAras, bandingUrusan, lengkap, normNama, tetap } from '../utils/aras';

export default function PetaPage({
  cfg, urusan, indeksOrgan, filter, setFilter, ringkas, setRingkas,
  idTerpilih, gulirRef, onPilih, formatAras, ctx, pilihan, tampilLama, setTampilLama,
  tampilPasal, setTampilPasal, kelompok, tutup, onLipat
}) {
  const pemisah = String(cfg.app.PEMISAH_GANDA || ' / ');
  const teksKosong = String(cfg.app.TEKS_KOSONG || '–');
  const mode = String(cfg.app.MODE_URUSAN || 'SEMUA').toUpperCase();
  const organSorot = String(cfg.app.ORGAN_SOROT || '').trim();
  const labelLama = String(cfg.app.LABEL_BLOK_LAMA || 'STATUTA LAMA');
  const labelBaru = String(cfg.app.LABEL_BLOK_BARU || 'RANCANGAN BARU');

  const kombSumber = useMemo(() => ambilKombinasi(cfg, 'SUMBER'), [cfg]);
  const kombRancangan = useMemo(() => ambilKombinasi(cfg, 'RANCANGAN'), [cfg]);
  const aksiLama = useMemo(() => aksiDipakai(cfg.aksi, kombSumber), [cfg.aksi, kombSumber]);
  const aksiBaru = useMemo(() => aksiDipakai(cfg.aksi, kombRancangan), [cfg.aksi, kombRancangan]);

  // Legenda. Format ARAS: organ rancangan dibaca dari pilihan sheet, organ
  // Statuta 2025 dari Cfg_Kolom sumber. Format lama: seperti versi 3.
  const organLama = useMemo(() => organDipakai(cfg.organ, kombSumber), [cfg.organ, kombSumber]);
  const organRancangan = useMemo(() => {
    if (!formatAras) return [];
    const nama = (pilihan && pilihan.ORGAN) || [];
    return nama.map((n) => ctx.idxNama[normNama(n)] || { kode: n, nama: n, warnaLatar: '#eef0f2', warnaTeks: '#23262f' });
  }, [formatAras, pilihan, ctx]);
  const organLegenda = useMemo(() => {
    const gabung = new Set([...Array.from(kombSumber), ...Array.from(kombRancangan)]);
    return organDipakai(cfg.organ, gabung);
  }, [cfg.organ, kombSumber, kombRancangan]);

  const adaKolomMonev = useMemo(() => urusan.some((u) => terkunciMonev(u.monev)), [urusan]);
  const aturan = useMemo(() => bacaAturanTuang(cfg), [cfg]);

  const daftar = useMemo(
    () => saringUrusan(urusan, filter, mode, organSorot, formatAras ? ctx : null),
    [urusan, filter, mode, organSorot, formatAras, ctx]
  );

  const rekap = useMemo(() => {
    let sesuai = 0, beda = 0, belum = 0, hanya2025 = 0;
    let kunci = 0, luar = 0, tidakLengkap = 0, jumlahTetap = 0;
    const perStatus = {};

    daftar.forEach((u) => {
      if (formatAras) {
        const b = bandingUrusan(u, ctx);
        const riwayat2025 = b === 'DIHENTIKAN';

        if (tetap(u)) jumlahTetap++;

        if (riwayat2025) {
          hanya2025++;
        } else {
          if (b === 'KOSONG') belum++;
          else if (b === 'SAMA') sesuai++;
          else if (b === 'BEDA' || b === 'TAMBAHAN') beda++;

          // Urusan 2025 saja tidak dianggap "aras kosong" pada rancangan.
          if (!lengkap(u, ctx)) tidakLengkap++;

          const s = String(u.statusBahasan || '').trim();
          if (s) perStatus[s] = (perStatus[s] || 0) + 1;
        }
      } else {
        const ada = urutkan(u.baru).length > 0;
        if (!ada) belum++;
        else if (samaPersis(u.lama, u.baru)) sesuai++;
        else beda++;
      }

      if (terkunciMonev(u.monev)) kunci++;
      if (barisLuarStatuta(aturan, u)) luar++;
    });

    return { sesuai, beda, belum, hanya2025, kunci, luar, tidakLengkap, perStatus, jumlahTetap };
  }, [daftar, aturan, formatAras, ctx]);

  // Contoh legenda "dituang / tidak dituang" diambil dari Cfg_Organ, tidak ditulis tetap.
  const contohDalam = cfg.organ.find((o) => !aturan.organLuar.has(String(o.kode).toUpperCase()));
  const contohLuar = cfg.organ.find((o) => aturan.organLuar.has(String(o.kode).toUpperCase()));

  const chipKet = (o, kecil) => (
    <span key={o.kode} className="fb-ket-item">
      <span className={'legenda-item' + (kecil ? ' legenda-kecil' : '')} style={{ background: o.warnaLatar, color: o.warnaTeks }}>{o.kode}</span>
      <span className="fb-ket-nama">{o.nama}</span>
    </span>
  );

  // v5.22: keterangan kode organ dan warna penuangan dipindah ke panel Tampilan.
  const keterangan = (
    <>
      <div className="fb-ket-baris">
        {formatAras ? (
          <>
            <span className="legenda-label">{labelBaru}</span>
            {organRancangan.map((o) => chipKet(o))}
          </>
        ) : organLegenda.map((o) => chipKet(o))}
      </div>
      {formatAras && tampilLama ? (
        <div className="fb-ket-baris">
          <span className="legenda-label">{labelLama}</span>
          {organLama.map((o) => chipKet(o, true))}
        </div>
      ) : null}
      {aturan.aktif && (!formatAras || tampilLama) && contohDalam && contohLuar ? (
        <div className="legenda-tuang">
          <span className="contoh-penuh" style={{ background: contohDalam.warnaLatar, borderColor: contohDalam.warnaLatar, color: contohDalam.warnaTeks }}>
            1 {contohDalam.kode}
          </span>
          <span className="legenda-tuang-teks">dituangkan ke dalam Statuta</span>
          <span className="contoh-pudar" style={{ color: contohLuar.warnaLatar, borderColor: contohLuar.warnaLatar }}>
            2 {contohLuar.kode}
          </span>
          <span className="legenda-tuang-teks">
            {aturan.legenda || 'sudah diatur Anggaran Dasar dan Anggaran Rumah Tangga, tidak diulang dalam Statuta'}
          </span>
          {rekap.luar ? <span className="legenda-tuang-jumlah">{rekap.luar} urusan seluruhnya di luar Statuta</span> : null}
        </div>
      ) : null}
    </>
  );

  // v5.22: satu baris ringkasan. Setiap angka dapat diklik untuk menyaring; angka nol tidak ditampilkan
  // kecuali saringannya sedang aktif. Saringan dari panel yang tidak punya angka sendiri tampil sebagai label dengan ×.
  const setel = (k, v) => setFilter(Object.assign({}, filter, { [k]: filter[k] === v ? '' : v }));
  const hapus = (k) => setFilter(Object.assign({}, filter, { [k]: '' }));
  const urutStatus = ((pilihan && pilihan.STATUS) || []).concat(
    Object.keys(rekap.perStatus).filter((s) => !((pilihan && pilihan.STATUS) || []).includes(s))
  );
  if (filter.statusBahasan && !urutStatus.includes(filter.statusBahasan)) urutStatus.push(filter.statusBahasan);
  const tombolStatus = formatAras
    ? urutStatus.filter((s) => rekap.perStatus[s] || filter.statusBahasan === s)
        .map((s) => ({ k: 'statusBahasan', v: s, n: rekap.perStatus[s] || 0, teks: s, kelas: '' }))
    : [];
  const tombolRekap = [
    { k: 'jenis', v: 'TETAP', n: rekap.jumlahTetap, teks: 'muatan tetap', kelas: 'rekap-abu' },
    { k: 'perubahan', v: 'BERUBAH', n: rekap.beda, teks: 'berbeda', kelas: 'rekap-kuning' },
    { k: 'perubahan', v: 'SAMA', n: rekap.sesuai, teks: 'sama', kelas: 'rekap-hijau' },
    { k: 'perubahan', v: 'BELUM', n: rekap.belum, teks: 'belum dirancang', kelas: 'rekap-abu' },
    formatAras ? { k: 'perubahan', v: '2025', n: rekap.hanya2025, teks: '2025 saja', kelas: 'rekap-abu' } : null,
    formatAras ? { k: 'lengkap', v: 'TIDAK', n: rekap.tidakLengkap, teks: 'ada aras kosong', kelas: 'rekap-merah' } : null,
    adaKolomMonev ? { k: 'monev', v: '1', n: rekap.kunci, teks: 'terkunci Monev', kelas: 'rekap-merah' } : null
  ].filter((t) => t && (t.n || filter[t.k] === t.v));
  const diwakili = (k, v) => tombolStatus.concat(tombolRekap).some((t) => t.k === k && t.v === v);
  const NAMA = {
    jenis: { ALUR: 'Alur kewenangan', TETAP: 'Muatan tetap' },
    lengkap: { YA: 'Lima aras lengkap', TIDAK: 'Ada aras kosong' },
    perubahan: { BERUBAH: 'Berbeda dari 2025', SAMA: 'Sama dengan 2025', BELUM: 'Belum ada rancangan', TAMBAHAN: 'Urusan tambahan', 2025: '2025 saja' }
  };
  const labelAktif = ['jenis', 'muatan', 'penuangan', 'lengkap', 'status', 'perubahan']
    .filter((k) => String(filter[k] || '').trim() && !diwakili(k, filter[k]))
    .map((k) => ({ k, teks: (k === 'status' ? '2025: ' : '') + ((NAMA[k] && NAMA[k][filter[k]]) || filter[k]) }));
  const tombol = (t) => {
    const aktif = filter[t.k] === t.v;
    return (
      <button key={t.k + t.v} type="button" className={'status-saring' + (aktif ? ' aktif' : '')}
              onClick={() => setel(t.k, t.v)} title={aktif ? 'Klik untuk melepas saringan' : 'Klik untuk menyaring'}>
        <b className={aktif ? '' : t.kelas}>{t.n}</b> {t.teks}{aktif ? <span className="ringkas-x" aria-hidden="true">×</span> : null}
      </button>
    );
  };

  return (
    <div className="halaman halaman-peta">
      <FilterBar
        urusan={urusan} filter={filter} setFilter={setFilter}
        jumlahHasil={daftar.length} jumlahTotal={urusan.length}
        ringkas={ringkas} setRingkas={setRingkas} onReset={() => setFilter(FILTER_KOSONG)}
        formatAras={formatAras} pilihan={pilihan} tampilLama={tampilLama} setTampilLama={setTampilLama}
        adaPasal={formatAras && adaPasalAras(cfg)} tampilPasal={tampilPasal} setTampilPasal={setTampilPasal}
        kelompok={formatAras ? kelompok : []} keterangan={keterangan}
      />

      <div className="ringkas-baris">
        {labelAktif.map((a) => (
          <button key={a.k} type="button" className="label-saring" onClick={() => hapus(a.k)} title="Lepas saringan ini">
            {a.teks}<span className="ringkas-x" aria-hidden="true">×</span>
          </button>
        ))}
        {tombolStatus.map(tombol)}
        {tombolStatus.length && tombolRekap.length ? <span className="ringkas-pisah" aria-hidden="true" /> : null}
        {tombolRekap.map(tombol)}
      </div>

      {formatAras ? (
        <MatriksAras
          daftar={daftar} aksiLama={aksiLama} ctx={ctx} pilihan={pilihan || {}}
          indeksOrgan={indeksOrgan} pemisah={pemisah} teksKosong={teksKosong} ringkas={ringkas}
          tampilLama={tampilLama} labelLama={labelLama} labelBaru={labelBaru}
          idTerpilih={idTerpilih} adaKolomMonev={adaKolomMonev} gulirRef={gulirRef}
          aturan={aturan} onPilih={onPilih} tampilPasal={adaPasalAras(cfg) && tampilPasal}
          kelompok={kelompok} tutup={tutup} onLipat={onLipat}
        />
      ) : (
        <MatriksPeta
          daftar={daftar} aksiLama={aksiLama} aksiBaru={aksiBaru} indeksOrgan={indeksOrgan}
          pemisah={pemisah} teksKosong={teksKosong} ringkas={ringkas} labelLama={labelLama}
          labelBaru={labelBaru} idTerpilih={idTerpilih} adaKolomMonev={adaKolomMonev}
          gulirRef={gulirRef} aturan={aturan} onPilih={onPilih}
        />
      )}
    </div>
  );
}
