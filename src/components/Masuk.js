import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { simpanToken } from '../akses';

/**
 * Masuk.js (v5.23) — halaman masuk satu pengguna.
 * lapis=true: tampil di atas aplikasi saat sesi berakhir di tengah pemakaian,
 * sehingga ketikan yang belum tersimpan tidak hilang.
 */
export default function Masuk({ onMasuk, lapis }) {
  const [pengguna, setPengguna] = useState('');
  const [sandi, setSandi] = useState('');
  const [lihat, setLihat] = useState(false);
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState('');
  const refAwal = useRef(null);

  useEffect(() => { if (refAwal.current) refAwal.current.focus(); }, []);

  const kirim = async (e) => {
    e.preventDefault();
    if (sibuk) return;
    if (!pengguna.trim() || !sandi) { setGalat('Isi nama pengguna dan sandi.'); return; }
    setSibuk(true); setGalat('');
    try {
      const hasil = await api.login(pengguna.trim(), sandi);
      simpanToken(hasil.token);
      onMasuk();
    } catch (x) {
      setGalat(x.message || 'Gagal masuk.');
      setSibuk(false);
    }
  };

  return (
    <div className={'masuk-latar' + (lapis ? ' masuk-lapis' : '')}>
      <form className="masuk-kartu" onSubmit={kirim} noValidate>
        <div className="masuk-judul">{document.title || 'Aplikasi'}</div>
        <div className="masuk-sub">{lapis ? 'Sesi berakhir. Silakan masuk lagi untuk melanjutkan.' : 'Silakan masuk untuk membuka data.'}</div>

        <label className="masuk-medan">
          <span>Nama pengguna</span>
          <input ref={refAwal} className="inp" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false}
                 value={pengguna} onChange={(e) => setPengguna(e.target.value)} />
        </label>

        <label className="masuk-medan">
          <span>Sandi</span>
          <div className="masuk-sandi">
            <input className="inp" type={lihat ? 'text' : 'password'} autoComplete="current-password"
                   value={sandi} onChange={(e) => setSandi(e.target.value)} />
            <button type="button" className="masuk-lihat" onClick={() => setLihat(!lihat)}
                    aria-label={lihat ? 'Sembunyikan sandi' : 'Tampilkan sandi'}>{lihat ? 'Sembunyikan' : 'Tampilkan'}</button>
          </div>
        </label>

        {galat ? <div className="masuk-galat" role="alert">{galat}</div> : null}

        <button type="submit" className="tbl masuk-tombol" disabled={sibuk}>{sibuk ? 'Memeriksa…' : 'Masuk'}</button>
      </form>
    </div>
  );
}
