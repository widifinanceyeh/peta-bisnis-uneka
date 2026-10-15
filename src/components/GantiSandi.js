import React, { useState } from 'react';
import { Modal } from './Modal';
import { api } from '../api';
import { simpanToken } from '../akses';

/** GantiSandi.js (v5.23) — mengganti sandi admin. Perangkat lain harus masuk ulang sesudahnya. */
export default function GantiSandi({ onTutup, onSelesai }) {
  const [lama, setLama] = useState('');
  const [baru, setBaru] = useState('');
  const [ulang, setUlang] = useState('');
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState('');

  const kirim = async (e) => {
    if (e) e.preventDefault();
    if (sibuk) return;
    if (!lama || !baru) { setGalat('Isi sandi lama dan sandi baru.'); return; }
    if (baru.length < 6) { setGalat('Sandi baru minimal 6 karakter.'); return; }
    if (baru !== ulang) { setGalat('Ulangan sandi baru tidak sama.'); return; }
    setSibuk(true); setGalat('');
    try {
      const hasil = await api.gantiSandi(lama, baru);
      simpanToken(hasil.token);
      onSelesai();
    } catch (x) {
      setGalat(x.message || 'Sandi gagal diganti.');
      setSibuk(false);
    }
  };

  const kaki = (
    <>
      <button type="button" className="tbl tbl-ringan" onClick={onTutup}>Batal</button>
      <button type="button" className="tbl" onClick={kirim} disabled={sibuk}>{sibuk ? 'Menyimpan…' : 'Ganti sandi'}</button>
    </>
  );

  return (
    <Modal judul="Ganti sandi" sub="Sesudah diganti, perangkat lain perlu masuk ulang." onTutup={onTutup} kaki={kaki}>
      <form className="sandi-form" onSubmit={kirim}>
        <label className="masuk-medan"><span>Sandi lama</span>
          <input className="inp" type="password" autoComplete="current-password" value={lama} onChange={(e) => setLama(e.target.value)} />
        </label>
        <label className="masuk-medan"><span>Sandi baru (minimal 6 karakter)</span>
          <input className="inp" type="password" autoComplete="new-password" value={baru} onChange={(e) => setBaru(e.target.value)} />
        </label>
        <label className="masuk-medan"><span>Ulangi sandi baru</span>
          <input className="inp" type="password" autoComplete="new-password" value={ulang} onChange={(e) => setUlang(e.target.value)} />
        </label>
        {galat ? <div className="masuk-galat" role="alert">{galat}</div> : null}
        <button type="submit" hidden aria-hidden="true" />
      </form>
    </Modal>
  );
}
