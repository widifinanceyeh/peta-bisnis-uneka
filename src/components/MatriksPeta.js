import React, { useEffect, useRef } from 'react';
import SelAksi from './SelAksi';
import { samaPersis, urutkan } from '../utils/langkah';
import { butirMonev } from '../utils/monev';
import { barisLuarStatuta } from '../utils/tuang';

/**
 * Matriks berdampingan: blok kiri keadaan Statuta 2025, blok kanan rancangan.
 *
 * Susunan kolom tetap satu kolom per ARAS, organ ditunjukkan lewat warna dan
 * kode di dalam sel. Susunan itulah yang membuat seluruh peta muat dalam satu
 * lebar layar. Sheet menyimpannya sebagai 17 kolom organ kali aras; pelipatan
 * menjadi 5 kolom terjadi di sini.
 *
 * Versi 3:
 *  - nama urusan DIBUNGKUS penuh, tidak lagi dipotong ellipsis. Baris boleh
 *    menjadi tinggi; yang dijaga adalah lebar tabel, bukan tinggi halaman;
 *  - kolom kunci Monev hanya terisi bila kolomnya benar-benar memuat nomor
 *    butir. Kata "tidak" pada sheet tidak lagi dibaca sebagai terkunci;
 *  - posisi gulir dipulihkan saat kembali dari halaman rincian.
 */
