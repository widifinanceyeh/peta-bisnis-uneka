import React from 'react';
import { urutkan } from '../utils/langkah';
import { langkahLuarStatuta } from '../utils/tuang';

/**
 * Rangkaian kotak berurutan 1 sampai n. Warna kotak berasal dari Cfg_Organ.
 *
 * Kotak yang tidak dituangkan ke dalam Statuta digambar dengan garis putus
 * dan warna pudar, disertai keterangan kecil di bawahnya. Kotaknya TIDAK
 * dihilangkan, karena rangkaian yang terpotong menyesatkan pembaca mengenai
 * alur yang sebenarnya berjalan.
 */
export default function KartuAlur({
  judul, steps, indeksOrgan, indeksAksi, putus, aturan, barisLuar, ringkas
}) {
  const langkah = urutkan(steps);

  return (
    <div className="kartu">
      <div className="kartu-judul">{judul}</div>
      {langkah.length === 0 ? (
        <div className="kartu-kosong">Belum ada langkah.</div>
      ) : (
        <div className="alur">
          {langkah.map((s, i) => {
            const o = indeksOrgan[s.organ];
            const a = indeksAksi[s.aksi];
            const luar = langkahLuarStatuta(aturan, s.organ, barisLuar);

            let gaya = {};
            if (o) {
              if (luar || putus) {
                gaya = { borderColor: o.warnaLatar, color: o.warnaLatar, borderStyle: 'dashed' };
              } else {
                gaya = { background: o.warnaLatar, color: o.warnaTeks, borderColor: o.warnaLatar };
              }
            }

            return (
              <React.Fragment key={s.kunci}>
                <div
                  className={'alur-kotak' + (luar ? ' alur-luar' : '')}
                  style={gaya}
                  title={luar ? 'Tahap ini tidak dituangkan ke dalam Statuta' : undefined}
                >
                  <div className="alur-no">{s.nomor}</div>
                  <div className="alur-organ">{o ? (ringkas ? o.kode : o.nama) : s.organ}</div>
                  <div className="alur-aksi">{a ? a.nama : s.aksi}</div>
                  {luar ? <div className="alur-tanda">di luar Statuta</div> : null}
                </div>
                {i < langkah.length - 1 ? <div className="alur-panah">&rarr;</div> : null}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}
