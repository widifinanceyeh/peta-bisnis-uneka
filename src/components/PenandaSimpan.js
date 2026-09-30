import React from 'react';

/**
 * Penanda keadaan simpan otomatis. Menggantikan tombol Simpan.
 * Kalimatnya sengaja menyebut sheet, bukan istilah teknis, supaya jelas
 * bagi peserta rapat bahwa perubahan sudah sampai ke berkas induk.
 * v5.6: tombol "Simpan ulang" saat gagal; ketikan tidak dibuang.
 */
const TEKS = {
  bersih:    ['', ''],
  menunggu:  ['menunggu', 'Perubahan sedang disiapkan…'],
  menyimpan: ['menyimpan', 'Menulis ke sheet…'],
  tersimpan: ['tersimpan', 'Tersimpan di sheet'],
  galat:     ['galat', 'Gagal menyimpan']
};

export default function PenandaSimpan({ status, galat, onUlang }) {
  const [kelas, teks] = TEKS[status] || TEKS.bersih;
  if (!teks) return <span className="penanda penanda-kosong">&nbsp;</span>;

  return (
    <span className={'penanda penanda-' + kelas} title={status === 'galat' ? galat : teks}>
      <span className="penanda-titik" />
      <span className="penanda-teks">{teks}</span>
      {status === 'galat' && galat ? <span className="penanda-galat">{galat}</span> : null}
      {status === 'galat' && onUlang ? <button type="button" className="tbl penanda-ulang" onClick={onUlang}>Simpan ulang</button> : null}
    </span>
  );
}
