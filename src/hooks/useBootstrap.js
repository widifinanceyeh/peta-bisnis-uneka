import { useEffect, useState } from 'react';
import { langgan, mulai, ambilKeadaan, segarkanPaksa } from '../awal';

/**
 * Konfigurasi dari Sheet. Versi 4.6: tidak lagi memanggil action=bootstrap
 * tersendiri — konfigurasi datang bersama data lewat action=init, sehingga
 * saat dibuka hanya ada satu permintaan.
 */
export default function useBootstrap() {
  const [s, setS] = useState(ambilKeadaan);

  useEffect(() => {
    mulai();
    return langgan(setS);
  }, []);

  return {
    cfg: s.cfg,
    memuat: s.memuat,
    galat: s.cfg ? '' : s.galat,
    muatUlang: segarkanPaksa
  };
}