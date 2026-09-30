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

  const chip = (o, kecil) => (
    <span key={o.kode} className={'legenda-item' + (kecil ? ' legenda-kecil' : '')}
          style={{ background: o.warnaLatar, color: o.warnaTeks }} title={o.nama}>
      {ringkas ? o.kode : o.nama}
    </span>
  );

  return (
    <div className="halaman halaman-peta">
      <FilterBar
        urusan={urusan} filter={filter} setFilter={setFilter}
        jumlahHasil={daftar.length} jumlahTotal={urusan.length}
        ringkas={ringkas} setRingkas={setRingkas} onReset={() => setFilter(FILTER_KOSONG)}
        formatAras={formatAras} pilihan={pilihan} tampilLama={tampilLama} setTampilLama={setTampilLama}
        adaPasal={formatAras && adaPasalAras(cfg)} tampilPasal={tampilPasal} setTampilPasal={setTampilPasal}
        kelompok={formatAras ? kelompok : []}
      />

      <div className="legenda">
        {formatAras ? (
          <>
            <span className="legenda-label">{labelBaru}</span>
            {organRancangan.map((o) => chip(o))}
            {tampilLama ? (
              <>
                <span className="legenda-label legenda-label-jarak">{labelLama}</span>
                {organLama.map((o) => chip(o, true))}
              </>
            ) : null}
          </>
        ) : organLegenda.map((o) => chip(o))}

        <span className="rekap">
          {rekap.jumlahTetap ? (
            <>
              <b className="rekap-abu" title="Isi cukup di batang tubuh; aras usul–sah mengikuti C1.1 Perubahan Statuta">{rekap.jumlahTetap}</b> muatan tetap
              <span className="titik">·</span>
            </>
          ) : null}
          <b className="rekap-hijau">{rekap.sesuai}</b> sama
          <span className="titik">·</span>
          <b className="rekap-kuning">{rekap.beda}</b> berbeda
          <span className="titik">·</span>
          <b className="rekap-abu">{rekap.belum}</b> belum dirancang
          {formatAras && rekap.hanya2025 ? (
            <>
              <span className="titik">·</span>
              <b className="rekap-abu">{rekap.hanya2025}</b> 2025 saja
            </>
          ) : null}
          {formatAras ? (
            <>
              <span className="titik">·</span>
              <b className={rekap.tidakLengkap ? 'rekap-merah' : 'rekap-hijau'}>{rekap.tidakLengkap}</b> ada aras kosong
            </>
          ) : null}
          {adaKolomMonev ? (
            <>
              <span className="titik">·</span>
              <b className="rekap-merah">{rekap.kunci}</b> terkunci Monev
            </>
          ) : null}
        </span>
      </div>

      {formatAras && Object.keys(rekap.perStatus).length ? (
        <div className="legenda-status">
          {((pilihan && pilihan.STATUS) || []).concat(
            Object.keys(rekap.perStatus).filter((s) => !((pilihan && pilihan.STATUS) || []).includes(s))
          ).filter((s) => rekap.perStatus[s]).map((s) => (
            <button key={s} type="button"
                    className={'status-saring' + (filter.statusBahasan === s ? ' aktif' : '')}
                    onClick={() => setFilter(Object.assign({}, filter, { statusBahasan: filter.statusBahasan === s ? '' : s }))}
                    title="Klik untuk menyaring">
              <b>{rekap.perStatus[s]}</b> {s}
            </button>
          ))}
          {rekap.hanya2025 ? (
            <button type="button"
                    className={'status-saring' + (filter.perubahan === '2025' ? ' aktif' : '')}
                    onClick={() => setFilter(Object.assign({}, filter, { perubahan: filter.perubahan === '2025' ? '' : '2025' }))}
                    title="Klik untuk menampilkan urusan yang ada pada Statuta 2025 tetapi tidak lagi menjadi urusan mandiri pada Rancangan 2026">
              <b>{rekap.hanya2025}</b> 2025 SAJA
            </button>
          ) : null}
        </div>
      ) : null}

      {aturan.aktif && (!formatAras || tampilLama) && contohDalam && contohLuar ? (
        <div className="legenda-tuang">
          {formatAras ? <span className="legenda-tuang-teks"><b>{labelLama}:</b></span> : null}
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
