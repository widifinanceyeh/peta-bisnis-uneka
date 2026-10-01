import React from 'react';
import { navigasi } from '../navigasi';
import { monevBelum } from '../utils/telaah';

/**
 * v5.9: lencana butir Berita Acara Monev pada ayat ("M5"). Oranye = masih ditagih (status BA belum ada);
 * abu-abu = sudah ada menurut BA. Diklik membuka Periksa › Butir Monev dan menyorot butirnya.
 * @param {{daftar: Array, klik?: boolean}} props  klik=false bila lencana berada di dalam tombol lain
 */
export default function LencanaMonev({ daftar, klik = true }) {
  if (!daftar || !daftar.length) return null;
  return (
    <span className="lencana-m-baris">
      {daftar.map((m) => {
        const kelas = 'lencana-m' + (monevBelum(m) ? '' : ' lencana-m-ada');
        const judul = 'Butir Monev ' + m.butir + ': ' + m.dokumen + (m.status ? ' · status BA: ' + m.status : '') + (klik ? ' — buka di Periksa' : '');
        if (!klik || !navigasi.bukaMonev) return <span key={m.butir} className={kelas} title={judul}>M{m.butir}</span>;
        return (
          <button type="button" key={m.butir} className={kelas} title={judul} aria-label={judul}
                  onClick={(e) => { e.stopPropagation(); navigasi.bukaMonev(m.butir); }}>M{m.butir}</button>
        );
      })}
    </span>
  );
}
