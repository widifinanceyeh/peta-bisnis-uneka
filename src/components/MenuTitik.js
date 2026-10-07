import React, { useEffect, useRef, useState } from 'react';

/**
 * v5.17: menu ringkas "⋯". Tindakan yang jarang dipakai disimpan di sini agar layar tetap bersih.
 * butir: [{label, onPilih, sembunyi?, keterangan?}] — butir tersembunyi tidak ditampilkan; menu tanpa butir tidak dirender.
 * Menutup dengan klik di luar, Esc, atau sesudah memilih.
 */
export default function MenuTitik({ butir, label = 'Tindakan lain', kelas = '', teks = '⋯' }) {
  const [buka, setBuka] = useState(false);
  const ref = useRef(null);
  const tampil = (butir || []).filter((b) => b && !b.sembunyi);
  useEffect(() => {
    if (!buka) return undefined;
    const luar = (e) => { if (ref.current && !ref.current.contains(e.target)) setBuka(false); };
    const esc = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setBuka(false); } };
    document.addEventListener('mousedown', luar);
    document.addEventListener('keydown', esc, true);
    return () => { document.removeEventListener('mousedown', luar); document.removeEventListener('keydown', esc, true); };
  }, [buka]);
  if (!tampil.length) return null;
  return (
    <span className={'mt ' + kelas} ref={ref}>
      <button type="button" className={'mt-tombol' + (buka ? ' aktif' : '')} aria-haspopup="menu" aria-expanded={buka}
              aria-label={label} title={label} onClick={() => setBuka(!buka)}>{teks}</button>
      {buka ? (
        <span className="mt-daftar" role="menu">
          {tampil.map((b) => (
            <button type="button" role="menuitem" key={b.label} className="mt-butir"
                    onClick={() => { setBuka(false); b.onPilih(); }}>
              <span>{b.label}</span>
              {b.keterangan ? <small>{b.keterangan}</small> : null}
            </button>
          ))}
        </span>
      ) : null}
    </span>
  );
}
