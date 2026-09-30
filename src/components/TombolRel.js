import React, { useEffect, useState } from 'react';
import { STORAGE_KEY } from '../config';

/**
 * Tombol sembunyikan/tampilkan panel daftar kiri (v5.5). Satu setelan untuk Naskah, Telaah, Periksa,
 * dan Dokumen Turunan, diingat per perangkat. Saat tersembunyi, panel menyusut menjadi lajur 48px
 * berisi tombol ini saja di posisi yang sama, dan isi halaman melebar penuh.
 *
 * v5.7 — layar sempit (HP/tablet, lebar ≤ 980px): panel daftar menjadi laci yang ditarik dari kiri.
 * Laci dibuka dengan tombol "Daftar" di kiri bawah (TombolLaci) dan ditutup dengan tombol panel yang sama
 * di dalam laci, dengan mengetuk area gelap di luarnya, dengan Esc, atau otomatis sesudah satu butir dipilih.
 */
const LAYAR_SEMPIT = '(max-width: 980px)';

function sempit() {
  try { return window.matchMedia(LAYAR_SEMPIT).matches; } catch (e) { return false; }
}
function bacaCiut() {
  try { return window.localStorage.getItem(STORAGE_KEY.REL_CIUT) === '1'; } catch (e) { return false; }
}
function terapkan(ciut) {
  try { document.documentElement.classList.toggle('rel-ciut', ciut); } catch (e) { /* abaikan */ }
}
terapkan(bacaCiut());

/** Buka (true) atau tutup (false) laci daftar di layar sempit. */
export function bukaLaci(buka) {
  try { document.documentElement.classList.toggle('rel-laci', !!buka); } catch (e) { /* abaikan */ }
}

function Ikon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="1.5" y="2.5" width="13" height="11" rx="2" /><line x1="6" y1="2.5" x2="6" y2="13.5" />
    </svg>
  );
}

export default function TombolRel() {
  const [ciut, setCiut] = useState(bacaCiut);
  useEffect(() => {
    terapkan(ciut);
    try { window.localStorage.setItem(STORAGE_KEY.REL_CIUT, ciut ? '1' : '0'); } catch (e) { /* abaikan */ }
  }, [ciut]);
  const klik = () => { if (sempit()) bukaLaci(false); else setCiut(!ciut); };
  const judul = sempit() ? 'Tutup daftar' : (ciut ? 'Tampilkan daftar' : 'Sembunyikan daftar');
  return (
    <button type="button" className="rel-tombol" onClick={klik} title={judul} aria-label={judul} aria-pressed={ciut}>
      <Ikon />
    </button>
  );
}

/** Baris atas panel daftar: kotak cari (bila ada) dan tombol panel dalam satu baris. */
export function RelAtas({ children }) {
  return <div className="rel-atas">{children}<TombolRel /></div>;
}

/**
 * Tombol pembuka laci daftar untuk layar sempit (tidak tampil di layar lebar). Diletakkan di dalam .nk-wrap
 * setiap halaman berpanel daftar. Memilih butir daftar (.nk-item) menutup laci.
 */
export function TombolLaci({ label }) {
  useEffect(() => {
    const klik = (e) => {
      if (!document.documentElement.classList.contains('rel-laci')) return;
      const t = e.target && e.target.closest ? e.target.closest('.nk-rel .nk-item') : null;
      if (t) setTimeout(() => bukaLaci(false), 0);
    };
    const tombol = (e) => { if (e.key === 'Escape') bukaLaci(false); };
    document.addEventListener('click', klik);
    document.addEventListener('keydown', tombol);
    return () => {
      document.removeEventListener('click', klik);
      document.removeEventListener('keydown', tombol);
      bukaLaci(false);
    };
  }, []);
  return (
    <>
      <button type="button" className="laci-tombol" onClick={() => bukaLaci(true)} aria-label={'Buka ' + (label || 'daftar')}>
        <Ikon /><span>{label || 'Daftar'}</span>
      </button>
      <div className="laci-latar" onClick={() => bukaLaci(false)} aria-hidden="true" />
    </>
  );
}
