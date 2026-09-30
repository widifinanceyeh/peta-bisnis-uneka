import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useDraf (v5.6) — ketikan yang belum tersimpan tidak pernah hilang.
 *
 * Nilai disimpan di peramban (localStorage) setiap kali berubah, dengan kunci per isian
 * (mis. 'redaksi:B008.02'). Bila simpan gagal, halaman ditutup, atau aplikasi dimuat ulang,
 * ketikan dipulihkan saat isian yang sama dibuka lagi. Draf dilepas hanya sesudah simpan berhasil
 * atau pengguna menekan Batal.
 *
 * @param {string} kunci  pengenal isian; bila berganti, nilai dibaca ulang untuk kunci baru
 * @param {*} awal        nilai bila belum ada draf (nilai tersimpan di server)
 * @return {[nilai, setNilai, lepas, adaDraf]}
 */
const AWALAN = 'pb.draf.v56.';

export function bacaDraf(kunci) {
  try {
    const s = window.localStorage.getItem(AWALAN + kunci);
    return s == null ? undefined : JSON.parse(s);
  } catch (e) { return undefined; }
}

export function tulisDraf(kunci, nilai) {
  try { window.localStorage.setItem(AWALAN + kunci, JSON.stringify(nilai)); } catch (e) { /* ruang penuh: draf hanya di layar */ }
}

export function hapusDraf(kunci) {
  try { window.localStorage.removeItem(AWALAN + kunci); } catch (e) { /* abaikan */ }
}

export default function useDraf(kunci, awal) {
  const awalRef = useRef(awal);
  awalRef.current = awal;
  const [nilai, setState] = useState(() => { const d = bacaDraf(kunci); return d === undefined ? awal : d; });
  const [adaDraf, setAdaDraf] = useState(() => bacaDraf(kunci) !== undefined);
  const kunciRef = useRef(kunci);

  useEffect(() => {
    if (kunciRef.current === kunci) return;
    kunciRef.current = kunci;
    const d = bacaDraf(kunci);
    setState(d === undefined ? awalRef.current : d);
    setAdaDraf(d !== undefined);
  }, [kunci]);

  const setNilai = useCallback((v) => {
    setState((lama) => {
      const baru = typeof v === 'function' ? v(lama) : v;
      tulisDraf(kunciRef.current, baru);
      return baru;
    });
    setAdaDraf(true);
  }, []);

  const lepas = useCallback((kembaliKe) => {
    hapusDraf(kunciRef.current);
    setAdaDraf(false);
    if (kembaliKe !== undefined) setState(kembaliKe);
  }, []);

  return [nilai, setNilai, lepas, adaDraf];
}
