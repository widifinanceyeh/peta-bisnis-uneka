import React, { useEffect, useState } from 'react';
import { langganNaskah, ambilNaskah, muatInitNaskah, muatTelaah, muatLuar, simpanKembar } from '../naskah';
import { susunKerja, labelAyat } from '../utils/telaah';
import { ButirPermen, MuatanLuar } from './TelaahPage';
import { STORAGE_KEY } from '../config';
import { RelAtas, TombolLaci } from '../components/TombolRel';
import useDraf from '../hooks/useDraf';

/**
 * Halaman Periksa (v5.4, hanya ruang Kerja) — pengganti Daftar kerja.
 * Kiri: sisa pekerjaan sampai naskah final. Kanan: untuk butir yang dipilih, tujuan, patokan selesai,
 * caranya, lalu daftar yang belum selesai beserta tombol putusan atau tautan ke tempat mengerjakannya.
 * Butir Permen dan Muatan di luar peta dipindah ke sini dari halaman Telaah.
 * v5.5: tanpa butir "urusan belum dibahas rapat" dan "pasal tanpa dasar hukum"; jejak hanya ayat 2025 yang dihapus;
 * muatan di luar peta diputus per pasal.
 */
export default function DaftarKerjaPage({ onBukaTelaah, onBukaNaskah, urusan, onGalat, pilih: pilihProp, onPilih }) {
  const [n, setN] = useState(ambilNaskah);
  // v5.8: butir terpilih dipegang App (riwayat, tombol Kembali, posisi terakhir).
  const [pilihLokal, setPilihLokal] = useState('');
  const pilih = onPilih ? (pilihProp || '') : pilihLokal;
  const setPilih = onPilih || setPilihLokal;
  useEffect(() => langganNaskah(setN), []);
  useEffect(() => {
    muatInitNaskah().catch(() => {});
    muatTelaah().catch(() => {});
    muatLuar().catch(() => {});
  }, []);
  const daftar = susunKerja(n);
  const aktif = daftar.find((x) => x.kode === pilih) || daftar.find((x) => x.jumlah > 0) || daftar[0];
  const bukaPasal = (saring) => (p) => onBukaNaskah(saring, p);

  let isi = null;
  if (aktif.kode === 'PERMEN') isi = <ButirPermen n={n} onBukaPasal={bukaPasal('semua')} onPilih={onBukaTelaah} onGalat={onGalat} />;
  else if (aktif.kode === 'LUAR') isi = <MuatanLuar jenis="luar" n={n} urusan={urusan} onBukaPasal={bukaPasal('semua')} onGalat={onGalat} />;
  else if (aktif.kode === 'JEJAK') isi = <MuatanLuar jenis="hapus" n={n} urusan={urusan} onBukaPasal={bukaPasal('usulan')} onGalat={onGalat} />;
  else if (aktif.jumlah === 0) isi = <div className="pk-selesai">Selesai — tidak ada yang tersisa.</div>;
  else if (aktif.kode === 'KEMBAR') isi = <Kembar daftar={(n.telaah && n.telaah.kembar) || []} onBukaPasal={bukaPasal('semua')} />;
  else if (aktif.kode === 'MONEV') {
    isi = (
      <div className="tl-gulir pk-isi">
        <table className="tl-tabel tl-beku">
          <thead><tr><th style={{ width: 70 }}>Butir</th><th>Alamat pada BA</th><th style={{ width: 260 }}>Tidak ada di naskah 2026</th></tr></thead>
          <tbody>
            {aktif.monev.map((m) => (
              <tr key={m.butir}><td><b>{m.butir}</b></td><td>{m.tertuju || m.alamat}</td><td className="jj-pesan">{m.hilang.join(', ')}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  } else if (aktif.pasal) {
    const saring = { REDAKSI: 'redaksi' }[aktif.kode] || 'semua';
    isi = (
      <div className="tl-gulir pk-isi">
        <div className="chip-baris">
          {aktif.pasal.map((p) => <button type="button" key={p} className="chip-urusan" onClick={() => onBukaNaskah(saring, p)}>Pasal {p}</button>)}
        </div>
      </div>
    );
  }

  return (
    <div className="nk-wrap">
      <aside className="nk-rel" aria-label="Daftar periksa">
        <RelAtas><div className="nk-bab-judul rel-judul">SISA PEKERJAAN SAMPAI NASKAH FINAL</div></RelAtas>
        <div className="nk-daftar">
          {daftar.map((x) => (
            <button type="button" key={x.kode} className={'nk-item pk-item' + (x.kode === aktif.kode ? ' aktif' : '')} onClick={() => setPilih(x.kode)}>
              <span className="nk-item-judul">{x.label}</span>
              <b className={x.jumlah === 0 ? 'dk-nol' : 'dk-ada'}>{x.jumlah == null ? '…' : x.jumlah === 0 ? '✓' : x.jumlah}</b>
            </button>
          ))}
        </div>
      </aside>
      <TombolLaci label="Daftar periksa" />
      <main className="nk-utama tl-utama tl-kunci">
        <div className="tl-kepala">
          <h2 className="nk-judul">{aktif.label}{aktif.jumlah ? ' · ' + aktif.jumlah : ''}</h2>
          <dl className="pk-panduan">
            <dt>Tujuan</dt><dd>{aktif.tujuan}</dd>
            <dt>Selesai bila</dt><dd>{aktif.selesai}</dd>
            <dt>Caranya</dt><dd>{aktif.cara}</dd>
          </dl>
        </div>
        {isi}
      </main>
    </div>
  );
}

/** Pasangan dugaan ayat kembar, berdampingan, dengan satu putusan: "Bukan kembar" (beralasan). */
function Kembar({ daftar, onBukaPasal }) {
  const [alasan, setAlasan] = useDraf('kembar', {});   // v5.6: alasan yang belum tersimpan tidak hilang
  const [pesan, setPesan] = useState({});
  const kunci = (m) => m.a + '|' + m.b;
  const tulis = (k, v) => setPesan((p) => Object.assign({}, p, { [k]: v }));
  const putus = async (m) => {
    const k = kunci(m);
    if (!String(alasan[k] || '').trim()) { tulis(k, 'Alasan wajib diisi.'); return; }
    tulis(k, 'Menyimpan…');
    try {
      let oleh = '';
      try { oleh = window.localStorage.getItem(STORAGE_KEY.OLEH) || ''; } catch (e) { /* abaikan */ }
      await simpanKembar({ a: m.a, b: m.b, alasan: alasan[k], oleh });
      setAlasan((d) => { const nd = Object.assign({}, d); delete nd[k]; return nd; });
    } catch (e) {
      tulis(k, 'Gagal disimpan (' + ((e && e.message) || String(e)) + '). Ketikan tetap di sini.');
    }
  };
  return (
    <div className="tl-gulir pk-isi">
      {daftar.map((m) => {
        const k = kunci(m);
        return (
          <div key={k} className="pk-kembar">
            <div className="pk-dua">
              {[[m.pa, m.na, m.ta], [m.pb, m.nb, m.tb]].map(([p, no, t]) => (
                <div key={p + '-' + no}>
                  <button type="button" className="tautan" onClick={() => onBukaPasal(p)}>{labelAyat(p, no)}</button>
                  <div className="tl-kutip teks-pre">{t}</div>
                </div>
              ))}
            </div>
            <div className="tl-aksi">
              <span className="kecil">Kemiripan {Math.round((m.s || 0) * 100)}%</span>
              <input className="inp" placeholder="Alasan bukan kembar (wajib)" value={alasan[k] || ''}
                     onChange={(e) => { const v = e.target.value; setAlasan((d) => Object.assign({}, d, { [k]: v })); }} />
              <button type="button" className="tbl" onClick={() => putus(m)}>{/^Gagal/.test(pesan[k] || '') ? 'Simpan ulang' : 'Bukan kembar'}</button>
              {pesan[k] ? <span className="jj-pesan">{pesan[k]}</span> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
