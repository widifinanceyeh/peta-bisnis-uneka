import React, { useState } from 'react';
import { api } from '../api';
import { Modal } from './Modal';

/** Panel pemeriksaan mandiri. Hanya membaca, tidak pernah menulis ke Sheet. */
export default function Diagnosa({ onTutup }) {
  const [hasil, setHasil] = useState(null);
  const [galat, setGalat] = useState('');
  const [jalan, setJalan] = useState(false);

  const periksa = async () => {
    setJalan(true);
    setGalat('');
    setHasil(null);
    try {
      setHasil(await api.diagnosa());
    } catch (e) {
      setGalat(e.message || String(e));
    } finally {
      setJalan(false);
    }
  };

  return (
    <Modal
      judul="Diagnosa sambungan dan data"
      sub="Memeriksa konfigurasi, keberadaan sheet, isi kolom ID, dan pemetaan kolom. Tidak ada data yang ditulis."
      onTutup={onTutup}
      lebar
      kaki={(
        <>
          <button type="button" className="tbl tbl-ringan" onClick={onTutup}>Tutup</button>
          <button type="button" className="tbl tbl-utama" onClick={periksa} disabled={jalan}>
            {jalan ? 'Memeriksa…' : 'Jalankan pemeriksaan'}
          </button>
        </>
      )}
    >
      {galat ? <div className="galat-kotak">{galat}</div> : null}
      {!hasil && !galat ? <p className="kecil">Tekan “Jalankan pemeriksaan” untuk memulai.</p> : null}
      {hasil ? (
        <div className="diag">
          <table className="diag-tabel">
            <tbody>
              {hasil.periksa.map((p, i) => (
                <tr key={i}>
                  <td className={'diag-ikon ' + (p.lulus ? 'lulus' : 'gagal')}>{p.lulus ? '✓' : '✕'}</td>
                  <td className="diag-nama">{p.nama}</td>
                  <td className="diag-catatan">{p.catatan}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className={'diag-kesimpulan' + (hasil.periksa.every((p) => p.lulus) ? ' baik' : ' buruk')}>
            {hasil.kesimpulan}
          </div>
          <div className="kecil">Versi kode backend: {hasil.versiKode}</div>
        </div>
      ) : null}
    </Modal>
  );
}