export default function MatriksPeta({
  daftar, aksiLama, aksiBaru, indeksOrgan, pemisah, teksKosong, ringkas,
  labelLama, labelBaru, idTerpilih, adaKolomMonev, gulirRef, aturan, onPilih
}) {
  const labelAksi = (a) => (ringkas ? a.kode : a.nama);
  const wrapRef = useRef(null);

  // Posisi gulir dikembalikan persis seperti saat halaman rincian dibuka.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !gulirRef) return;
    if (gulirRef.current > 0) el.scrollTop = gulirRef.current;
  }, [gulirRef]);

  const catatGulir = (e) => {
    if (gulirRef) gulirRef.current = e.currentTarget.scrollTop;
  };

  return (
    <div
      className={'tabel-wrap' + (ringkas ? ' ringkas' : '')}
      ref={wrapRef}
      onScroll={catatGulir}
    >
      <table className="tabel tabel-bungkus">
        <colgroup>
          <col className="c-no" />
          {adaKolomMonev ? <col className="c-kunci" /> : null}
          <col className="c-urusan" />
          {aksiLama.map((a) => <col key={'cl' + a.kode} className="c-aksi" />)}
          <col className="c-pemisah" />
          {aksiBaru.map((a) => <col key={'cb' + a.kode} className="c-aksi" />)}
          <col className="c-ubah" />
          <col className="c-status" />
        </colgroup>

        <thead>
          <tr className="h-grup">
            <th className="lengket-kiri l1" rowSpan={2}>No</th>
            {adaKolomMonev ? (
              <th className="lengket-kiri lk" rowSpan={2}
                  title="Penomoran pasal dikunci Berita Acara Monev">Kunci</th>
            ) : null}
            <th className={'lengket-kiri l2' + (adaKolomMonev ? ' l2-geser' : '')} rowSpan={2}>
              Urusan
            </th>
            <th className="grup grup-lama" colSpan={aksiLama.length}>{labelLama}</th>
            <th className="pemisah" rowSpan={2} />
            <th className="grup grup-baru" colSpan={aksiBaru.length}>{labelBaru}</th>
            <th className="grup grup-akhir" colSpan={2}>Perbandingan</th>
          </tr>
          <tr className="h-sub">
            {aksiLama.map((a) => (
              <th key={'l' + a.kode} className="sub" title={a.nama}>{labelAksi(a)}</th>
            ))}
            {aksiBaru.map((a) => (
              <th key={'b' + a.kode} className="sub" title={a.nama}>{labelAksi(a)}</th>
            ))}
            <th className="sub" title="Perbandingan rancangan dengan keadaan lama">Beda</th>
            <th className="sub" title="Status kelengkapan alur pada Statuta 2025">Status</th>
          </tr>
        </thead>

        <tbody>
          {daftar.map((u) => {
            const adaRancangan = urutkan(u.baru).length > 0;
            const adaLama = urutkan(u.lama).length > 0;
            const urusanBaru = u.adaDiSumber === false;
            const berubah = adaRancangan && !samaPersis(u.lama, u.baru);
            const butir = butirMonev(u.monev);
            const luar = barisLuarStatuta(aturan, u);
            const dipilih = String(u.id) === String(idTerpilih);

            return (
              <tr
                key={u.id}
                onClick={() => onPilih(u)}
                className={'baris' + (dipilih ? ' baris-pilih' : '') + (luar ? ' baris-luar' : '')}
              >
                <td className="lengket-kiri l1 tengah atas">{u.id}</td>

                {adaKolomMonev ? (
                  <td className="lengket-kiri lk tengah atas">
                    {butir ? (
                      <span className="lencana lencana-kunci" title={'Terkunci Monev — ' + butir}>
                        kunci
                      </span>
                    ) : null}
                  </td>
                ) : null}

                <td className={'lengket-kiri l2 nama-urusan atas' + (adaKolomMonev ? ' l2-geser' : '')}>
                  <span className="urusan-teks">{u.urusan}</span>
                  {u.muatan ? (
                    <span className={'muatan-tanda' + (luar ? ' muatan-luar' : '')}
                          title={'Sumber muatan: ' + u.muatan}>
                      {kodeMuatan(u.muatan)}
                    </span>
                  ) : null}
                </td>

                {aksiLama.map((a) => (
                  <SelAksi
                    key={'l' + a.kode}
                    steps={u.lama}
                    kodeAksi={a.kode}
                    indeksOrgan={indeksOrgan}
                    pemisah={pemisah}
                    teksKosong={urusanBaru ? '' : teksKosong}
                    ringkas={ringkas}
                    aturan={aturan}
                    barisLuar={luar}
                  />
                ))}

                <td className="pemisah" />

                {aksiBaru.map((a) => (
                  <SelAksi
                    key={'b' + a.kode}
                    steps={u.baru}
                    kodeAksi={a.kode}
                    indeksOrgan={indeksOrgan}
                    pemisah={pemisah}
                    teksKosong={teksKosong}
                    ringkas={ringkas}
                    aturan={aturan}
                    barisLuar={luar}
                  />
                ))}

                <td className="tengah">
                  {urusanBaru ? (
                    <span className="lencana lencana-biru" title="Urusan tambahan; tidak ada padanannya pada Statuta 2025">baru</span>
                  ) : !adaRancangan ? (
                    <span className="lencana lencana-abu" title="Belum ada rancangan">–</span>
                  ) : berubah ? (
                    <span className="lencana lencana-kuning" title="Rancangan berbeda dari keadaan lama">beda</span>
                  ) : (
                    <span className="lencana lencana-hijau" title="Rancangan sama dengan keadaan lama">sama</span>
                  )}
                </td>
                <td className="tengah kecil status-sel">
                  {urusanBaru && !adaLama ? 'Tambahan baru' : u.status}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {daftar.length === 0 ? (
        <div className="kosong-hasil">Tidak ada urusan yang cocok dengan penyaring saat ini.</div>
      ) : null}
    </div>
  );
}

/**
 * Menyingkat teks sumber muatan menjadi satu tanda pendek.
 * Tidak memuat daftar tetap: kata pertama dipakai apa adanya, sehingga nilai
 * baru pada Sheet tetap tertangani tanpa mengubah kode.
 */
function kodeMuatan(teks) {
  const t = String(teks || '').trim();
  if (!t) return '';
  const kata = t.split(/\s+/);
  return kata[0].length > 9 ? kata[0].slice(0, 9) : kata[0];
}
