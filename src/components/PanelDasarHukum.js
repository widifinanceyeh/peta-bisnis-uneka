import React, { useEffect, useState } from 'react';
import { LembarSamping } from './Modal';
import { langganNaskah, ambilNaskah, muatDasarHukum } from '../naskah';

/**
 * Lembar samping dasar hukum (v5.0): kutipan pada catatan naskah, bunyi pasal aturan
 * dari pustaka dasar hukum (Sheet terpisah, lewat tab 10-PUSTAKA-DH), dan pasal lain
 * pada naskah yang merujuk aturan yang sama.
 */
export default function PanelDasarHukum({ item, pasal, onTutup, onBukaPasal }) {
  const [n, setN] = useState(ambilNaskah);
  const [galat, setGalat] = useState('');
  useEffect(() => langganNaskah(setN), []);
  const q = item.q || '';
  useEffect(() => {
    if (!q) return;
    setGalat('');
    muatDasarHukum(q).catch((e) => setGalat((e && e.message) || String(e)));
  }, [q]);
  const d = q ? n.hukum[q] : null;
  const lain = d ? d.lain.filter((p) => Number(p) !== Number(pasal)) : [];

  return (
    <LembarSamping judul={d && d.kunci ? d.kunci + (d.tab ? ' · ' + d.tab : '') : 'Dasar hukum'}
                   sub={'Dirujuk catatan Pasal ' + pasal}
                   onTutup={onTutup}
                   kaki={<button type="button" className="tbl" onClick={onTutup}>Tutup</button>}>
      <div className="intip-blok">
        <div className="blok-label">RUJUKAN PADA CATATAN NASKAH</div>
        <div className="teks-baru">{item.t}</div>
      </div>
      {d && d.alamat && d.alamat.length > 1 ? (
        <div className="intip-blok">
          <div className="blok-label">ALAMAT YANG DIKUTIP ({d.alamat.length})</div>
          <div className="chip-baris">
            {d.alamat.map((a, i) => (
              <span key={i} className={'dh-alamat ' + (a.ada ? 'dh-alamat-ok' : 'dh-alamat-hilang')}>{a.ada ? '✓' : '✗'} {a.teks}</span>
            ))}
          </div>
        </div>
      ) : null}
      <div className="intip-blok">
        <div className="blok-label">BUNYI ATURAN</div>
        {!q ? <div className="redup">Nama aturan tidak terbaca dari baris ini.</div>
          : galat ? <div className="galat-kotak">{galat}</div>
          : !d ? <div className="intip-muat">Membaca pustaka dasar hukum…</div>
          : d.ada ? (
            <div className="dh-baris">
              {d.alasan ? <div className="jj-pesan">{d.alasan}</div> : null}
              {d.baris.map((b, i) => (
                <div key={i} className="dh-item"><span className="dh-label">{b[0]}</span><span className="teks-pre">{b[1]}</span></div>
              ))}
            </div>
          ) : <div className="panel-info">{d.alasan || 'Bunyi tidak ditemukan pada pustaka.'}</div>}
      </div>
      {d && lain.length ? (
        <div className="intip-blok">
          <div className="blok-label">ATURAN YANG SAMA DIRUJUK JUGA OLEH ({lain.length})</div>
          <div className="chip-baris">
            {lain.map((p) => (
              <button type="button" key={p} className="chip-urusan" onClick={() => { onTutup(); onBukaPasal(p); }}>Pasal {p}</button>
            ))}
          </div>
        </div>
      ) : null}
    </LembarSamping>
  );
}
