import React, { useEffect, useState } from 'react';
import { APP_VERSION } from '../config';

/**
 * Bilah atas. Versi 5.3: menu halaman (Peta · Naskah · Telaah · Daftar kerja) dan sakelar ruang
 * Rapat / Kerja yang berlaku untuk seluruh aplikasi. Angka pekerjaan tidak lagi tampil di bilah atas;
 * semuanya dikumpulkan pada Daftar kerja (ruang Kerja). Label menu dibaca dari Cfg_App.
 * Versi 5.4: Refresh, Diagnosa, dan nomor versi dipindah ke satu menu ⋯.
 * Versi 5.6: penanda kecil "memperbarui…" selama paket data diunduh di latar.
 * Versi 5.8: tombol Kembali (satu langkah riwayat); tampil hanya bila ada langkah sebelumnya di dalam aplikasi.
 * Versi 5.22: sepasang ikon Mundur dan Maju yang selalu tampil; pudar bila tidak ada langkah yang dituju.
 */
const Panah = ({ arah }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
    <path d={arah === 'kiri' ? 'M10 3 5 8l5 5' : 'M6 3l5 5-5 5'} fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function TopBar({ judul, subJudul, onSegarkan, onDiagnosa, sedangMuat, mundur, maju, menu, ruang, onRuang, memperbarui }) {
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
        <div className="topbar-nav" role="group" aria-label="Riwayat halaman">
          <button type="button" className="topbar-nav-tbl" onClick={mundur || undefined} disabled={!mundur}
                  aria-label="Mundur ke halaman sebelumnya" title="Mundur ke halaman sebelumnya">
            <Panah arah="kiri" />
          </button>
          <button type="button" className="topbar-nav-tbl" onClick={maju || undefined} disabled={!maju}
                  aria-label="Maju ke halaman berikutnya" title="Maju ke halaman berikutnya">
            <Panah arah="kanan" />
          </button>
        </div>
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
        {memperbarui ? <span className="topbar-perbarui" role="status">memperbarui…</span> : null}
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
