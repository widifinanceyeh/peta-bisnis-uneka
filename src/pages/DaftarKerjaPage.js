import React, { useEffect, useRef, useState } from 'react';
import { langganNaskah, ambilNaskah, muatInitNaskah, muatTelaah, muatLuar, muatTurunan, muatTeks, simpanKembar } from '../naskah';
import { susunKerja, labelAyat, kembarDiputus, daftarRedaksi, indeksTeks, pasalId } from '../utils/telaah';
import { ButirPermen, MuatanLuar } from './TelaahPage';
import { STORAGE_KEY } from '../config';
import { RelAtas, TombolLaci } from '../components/TombolRel';
import { Sakelar, TandaSelesai } from '../components/Sakelar';
import TautanDraf from '../components/TautanDraf';
import useDraf from '../hooks/useDraf';

/**
 * Halaman Periksa (v5.4, hanya ruang Kerja) — pengganti Daftar kerja.
 * Kiri: sisa pekerjaan sampai naskah final. Kanan: untuk butir yang dipilih, tujuan, patokan selesai,
 * caranya, lalu daftarnya beserta tombol putusan atau tautan ke tempat mengerjakannya.
 * v5.5: tanpa butir "urusan belum dibahas rapat" dan "pasal tanpa dasar hukum"; jejak hanya ayat 2025 yang dihapus;
 * muatan di luar peta diputus per pasal.
 * v5.9: setiap daftar menampilkan SEMUA butir (bawaan) dengan sakelar "Belum"; tanda Selesai/Belum seragam.
 * Angka di daftar kiri tetap menghitung yang belum. Butir Monev memuat 42 butir Berita Acara; alamat
 * #kerja-MONEV-n membuka butir n dan menyorotnya. Butir baru: ayat delegasi tanpa dokumen turunan.
 */
