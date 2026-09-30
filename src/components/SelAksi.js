import React from 'react';
import { urutkan } from '../utils/langkah';
import { langkahLuarStatuta } from '../utils/tuang';

/**
 * Satu sel matriks untuk satu aras.
 *
 * Warna berasal dari Cfg_Organ, bukan dari daftar tetap di kode.
 * Mode ringkas memakai KODE organ agar tabel muat satu layar; judul sel
 * selalu memuat nama penuh.
 *
 * TAHAP DI LUAR STATUTA
 *   Satu sel dapat memuat lebih dari satu tahap, dan sebagian di antaranya
 *   bisa berada di luar Statuta sementara sebagian lain di dalam — misalnya
 *   kolom Melaksanakan yang diisi Rektor dan Pengawas Yayasan sekaligus.
 *   Karena itu penilaian dilakukan per tahap, bukan per sel:
 *
 *     - sel diberi warna penuh dari tahap PERTAMA yang masuk Statuta;
 *     - bila tidak ada satu pun tahap yang masuk, seluruh sel dipudarkan;
 *     - tahap yang tidak masuk selalu ditandai, di sel mana pun ia berada.
 *
 *   Sel yang tidak memuat tahap di luar Statuta tampil persis seperti semula.
 */
export default function SelAksi({
  steps, kodeAksi, indeksOrgan, pemisah, teksKosong, ringkas, aturan, barisLuar
}) {
  const langkah = urutkan(steps).filter((s) => s.aksi === kodeAksi);

  if (langkah.length === 0) {
    return <td className="sel-aksi kosong"><span className="sel-isi">{teksKosong}</span></td>;
  }

  const bagian = langkah.map((s) => ({
    kunci: s.kunci,
    nomor: s.nomor,
    organ: indeksOrgan[s.organ] || null,
    kode: s.organ,
    luar: langkahLuarStatuta(aturan, s.organ, barisLuar)
  }));

  const dalam = bagian.filter((b) => !b.luar);
  const seluruhnyaLuar = dalam.length === 0;
  const utama = (dalam[0] || bagian[0]).organ;

  const gaya = utama
    ? (seluruhnyaLuar
        ? { borderColor: utama.warnaLatar, color: utama.warnaLatar }
        : { background: utama.warnaLatar, color: utama.warnaTeks, fontWeight: 600 })
    : undefined;

  const teksPenuh = bagian
    .map((b) => b.nomor + ' ' + (b.organ ? b.organ.nama : b.kode) + (b.luar ? ' — tidak dituang ke Statuta' : ''))
    .join(' · ');

  return (
    <td
      className={'sel-aksi terisi' + (seluruhnyaLuar ? ' sel-luar' : '')}
      style={gaya}
      title={teksPenuh}
    >
      <span className="sel-isi">
        {bagian.map((b, i) => (
          <React.Fragment key={b.kunci}>
            {i > 0 ? <span className="sel-pemisah">{pemisah}</span> : null}
            <span className={b.luar && !seluruhnyaLuar ? 'langkah-luar' : undefined}>
              {b.nomor} {b.organ ? (ringkas ? b.organ.kode : b.organ.nama) : b.kode}
            </span>
          </React.Fragment>
        ))}
      </span>
    </td>
  );
}
