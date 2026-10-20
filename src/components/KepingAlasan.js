import React from 'react';

/**
 * v5.26: keping alasan yang sudah pernah dipakai, sekali klik mengisi kotak alasan.
 *
 * Alasan tetap wajib dan tetap tersimpan apa adanya — yang dipangkas hanya mengetiknya berulang.
 * Bahannya diambil dari putusan yang sudah ada di layar itu sendiri (tab 07, muatan di luar peta,
 * putusan ayat kembar), jadi tidak ada tab baru di Spreadsheet dan tidak ada permintaan tambahan.
 * Alasan yang paling sering dipakai tampil lebih dulu; yang terlalu panjang tidak ikut ditawarkan
 * karena biasanya khas satu ayat dan tidak layak diulang.
 *
 * daftar  : larik kalimat alasan yang sudah tersimpan (boleh memuat kosong dan ganda)
 * onPilih : dipanggil dengan kalimat yang dipilih
 * nilai   : isi kotak alasan saat ini; keping yang sama persis ditandai aktif
 */
const BATAS_TAMPIL = 5;
const BATAS_PANJANG = 140;

export default function KepingAlasan({ daftar, onPilih, nilai }) {
  const pilihan = ringkas(daftar);
  if (!pilihan.length) return null;
  const kini = String(nilai || '').trim();
  return (
    <div className="ka" role="group" aria-label="Alasan yang sudah pernah dipakai">
      <span className="ka-label">Pernah dipakai</span>
      {pilihan.map((t) => (
        <button type="button" key={t} className={'ka-keping' + (t === kini ? ' aktif' : '')}
                title={t} onClick={() => onPilih(t)}>{t}</button>
      ))}
    </div>
  );
}

/** Dibersihkan, dihitung seringnya, lalu diambil beberapa yang teratas. */
export function ringkas(daftar) {
  const hitung = new Map();
  (daftar || []).forEach((x) => {
    const t = String(x == null ? '' : x).replace(/\s+/g, ' ').trim();
    if (!t || t.length > BATAS_PANJANG) return;
    hitung.set(t, (hitung.get(t) || 0) + 1);
  });
  return Array.from(hitung.entries())
    .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
    .slice(0, BATAS_TAMPIL)
    .map((x) => x[0]);
}
