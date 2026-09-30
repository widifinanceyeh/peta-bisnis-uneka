import React from 'react';
import { organDariTeks } from '../utils/aras';

/**
 * Rangkaian lima kotak aras rancangan, dari mengusulkan sampai
 * melaksanakan. Warna kotak mengikuti organ pertama (Cfg_Organ).
 */
export default function KartuAras({ judul, aras, ctx, ringkas }) {
  return (
    <div className="kartu">
      <div className="kartu-judul">{judul}</div>
      <div className="alur">
        {ctx.aksi.map((a, i) => {
          const v = (aras || {})[a.kode] || {};
          const daftar = organDariTeks(v.organ, ctx);
          const utama = daftar.find((d) => d.organ);
          const gaya = utama
            ? { background: utama.organ.warnaLatar, color: utama.organ.warnaTeks, borderColor: utama.organ.warnaLatar }
            : { borderStyle: 'dashed', color: '#a32330', borderColor: '#f0c2c8' };
          return (
            <React.Fragment key={a.kode}>
              <div className="alur-kotak alur-aras" style={gaya} title={String(v.unit || '')}>
                <div className="alur-aksi">{a.nama}</div>
                <div className="alur-organ">
                  {daftar.length
                    ? daftar.map((d) => (d.organ ? (ringkas ? d.organ.kode : d.organ.nama) : d.nama)).join(' / ')
                    : 'kosong'}
                </div>
                {v.unit ? <div className="alur-unit">{v.unit}</div> : null}
                {v.pasal ? <div className="alur-pasal">{String(v.pasal).replace(/\[USULAN\]\s*/g, 'usulan: ')}</div> : null}
              </div>
              {i < ctx.aksi.length - 1 ? <div className="alur-panah">&rarr;</div> : null}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
