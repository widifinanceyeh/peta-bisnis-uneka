import React from 'react';
import { organDariTeks } from '../utils/aras';

/**
 * Satu sel peta rancangan format ARAS: chip organ berwarna (warna dari
 * Cfg_Organ) dan teks unit di bawahnya, dipotong dua baris. Isi penuh
 * terbaca lewat judul sel dan di halaman rincian.
 * Organ yang tidak dikenal Cfg_Organ tetap ditampilkan apa adanya.
 */
export default function SelAras({ nilai, ctx, ringkas, teksKosong, beda, tampilPasal }) {
  const daftar = organDariTeks(nilai && nilai.organ, ctx);
  const unit = String((nilai && nilai.unit) || '').trim();

  if (!daftar.length) {
    return (
      <td className="sel-aras sel-aras-kosong" title="Organ belum diisi">
        <span>{teksKosong}</span>
      </td>
    );
  }

  const pasal = String((nilai && nilai.pasal) || '').trim();
  const judul = daftar.map((d) => d.nama).join(' / ') + (unit ? '\n' + unit : '') +
    (pasal ? '\nStatuta 2026: ' + pasal : '') +
    (beda ? '\n(berbeda dari Statuta 2025)' : '');

  return (
    <td className={'sel-aras' + (beda ? ' sel-aras-beda' : '')} title={judul}>
      <div className="chip-baris">
        {daftar.map((d, i) => (
          <span
            key={i}
            className={'chip' + (d.organ ? '' : ' chip-asing')}
            style={d.organ ? { background: d.organ.warnaLatar, color: d.organ.warnaTeks } : undefined}
          >
            {d.organ ? (ringkas ? d.organ.kode : d.organ.nama) : d.nama}
          </span>
        ))}
      </div>
      {unit ? <div className="sel-unit">{unit}</div> : null}
      {pasal && tampilPasal ? (
        <div className={'sel-pasal' + (pasal.indexOf('[USULAN]') !== -1 ? ' sel-pasal-usulan' : '')}>
          {pasal.replace(/\[USULAN\]\s*/g, '')}
        </div>
      ) : null}
    </td>
  );
}
