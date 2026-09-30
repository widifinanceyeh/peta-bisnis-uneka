import React, { useMemo } from 'react';
import { bedaKata } from '../utils/bedaKata';

/**
 * Menampilkan satu sisi perbandingan kata: sisi "kiri" mencoret samar kata yang hilang,
 * sisi "kanan" menggaris bawahi kata yang bertambah. Baris dan indentasi naskah dipertahankan.
 */
export default function TeksBeda({ kiri, kanan, sisi, aktif = true }) {
  const hasil = useMemo(() => (aktif ? bedaKata(kiri, kanan) : null), [kiri, kanan, aktif]);
  const teks = sisi === 'kiri' ? kiri : kanan;
  if (!hasil) return <span className="teks-pre">{teks}</span>;
  const bagian = sisi === 'kiri' ? hasil.kiri : hasil.kanan;
  return (
    <span className="teks-pre">
      {bagian.map((b, i) => {
        if (!b.beda) return <React.Fragment key={i}>{b.t}</React.Fragment>;
        return sisi === 'kiri' ? <del key={i}>{b.t}</del> : <ins key={i}>{b.t}</ins>;
      })}
    </span>
  );
}
