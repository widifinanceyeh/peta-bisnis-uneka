import { useCallback, useEffect, useState } from 'react';
import { langgan, mulai, ambilKeadaan, segarkanPaksa, simpanBaris } from '../awal';

/**
 * Daftar urusan dan penyimpanannya.
 *
 * Sheet tetap satu-satunya sumber kebenaran. Yang berubah pada versi 4.6:
 *  - data datang dari action=init (satu permintaan) dan teks panjang menyusul;
 *  - perubahan digambar lebih dulu, permintaan simpan menyusul, dan nilai akhir
 *    tetap diambil dari jawaban backend;
 *  - bila layar sudah terisi snapshot, kegagalan sesaat tidak mengosongkannya.
 */
export default function useData() {
  const [s, setS] = useState(ambilKeadaan);

  useEffect(() => {
    mulai();
    return langgan(setS);
  }, []);

  const muat = useCallback(() => segarkanPaksa(), []);
  const simpan = useCallback((muatan) => simpanBaris(muatan), []);

  return {
    urusan: s.urusan,
    format: s.format,
    pilihan: s.pilihan,
    kelompok: s.kelompok,
    ts: s.ts,
    memuat: s.memuat,
    menyegarkan: s.menyegarkan,
    // Galat hanya ditampilkan bila memang tidak ada yang bisa digambar.
    galat: s.urusan && s.urusan.length ? '' : s.galat,
    koneksi: s.koneksi,
    dariSnapshot: s.dariSnapshot,
    menyimpan: s.menyimpan,
    muatUlang: muat,
    segarkan: muat,
    simpan
  };
}