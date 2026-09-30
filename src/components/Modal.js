import React, { useEffect, useRef } from 'react';

/**
 * Modal.js — satu kerangka untuk semua jendela yang terbuka di atas halaman (v4.9).
 *
 * Dua bentuk dengan anatomi yang sama (kepala · isi · kaki):
 *   <Modal>           jendela di tengah layar, untuk konfirmasi dan pemeriksaan (Diagnosa);
 *   <LembarSamping>   lembar di sisi kanan, untuk mengintip isi tanpa meninggalkan halaman.
 *                     Di layar sempit lembar ini naik dari bawah.
 *
 * Perilaku yang dijamin sama pada keduanya:
 *   - Esc dan klik latar menutup; tombol × selalu ada di kepala;
 *   - fokus pindah ke jendela saat terbuka dan kembali ke asalnya saat ditutup;
 *   - halaman di belakang tidak ikut menggulir;
 *   - Esc tidak diteruskan ke halaman (editor urusan memakai Esc untuk kembali ke peta).
 */
let terbuka = 0;

function useJendela(onTutup) {
  const ref = useRef(null);
  const tutupRef = useRef(onTutup);
  tutupRef.current = onTutup;
  useEffect(() => {
    const asal = document.activeElement;
    terbuka++;
    document.body.classList.add('modal-buka');
    const t = window.setTimeout(() => { if (ref.current) ref.current.focus(); }, 0);
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        tutupRef.current();
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') e.stopPropagation();
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey, true);
      terbuka = Math.max(0, terbuka - 1);
      if (!terbuka) document.body.classList.remove('modal-buka');
      if (asal && typeof asal.focus === 'function') { try { asal.focus(); } catch (e) { /* abaikan */ } }
    };
  }, []);
  return ref;
}

function Kepala({ judul, sub, onTutup, idJudul }) {
  return (
    <div className="modal-kepala">
      <div className="modal-judul-blok">
        <div className="modal-judul" id={idJudul}>{judul}</div>
        {sub ? <div className="modal-sub">{sub}</div> : null}
      </div>
      <button type="button" className="modal-x" onClick={onTutup} aria-label="Tutup">×</button>
    </div>
  );
}

let urut = 0;

export function Modal({ judul, sub, onTutup, kaki, lebar, children }) {
  const ref = useJendela(onTutup);
  const idJudul = useRef('mj' + (++urut)).current;
  return (
    <div className="modal-latar" onMouseDown={(e) => { if (e.target === e.currentTarget) onTutup(); }}>
      <div className={'modal' + (lebar ? ' modal-lebar' : '')} role="dialog" aria-modal="true"
           aria-labelledby={idJudul} tabIndex={-1} ref={ref}>
        <Kepala judul={judul} sub={sub} onTutup={onTutup} idJudul={idJudul} />
        <div className="modal-isi">{children}</div>
        {kaki ? <div className="modal-kaki">{kaki}</div> : null}
      </div>
    </div>
  );
}

export function LembarSamping({ judul, sub, onTutup, kaki, children }) {
  const ref = useJendela(onTutup);
  const idJudul = useRef('mj' + (++urut)).current;
  return (
    <div className="modal-latar modal-latar-samping" onMouseDown={(e) => { if (e.target === e.currentTarget) onTutup(); }}>
      <aside className="modal modal-samping" role="dialog" aria-modal="true" aria-labelledby={idJudul}
             tabIndex={-1} ref={ref}>
        <Kepala judul={judul} sub={sub} onTutup={onTutup} idJudul={idJudul} />
        <div className="modal-isi">{children}</div>
        {kaki ? <div className="modal-kaki">{kaki}</div> : null}
      </aside>
    </div>
  );
}
