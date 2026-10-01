import React from 'react';

/**
 * v5.9: sakelar daftar halaman Periksa — "Semua" (bawaan) atau hanya yang belum selesai.
 * Dipakai seragam oleh semua butir Periksa.
 */
export function Sakelar({ semua, onSemua, nSemua, nBelum, labelBelum, keterangan }) {
  return (
    <div className="tl-kepala pk-sakelar">
      <div className="chip-baris">
        <button type="button" className={'pil' + (semua ? ' aktif' : '')} onClick={() => onSemua(true)}>Semua {nSemua}</button>
        <button type="button" className={'pil' + (!semua ? ' aktif' : '')} onClick={() => onSemua(false)}>{labelBelum || 'Belum'} {nBelum}</button>
        {keterangan ? <span className="kecil">{keterangan}</span> : null}
      </div>
    </div>
  );
}

/** v5.9: tanda status seragam: hijau "Selesai", oranye "Belum". */
export function TandaSelesai({ ok, teks }) {
  return <span className={'pk-st ' + (ok ? 'pk-st-ok' : 'pk-st-belum')}>{teks || (ok ? 'Selesai' : 'Belum')}</span>;
}
