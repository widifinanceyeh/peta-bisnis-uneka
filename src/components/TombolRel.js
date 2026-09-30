import React, { useEffect, useState } from 'react';
import { STORAGE_KEY } from '../config';

/**
 * Tombol sembunyikan/tampilkan panel daftar kiri (v5.5). Satu setelan untuk Naskah, Telaah, Periksa,
 * dan Dokumen Turunan, diingat per perangkat. Saat tersembunyi, panel menyusut menjadi lajur 48px
 * berisi tombol ini saja di posisi yang sama, dan isi halaman melebar penuh.
 */
function bacaCiut() {
  try { return window.localStorage.getItem(STORAGE_KEY.REL_CIUT) === '1'; } catch (e) { return false; }
}
function terapkan(ciut) {
  try { document.documentElement.classList.toggle('rel-ciut', ciut); } catch (e) { /* abaikan */ }
}
terapkan(bacaCiut());

export default function TombolRel() {
  const [ciut, setCiut] = useState(bacaCiut);
  useEffect(() => {
    terapkan(ciut);
    try { window.localStorage.setItem(STORAGE_KEY.REL_CIUT, ciut ? '1' : '0'); } catch (e) { /* abaikan */ }
  }, [ciut]);
  const judul = ciut ? 'Tampilkan daftar' : 'Sembunyikan daftar';
  return (
    <button type="button" className="rel-tombol" onClick={() => setCiut(!ciut)} title={judul} aria-label={judul} aria-pressed={ciut}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <rect x="1.5" y="2.5" width="13" height="11" rx="2" /><line x1="6" y1="2.5" x2="6" y2="13.5" />
      </svg>
    </button>
  );
}

/** Baris atas panel daftar: kotak cari (bila ada) dan tombol panel dalam satu baris. */
export function RelAtas({ children }) {
  return <div className="rel-atas">{children}<TombolRel /></div>;
}
