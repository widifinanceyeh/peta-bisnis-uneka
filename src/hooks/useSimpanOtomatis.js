import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Simpan otomatis dengan jeda.
 *
 * Perilaku yang dijamin:
 *  1. Perubahan dikirim setelah pengguna berhenti mengubah selama `jeda` ms.
 *  2. Klik beruntun hanya menghasilkan SATU permintaan, bukan satu per klik.
 *  3. Bila permintaan sebelumnya belum selesai, perubahan berikutnya
 *     diantrekan, tidak dikirim bersamaan. Urutan tulis ke sheet terjaga.
 *  4. `paksa()` mengirim seketika tanpa menunggu jeda. Dipakai saat halaman rincian
 *     ditinggalkan dan saat tab disembunyikan, supaya tidak ada perubahan hilang.
 *  5. Muatan yang isinya sama persis dengan yang terakhir berhasil dikirim
 *     tidak dikirim ulang.
 *
 * Hook ini tidak tahu apa pun tentang bentuk data. Pembanding dan pengirim
 * diserahkan pemanggil.
 *
 * @param {function} kirim      async (muatan) => hasil
 * @param {number}   jeda       milidetik
 * @param {function} onGalat    (pesan) => void
 */
export default function useSimpanOtomatis(kirim, jeda, onGalat) {
  const [status, setStatus] = useState('bersih'); // bersih|menunggu|menyimpan|tersimpan|galat
  const [galat, setGalat] = useState('');

  const jamRef = useRef(null);
  const tertundaRef = useRef(null);      // muatan yang menunggu dikirim
  const sedangRef = useRef(false);       // ada permintaan berjalan
  const terakhirRef = useRef('');        // sidik jari muatan terakhir yang sukses
  const bekuRef = useRef(false);         // benar sesudah gagal, sampai ada perubahan baru
  const hidupRef = useRef(true);

  const kirimRef = useRef(kirim);
  const galatRef = useRef(onGalat);
  useEffect(() => { kirimRef.current = kirim; }, [kirim]);
  useEffect(() => { galatRef.current = onGalat; }, [onGalat]);

  useEffect(() => () => { hidupRef.current = false; }, []);

  const jalankan = useCallback(async () => {
    if (sedangRef.current) return;
    const muatan = tertundaRef.current;
    if (!muatan) return;

    const sidik = JSON.stringify(muatan);
    if (sidik === terakhirRef.current) {
      tertundaRef.current = null;
      if (hidupRef.current) setStatus('tersimpan');
      return;
    }

    tertundaRef.current = null;
    sedangRef.current = true;
    if (hidupRef.current) { setStatus('menyimpan'); setGalat(''); }

    try {
      await kirimRef.current(muatan);
      terakhirRef.current = sidik;
      if (hidupRef.current) setStatus(tertundaRef.current ? 'menunggu' : 'tersimpan');
    } catch (e) {
      const pesan = e && e.message ? e.message : String(e);
      // Muatan yang gagal dikembalikan ke antrean supaya perubahan itu tidak
      // hilang, TETAPI pengiriman ulang otomatis dibekukan. Tanpa pembekuan
      // ini, galat yang menetap — misalnya deployment salah atau tabrakan
      // kolom — akan memicu pengiriman berulang tanpa henti. Pembekuan
      // dicairkan begitu pengguna melakukan perubahan berikutnya, atau saat
      // halaman rincian ditinggalkan lewat paksa().
      if (!tertundaRef.current) { tertundaRef.current = muatan; bekuRef.current = true; }
      if (hidupRef.current) { setStatus('galat'); setGalat(pesan); }
      if (galatRef.current) galatRef.current(pesan);
    } finally {
      sedangRef.current = false;
      if (tertundaRef.current && !bekuRef.current) {
        // Ada perubahan yang masuk saat permintaan berjalan. Kirim menyusul.
        window.setTimeout(() => { jalankan(); }, 0);
      }
    }
  }, []);

  /** Menjadwalkan pengiriman setelah jeda. Memanggil ulang akan me-reset jeda. */
  const jadwalkan = useCallback((muatan) => {
    bekuRef.current = false;
    tertundaRef.current = muatan;
    const sidik = JSON.stringify(muatan);
    if (sidik === terakhirRef.current) {
      tertundaRef.current = null;
      if (jamRef.current) { window.clearTimeout(jamRef.current); jamRef.current = null; }
      if (hidupRef.current) setStatus((s) => (s === 'galat' ? s : 'tersimpan'));
      return;
    }
    if (hidupRef.current) setStatus('menunggu');
    if (jamRef.current) window.clearTimeout(jamRef.current);
    jamRef.current = window.setTimeout(() => { jamRef.current = null; jalankan(); }, jeda);
  }, [jalankan, jeda]);

  /** Mengirim seketika. Dipakai saat berpindah halaman atau tab ditinggalkan. */
  const paksa = useCallback((muatan) => {
    if (jamRef.current) { window.clearTimeout(jamRef.current); jamRef.current = null; }
    bekuRef.current = false;
    if (muatan !== undefined) tertundaRef.current = muatan;
    return jalankan();
  }, [jalankan]);

  /** Menandai keadaan awal sebagai sudah tersimpan, tanpa mengirim apa pun. */
  const tetapkanAcuan = useCallback((muatan) => {
    if (jamRef.current) { window.clearTimeout(jamRef.current); jamRef.current = null; }
    tertundaRef.current = null;
    bekuRef.current = false;
    terakhirRef.current = JSON.stringify(muatan);
    if (hidupRef.current) { setStatus('bersih'); setGalat(''); }
  }, []);

  const adaTertunda = () => tertundaRef.current !== null || sedangRef.current;

  return { status, galat, jadwalkan, paksa, tetapkanAcuan, adaTertunda };
}
