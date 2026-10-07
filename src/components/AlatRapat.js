import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { api } from '../api';
import { STORAGE_KEY } from '../config';

/**
 * v5.17: alat rapat pada halaman Naskah — rekap hasil rapat per tanggal (siap cetak), bekukan versi rapat,
 * dan pilih versi pembanding. Semuanya dibuka dari menu "⋯" di kepala pasal sehingga tidak menambah tombol di layar.
 */

const JENIS = { catatan: 'Catatan rapat', redaksi: 'Usulan redaksi', jejak: 'Jejak dikonfirmasi' };

export function RekapRapat({ onTutup, onBukaPasal }) {
  const [tgl, setTgl] = useState('');
  const [data, setData] = useState(null);
  const [galat, setGalat] = useState('');
  useEffect(() => {
    let hidup = true;
    setData(null); setGalat('');
    api.rekapRapat(tgl).then((d) => { if (hidup) setData(d); }).catch((e) => { if (hidup) setGalat((e && e.message) || String(e)); });
    return () => { hidup = false; };
  }, [tgl]);
  const cetak = () => {
    document.body.classList.add('cetak-rekap');
    const lepas = () => { document.body.classList.remove('cetak-rekap'); window.removeEventListener('afterprint', lepas); };
    window.addEventListener('afterprint', lepas);
    window.print();
    window.setTimeout(lepas, 1500);
  };
  const butir = (data && data.butir) || [];
  const per = [];
  butir.forEach((b) => { const k = String(b.pasal); let g = per.find((x) => x.k === k); if (!g) { g = { k, pasal: b.pasal, isi: [] }; per.push(g); } g.isi.push(b); });
  const hitung = { catatan: 0, redaksi: 0, jejak: 0 };
  butir.forEach((b) => { hitung[b.jenis] = (hitung[b.jenis] || 0) + 1; });
  return (
    <Modal judul="Rekap rapat" sub="Catatan rapat, usulan redaksi, dan jejak yang dikonfirmasi pada satu tanggal" onTutup={onTutup} lebar
           kaki={<>
             <button type="button" className="tbl tbl-ringan" onClick={onTutup}>Tutup</button>
             <button type="button" className="tbl" onClick={cetak} disabled={!butir.length}>Cetak</button>
           </>}>
      <div className="rk-alat">
        <label className="rk-pilih">
          <span>Tanggal</span>
          <select className="inp" value={data ? data.tanggal : tgl} onChange={(e) => setTgl(e.target.value)} disabled={!data}>
            {((data && data.tersedia) || []).map((t) => <option key={t.tanggal} value={t.tanggal}>{t.tanggal} · {t.jumlah} butir</option>)}
            {data && !data.tersedia.length ? <option value="">Belum ada isi</option> : null}
          </select>
        </label>
        {data && butir.length ? <span className="kecil redup">{Object.keys(hitung).filter((k) => hitung[k]).map((k) => hitung[k] + ' ' + JENIS[k].toLowerCase()).join(' · ')}</span> : null}
      </div>
      {galat ? <div className="galat-kotak">{galat}</div> : null}
      {!data && !galat ? <div className="nk-muat">Menyusun rekap…</div> : null}
      {data && !butir.length ? <div className="redup kecil">Belum ada catatan, usulan, atau konfirmasi jejak pada tanggal ini.</div> : null}
      {butir.length ? (
        <div className="rekap-cetak">
          <div className="rk-judul">Rekap Pembahasan Statuta · {data.tanggal}</div>
          {per.map((g) => (
            <div key={g.k} className="rk-pasal">
              <div className="rk-pasal-judul">
                {onBukaPasal ? <button type="button" className="tautan" onClick={() => { onTutup(); onBukaPasal(g.pasal); }}>{g.pasal === 0 ? 'Pembukaan' : 'Pasal ' + g.pasal}</button>
                  : (g.pasal === 0 ? 'Pembukaan' : 'Pasal ' + g.pasal)}
              </div>
              <table className="rk-tabel">
                <tbody>
                  {g.isi.map((b, i) => (
                    <tr key={i}>
                      <td className="rk-letak">{b.letak}</td>
                      <td className="rk-jenis"><span className={'rk-tag rk-' + b.jenis}>{JENIS[b.jenis]}</span></td>
                      <td>
                        <div className="teks-pre">{b.teks || '—'}</div>
                        {b.alasan ? <div className="kecil redup">Alasan: {b.alasan}</div> : null}
                      </td>
                      <td className="rk-st">{b.status}{b.oleh ? <div className="kecil redup">{b.oleh}</div> : null}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ) : null}
    </Modal>
  );
}

export function BekukanVersi({ onTutup, onSelesai }) {
  const hariIni = new Date().toISOString().slice(0, 10);
  const [label, setLabel] = useState('Rapat ' + hariIni);
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState('');
  const kirim = async () => {
    setSibuk(true); setPesan('');
    try {
      let oleh = ''; try { oleh = window.localStorage.getItem(STORAGE_KEY.OLEH) || ''; } catch (e) { /* abaikan */ }
      const h = await api.bekukanVersi({ label, oleh });
      onSelesai(h);
    } catch (e) { setPesan((e && e.message) || String(e)); }
    finally { setSibuk(false); }
  };
  return (
    <Modal judul="Bekukan versi rapat" sub="Menyimpan bunyi seluruh ayat saat ini sebagai titik banding" onTutup={onTutup}
           kaki={<>
             <button type="button" className="tbl tbl-ringan" onClick={onTutup} disabled={sibuk}>Batal</button>
             <button type="button" className="tbl" onClick={kirim} disabled={sibuk || !label.trim()}>{sibuk ? 'Membekukan…' : 'Bekukan'}</button>
           </>}>
      <label className="jj-medan jj-lebar">
        <span>Nama versi</span>
        <input className="inp" value={label} maxLength={60} onChange={(e) => setLabel(e.target.value)}
               onKeyDown={(e) => { if (e.key === 'Enter' && !sibuk) kirim(); }} autoFocus />
      </label>
      <p className="kecil redup">Sesudah dibekukan, pilih versi ini lewat "Banding sejak versi rapat" untuk menandai ayat yang berubah sesudahnya.</p>
      {pesan ? <div className="jj-pesan">{pesan}</div> : null}
    </Modal>
  );
}

export function PilihBanding({ aktif, onTutup, onPilih }) {
  const [daftar, setDaftar] = useState(null);
  const [galat, setGalat] = useState('');
  useEffect(() => {
    api.bandingVersi('').then((d) => setDaftar(d.daftar || [])).catch((e) => setGalat((e && e.message) || String(e)));
  }, []);
  return (
    <Modal judul="Banding sejak versi rapat" sub="Ayat yang berubah atau baru sesudah versi ini diberi tanda" onTutup={onTutup}
           kaki={<button type="button" className="tbl tbl-ringan" onClick={onTutup}>Tutup</button>}>
      {galat ? <div className="galat-kotak">{galat}</div> : null}
      {!daftar && !galat ? <div className="nk-muat">Membaca versi…</div> : null}
      {daftar && !daftar.length ? <div className="redup kecil">Belum ada versi yang dibekukan. Pilih "Bekukan versi rapat" lebih dulu.</div> : null}
      {daftar && daftar.length ? (
        <div className="bv-daftar">
          {daftar.map((v) => (
            <button type="button" key={v.label} className={'bv-butir' + (v.label === aktif ? ' aktif' : '')} onClick={() => onPilih(v.label)}>
              <b>{v.label}</b><span className="kecil redup">{v.tanggal} · {v.jumlah} ayat</span>
            </button>
          ))}
        </div>
      ) : null}
    </Modal>
  );
}
