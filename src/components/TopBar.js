import React, { useEffect, useState } from 'react';
import { APP_VERSION } from '../config';

/**
 * Bilah atas. Versi 5.3: menu halaman (Peta · Naskah · Telaah · Daftar kerja) dan sakelar ruang
 * Rapat / Kerja yang berlaku untuk seluruh aplikasi. Angka pekerjaan tidak lagi tampil di bilah atas;
 * semuanya dikumpulkan pada Daftar kerja (ruang Kerja). Label menu dibaca dari Cfg_App.
 * Versi 5.4: Refresh, Diagnosa, dan nomor versi dipindah ke satu menu ⋯.
 */
export default function TopBar({ judul, subJudul, onSegarkan, onDiagnosa, sedangMuat, kembali, menu, ruang, onRuang }) {
  const [lain, setLain] = useState(false);
  useEffect(() => {
    if (!lain) return undefined;
    const tutup = (e) => { if (!e.target.closest || !e.target.closest('.topbar-lain')) setLain(false); };
    document.addEventListener('mousedown', tutup);
    return () => document.removeEventListener('mousedown', tutup);
  }, [lain]);
  const jalankan = (fn) => () => { setLain(false); if (fn) fn(); };
  return (
    <header className="topbar">
      <div className="topbar-kiri">
        {kembali ? (
          <button className="tbl tbl-ringan" onClick={kembali} aria-label="Kembali">
            &larr; Kembali
          </button>
        ) : null}
        <div className="topbar-teks">
          <div className="topbar-judul">{judul}</div>
          {subJudul ? <div className="topbar-sub">{subJudul}</div> : null}
        </div>
        {menu && menu.length ? (
          <nav className="topbar-menu" aria-label="Halaman">
            {menu.map((m) => (
              <button key={m.kode} type="button" className={'topbar-tab' + (m.aktif ? ' aktif' : '')}
                      aria-current={m.aktif ? 'page' : undefined} onClick={m.onClick}>
                {m.label}{m.jumlah ? <span className="topbar-angka">{m.jumlah}</span> : null}
              </button>
            ))}
          </nav>
        ) : null}
      </div>
      <div className="topbar-kanan">
        {onRuang ? (
          <div className="topbar-ruang" role="group" aria-label="Ruang">
            <button type="button" className={ruang === 'rapat' ? 'aktif' : ''} onClick={() => onRuang('rapat')}
                    title="Untuk dibaca bersama Pimpinan: bunyi naskah, dasar perubahan, Monev, peta ringkas">Rapat</button>
            <button type="button" className={ruang === 'kerja' ? 'aktif' : ''} onClick={() => onRuang('kerja')}
                    title="Untuk notulis dan penyusun: jejak, pita peta penuh, usulan redaksi, pemeriksaan, Daftar kerja">Kerja</button>
          </div>
        ) : null}
        <div className="topbar-lain">
          <button type="button" className="tbl" onClick={() => setLain(!lain)} aria-expanded={lain} aria-label="Menu lain"
                  aria-busy={sedangMuat ? 'true' : 'false'}>{sedangMuat ? 'Menyegarkan…' : '⋯'}</button>
          {lain ? (
            <div className="topbar-lain-menu" role="menu">
              <button type="button" role="menuitem" onClick={jalankan(onSegarkan)} disabled={sedangMuat}
                      title="Bersihkan cache server lalu baca ulang data terbaru dari sheet">Refresh data</button>
              {onDiagnosa ? <button type="button" role="menuitem" onClick={jalankan(onDiagnosa)} title="Periksa sambungan dan data">Diagnosa</button> : null}
              <span className="versi">Versi {APP_VERSION}</span>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
