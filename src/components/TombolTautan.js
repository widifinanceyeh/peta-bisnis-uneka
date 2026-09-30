import React, { useEffect, useRef, useState } from 'react';

/**
 * Tombol salin tautan (v5.8). Menyalin alamat lengkap yang langsung membuka pasal, urusan, atau dokumen ini,
 * untuk dikirim lewat WhatsApp atau surel. Penerima yang membuka tautan diarahkan ke tempat yang sama.
 * @param {string} alamat  bagian # alamat, mis. '#naskah-45'
 */
function salin(teks) {
  try {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(teks).then(() => true, () => salinCadangan(teks));
  } catch (e) { /* lanjut ke cadangan */ }
  return Promise.resolve(salinCadangan(teks));
}

function salinCadangan(teks) {
  try {
    const t = document.createElement('textarea');
    t.value = teks;
    t.setAttribute('readonly', '');
    t.style.position = 'fixed';
    t.style.opacity = '0';
    document.body.appendChild(t);
    t.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(t);
    return ok;
  } catch (e) { return false; }
}

export default function TombolTautan({ alamat }) {
  const [keadaan, setKeadaan] = useState('');
  const waktu = useRef(null);
  useEffect(() => () => window.clearTimeout(waktu.current), []);
  const klik = () => {
    const url = window.location.origin + window.location.pathname + alamat;
    salin(url).then((ok) => {
      setKeadaan(ok ? 'Tersalin' : 'Gagal menyalin');
      window.clearTimeout(waktu.current);
      waktu.current = window.setTimeout(() => setKeadaan(''), 2000);
    });
  };
  return (
    <button type="button" className={'tbl tbl-ringan tombol-tautan' + (keadaan === 'Tersalin' ? ' ok' : '')} onClick={klik}
            title="Salin tautan ke halaman ini" aria-label="Salin tautan ke halaman ini">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M6.5 9.5l3-3" /><path d="M7 4.5l1.2-1.2a2.6 2.6 0 013.7 3.7L10.7 8.2" /><path d="M9 11.5l-1.2 1.2a2.6 2.6 0 01-3.7-3.7L5.3 7.8" />
      </svg>
      <span>{keadaan || 'Salin tautan'}</span>
    </button>
  );
}