export default function DaftarKerjaPage({ onBukaTelaah, onBukaNaskah, onBukaTurunan, onBukaUrusan, urusan, ctx, onGalat, pilih: pilihProp, onPilih }) {
  const [n, setN] = useState(ambilNaskah);
  // v5.8: butir terpilih dipegang App (riwayat, tombol Kembali, posisi terakhir).
  const [pilihLokal, setPilihLokal] = useState('');
  const pilih = onPilih ? (pilihProp || '') : pilihLokal;
  const setPilih = onPilih || setPilihLokal;
  const [belumSaja, setBelumSaja] = useState({});
  useEffect(() => langganNaskah(setN), []);
  useEffect(() => {
    muatInitNaskah().catch(() => {});
    muatTelaah().catch(() => {});
    muatLuar().catch(() => {});
    muatTurunan().catch(() => {});
    muatTeks().catch(() => {});
  }, []);
  const m = /^([A-Z]+)(?:-(.+))?$/.exec(pilih || '');
  const kodePilih = m ? m[1] : '';
  const sorot = m && m[2] ? m[2] : '';
  const daftar = susunKerja(n);
  const aktif = daftar.find((x) => x.kode === kodePilih) || daftar.find((x) => x.jumlah > 0) || daftar[0];
  const bukaPasal = (saring) => (p) => onBukaNaskah(saring, p);
  const belum = !!belumSaja[aktif.kode];
  const setBelum = (v) => setBelumSaja((s) => Object.assign({}, s, { [aktif.kode]: v }));
  const ix = indeksTeks(n.teks);
  const label = (id) => (ix[id] ? labelAyat(ix[id].pasal, ix[id].nomor) : id);

  let isi = null;
  if (aktif.kode === 'PERMEN') isi = <ButirPermen n={n} onBukaPasal={bukaPasal('semua')} onPilih={onBukaTelaah} onGalat={onGalat} urusan={urusan} ctx={ctx} onBukaUrusan={onBukaUrusan} />;
  else if (aktif.kode === 'LUAR') isi = <MuatanLuar jenis="luar" n={n} urusan={urusan} onBukaPasal={bukaPasal('semua')} onGalat={onGalat} />;
  else if (aktif.kode === 'JEJAK') isi = <MuatanLuar jenis="hapus" n={n} urusan={urusan} onBukaPasal={bukaPasal('usulan')} onGalat={onGalat} />;
  else if (aktif.kode === 'KEMBAR') {
    isi = <Kembar terbuka={(n.telaah && n.telaah.kembar) || []} diputus={kembarDiputus(n)} belum={belum} setBelum={setBelum} onBukaPasal={bukaPasal('semua')} />;
  } else if (aktif.kode === 'REDAKSI') {
    const semua = daftarRedaksi(n);
    const terbuka = (r) => String(r.status || '').toUpperCase() === 'USULAN';
    const tampil = belum ? semua.filter(terbuka) : semua;
    isi = (
      <>
        <Sakelar semua={!belum} onSemua={(v) => setBelum(!v)} nSemua={semua.length} nBelum={semua.filter(terbuka).length} labelBelum="Terbuka" />
        <div className="tl-gulir pk-isi">
          <table className="tl-tabel tl-beku">
            <thead><tr><th style={{ width: 110 }}>Ayat</th><th>Usulan bunyi</th><th style={{ width: 220 }}>Status</th></tr></thead>
            <tbody>
              {tampil.map((r) => (
                <tr key={r.id}>
                  <td><button type="button" className="tautan" onClick={() => onBukaNaskah(terbuka(r) ? 'redaksi' : 'semua', r.pasal)}>{label(r.id26)}</button></td>
                  <td className="tl-kutip teks-pre">{r.baru}</td>
                  <td><TandaSelesai ok={!terbuka(r)} /> <span className="kecil">{String(r.status || '').toLowerCase()}{r.diterapkan ? ' ' + r.diterapkan : r.tgl ? ' ' + r.tgl : ''}</span></td>
                </tr>
              ))}
              {!tampil.length ? <tr><td colSpan={3} className="redup">{belum ? 'Tidak ada usulan terbuka.' : 'Belum ada usulan redaksi.'}</td></tr> : null}
            </tbody>
          </table>
        </div>
      </>
    );
  } else if (aktif.kode === 'MONEV') {
    isi = <Monev daftar={aktif.monev} belum={belum} setBelum={setBelum} sorot={sorot} label={label} onBukaPasal={bukaPasal('semua')} onBukaTurunan={onBukaTurunan} />;
  } else if (aktif.kode === 'DELEGASI') {
    const semua = aktif.delegasi;
    const tampil = belum ? semua.filter((d) => !d.dok) : semua;
    isi = (
      <>
        <Sakelar semua={!belum} onSemua={(v) => setBelum(!v)} nSemua={semua.length} nBelum={semua.filter((d) => !d.dok).length} />
        <div className="tl-gulir pk-isi">
          <table className="tl-tabel tl-beku">
            <thead><tr><th style={{ width: 110 }}>Ayat</th><th>Bunyi ayat</th><th style={{ width: 260 }}>Dokumen turunan</th></tr></thead>
            <tbody>
              {tampil.map((d) => (
                <tr key={d.id}>
                  <td><button type="button" className="tautan" onClick={() => onBukaNaskah('semua', d.pasal)}>{labelAyat(d.pasal, d.nomor)}</button></td>
                  <td className="tl-kutip">{d.teks}</td>
                  <td>
                    <TandaSelesai ok={!!d.dok} />{' '}
                    {d.dok ? <button type="button" className="tautan" onClick={() => onBukaTurunan && onBukaTurunan(d.dok.id)}>{d.dok.id} · {d.dok.dokumen}</button>
                      : <button type="button" className="tautan" onClick={() => onBukaTurunan && onBukaTurunan('')}>Buka Dokumen Turunan</button>}
                  </td>
                </tr>
              ))}
              {!tampil.length ? <tr><td colSpan={3} className="redup">Semua ayat delegasi sudah punya dokumen turunan.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </>
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
          <h2 className="nk-judul">{aktif.label}{aktif.jumlah ? ' · ' + aktif.jumlah + ' belum' : aktif.jumlah === 0 ? ' · selesai' : ''}</h2>
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

/** v5.9: 42 butir Berita Acara Monev; butir terpilih (#kerja-MONEV-n) disorot dan digulir ke tengah. */
function Monev({ daftar, belum, setBelum, sorot, label, onBukaPasal, onBukaTurunan }) {
  const ref = useRef(null);
  const tampil = belum ? daftar.filter((m) => !m.selesai) : daftar;
  const adaSorot = !!sorot && tampil.some((m) => String(m.butir) === String(sorot));
  useEffect(() => {
    if (!adaSorot || !ref.current) return;
    try { ref.current.scrollIntoView({ block: 'center' }); } catch (e) { /* abaikan */ }
  }, [adaSorot, sorot]);
  return (
    <>
      <Sakelar semua={!belum} onSemua={(v) => setBelum(!v)} nSemua={daftar.length} nBelum={daftar.filter((m) => !m.selesai).length} labelBelum="Belum selesai"
               keterangan={'Belum ' + daftar.filter((m) => m.tahap === 'BELUM').length + ' · Proses ' + daftar.filter((m) => m.tahap === 'PROSES').length + ' · Selesai ' + daftar.filter((m) => m.tahap === 'ADA').length} />
      <div className="tl-gulir pk-isi">
        <table className="tl-tabel tl-beku">
          <thead><tr><th style={{ width: 64 }}>Butir</th><th>Ditagih Berita Acara</th><th style={{ width: 150 }}>Ayat 2026</th>
            <th style={{ width: 230 }}>Dokumen turunan</th><th style={{ width: 200 }}>Status</th></tr></thead>
          <tbody>
            {tampil.map((m) => {
              const disorot = String(m.butir) === String(sorot);
              return (
                <tr key={m.butir} ref={disorot ? ref : null} className={disorot ? 'pk-sorot' : ''}>
                  <td><span className="lencana-m">M{m.butir}</span></td>
                  <td>{m.dokumen}<div className="kecil">BA: {m.alamat}{m.tertuju ? ' → tertuju ' + m.tertuju : ''} · status BA: {m.status || '—'}</div></td>
                  <td>{(m.ids || []).map((id) => (
                    <div key={id}><button type="button" className="tautan" onClick={() => onBukaPasal(pasalId(id))}>{label(id)}</button></div>
                  ))}{!(m.ids || []).length ? <span className="redup">—</span> : null}</td>
                  <td>{(m.ids || []).map((id, i) => {
                    const d = m.milik[i];
                    if (i > 0 && d && m.milik[i - 1] && m.milik[i - 1].id === d.id) return null;   // ayat berikutnya di dokumen yang sama
                    return <div key={id} className="pk-dok">{d ? <button type="button" className="tautan" onClick={() => onBukaTurunan && onBukaTurunan(d.id)}>{d.id} · {d.dokumen}</button>
                      : <span className="redup">belum ada dokumen turunan</span>}{d && d.status ? <span className="kecil"> ({d.status.toLowerCase()})</span> : null}
                      {d && d.drafTautan ? <div><TautanDraf judul={d.drafJudul} tautan={d.drafTautan} cadangan={'Draf ' + d.id} kecil /></div> : null}</div>;
                  })}</td>
                  <td><TandaSelesai tahap={m.tahap} />{m.adaBA && !m.dok.length ? <span className="kecil"> sudah ada menurut BA</span> : null}
                    {m.adaBA && m.dok.length && m.tahap !== 'ADA' ? <div className="kecil">BA mencatat "Ada", tetapi dokumen yang diminta belum ditetapkan.</div> : null}
                    {m.sebab ? <div className="jj-pesan">{m.sebab}</div> : null}</td>
                </tr>
              );
            })}
            {!tampil.length ? <tr><td colSpan={5} className="redup">Semua butir Monev sudah selesai.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** Pasangan dugaan ayat kembar, berdampingan, dengan satu putusan: "Bukan kembar" (beralasan). v5.9: yang sudah diputus ikut tampil. */
function Kembar({ terbuka, diputus, belum, setBelum, onBukaPasal }) {
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
  const semua = terbuka.map((m) => Object.assign({ selesai: false }, m)).concat(belum ? [] : diputus.map((m) => Object.assign({ selesai: true }, m)));
  return (
    <>
      <Sakelar semua={!belum} onSemua={(v) => setBelum(!v)} nSemua={terbuka.length + diputus.length} nBelum={terbuka.length} />
      <div className="tl-gulir pk-isi">
        {semua.map((m) => {
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
              {m.selesai ? (
                <div className="tl-aksi"><TandaSelesai ok /> <span className="kecil">{m.putusan.putusan}: {m.putusan.alasan}{m.putusan.diperbarui ? ' · ' + m.putusan.diperbarui : ''}</span></div>
              ) : (
                <div className="tl-aksi">
                  <TandaSelesai ok={false} />
                  <span className="kecil">Kemiripan {Math.round((m.s || 0) * 100)}%</span>
                  <input className="inp" placeholder="Alasan bukan kembar (wajib)" value={alasan[k] || ''}
                         onChange={(e) => { const v = e.target.value; setAlasan((d) => Object.assign({}, d, { [k]: v })); }} />
                  <button type="button" className="tbl" onClick={() => putus(m)}>{/^Gagal/.test(pesan[k] || '') ? 'Simpan ulang' : 'Bukan kembar'}</button>
                  {pesan[k] ? <span className="jj-pesan">{pesan[k]}</span> : null}
                </div>
              )}
            </div>
          );
        })}
        {!semua.length ? <div className="redup pk-kosong">{belum ? 'Tidak ada pasangan yang belum diputus.' : 'Tidak ada dugaan ayat kembar.'}</div> : null}
      </div>
    </>
  );
}
