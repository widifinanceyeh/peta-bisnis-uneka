import React, { useEffect, useState } from 'react';
import { langganNaskah, ambilNaskah, muatTurunan, simpanTurunan } from '../naskah';
import { labelAyat } from '../utils/telaah';
import { RelAtas } from '../components/TombolRel';
import { STORAGE_KEY } from '../config';
import useDraf from '../hooks/useDraf';

/**
 * Halaman Dokumen Turunan (v5.5): dokumen yang wajib terbit setelah Statuta berlaku.
 * Sumber kebenaran: tab 13-DOKUMEN-TURUNAN. Ayat naskah 2026 yang mendelegasikan ke Peraturan Rektor,
 * Peraturan Yayasan, atau Ketetapan Senat dicocokkan dengan kolom Dasar pasal setiap dokumen; yang belum
 * tercakup tampil pada "Ayat mendelegasikan belum masuk dokumen". Dibaca di kedua ruang, disunting di ruang Kerja.
 */
function oleh() {
  try { return window.localStorage.getItem(STORAGE_KEY.OLEH) || ''; } catch (e) { return ''; }
}

export default function TurunanPage({ ruang, onBukaPasal, onBukaTelaah, onGalat }) {
  const kerja = ruang === 'kerja';
  const [n, setN] = useState(ambilNaskah);
  const [cari, setCari] = useState('');
  const [pilih, setPilih] = useState('');
  useEffect(() => langganNaskah(setN), []);
  useEffect(() => { muatTurunan().catch((e) => onGalat && onGalat((e && e.message) || String(e))); }, [onGalat]);
  const T = n.turunan;
  if (!T) return <div className="halaman nk-halaman"><div className="nk-muat">Membaca daftar dokumen turunan…</div></div>;
  if (!T.ada) return <div className="halaman nk-halaman"><div className="panel-info">{T.alasan}</div></div>;

  const q = cari.trim().toLowerCase();
  const tersaring = T.dokumen.filter((d) => !q || (d.dokumen + ' ' + d.pokok + ' ' + d.dasar).toLowerCase().indexOf(q) !== -1);
  const mode = pilih === 'LEPAS' || pilih === 'BARU' ? pilih : 'DOK';
  const aktif = mode === 'DOK' ? (T.dokumen.find((d) => d.id === pilih) || T.dokumen[0] || null) : null;

  return (
    <div className="nk-wrap">
      <aside className="nk-rel" aria-label="Daftar dokumen turunan">
        <RelAtas><input className="inp nk-cari" type="search" value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari dokumen" /></RelAtas>
        <div className="nk-daftar">
          {T.penetap.map((p) => {
            const isi = tersaring.filter((d) => d.penetap === p);
            if (!isi.length) return null;
            return (
              <div key={p} className="nk-bab">
                <div className="nk-bab-judul">{p.toUpperCase()}</div>
                {isi.map((d) => (
                  <button type="button" key={d.id} className={'nk-item pk-item' + (aktif && aktif.id === d.id ? ' aktif' : '')} onClick={() => setPilih(d.id)} title={d.dokumen}>
                    <span className="nk-item-judul">{d.dokumen.replace(/^(Peraturan Rektor|Peraturan Yayasan|Ketetapan Senat|PY)\s+tentang\s+/i, '')}</span>
                    <span className={'td-st' + (/^ada/i.test(d.status) ? ' td-ada' : '')}>{d.status || '—'}</span>
                  </button>
                ))}
              </div>
            );
          })}
          {T.lepas.length ? (
            <button type="button" className={'nk-item pk-item' + (mode === 'LEPAS' ? ' aktif' : '')} onClick={() => setPilih('LEPAS')}>
              <span className="nk-item-judul">Ayat mendelegasikan belum masuk dokumen</span><b className="dk-ada">{T.lepas.length}</b>
            </button>
          ) : null}
          {kerja ? (
            <button type="button" className={'nk-item pk-item td-baru' + (mode === 'BARU' ? ' aktif' : '')} onClick={() => setPilih('BARU')}>
              <span className="nk-item-judul">+ Dokumen baru</span><span />
            </button>
          ) : null}
        </div>
      </aside>

      <main className="nk-utama tl-utama tl-kunci">
        {mode === 'LEPAS' ? (
          <Lepas T={T} kerja={kerja} onBukaPasal={onBukaPasal} onGalat={onGalat} />
        ) : mode === 'BARU' ? (
          <>
            <div className="tl-kepala"><h2 className="nk-judul">Dokumen baru</h2></div>
            <FormDok key="baru" d={null} T={T} onTersimpan={(h) => setPilih(h.id)} onGalat={onGalat} />
          </>
        ) : aktif ? (
          <>
            <div className="tl-kepala">
              <div className="rincian-no">{aktif.penetap} · {aktif.id}</div>
              <h2 className="nk-judul">{aktif.dokumen}</h2>
            </div>
            <div className="tl-gulir pk-isi">
              {kerja ? <FormDok key={aktif.id} d={aktif} T={T} onGalat={onGalat} /> : (
                <dl className="pk-panduan">
                  <dt>Dasar pasal</dt><dd>{aktif.dasar || '—'}</dd>
                  <dt>Pokok urusan</dt><dd>{aktif.pokok || '—'}</dd>
                  <dt>Status</dt><dd>{aktif.status || '—'}</dd>
                  {aktif.catatan ? <><dt>Catatan</dt><dd>{aktif.catatan}</dd></> : null}
                </dl>
              )}
              {aktif.patah.length ? <div className="jj-pesan">Dasar pasal tidak ada di naskah 2026: {aktif.patah.join(', ')}.</div> : null}
              <div className="blok-label td-label">AYAT YANG MENDELEGASIKAN ({aktif.ayat.length})</div>
              {aktif.ayat.map((a) => (
                <div key={a.id} className="pk-ayat">
                  <button type="button" className="tautan" onClick={() => onBukaPasal(a.pasal)}>{labelAyat(a.pasal, a.nomor)}</button> {a.teks}
                </div>
              ))}
              {!aktif.ayat.length ? <div className="redup kecil">Tidak ada ayat pada dasar pasal ini yang berbunyi "ditetapkan dengan {aktif.penetap}".</div> : null}
              {aktif.urusan.length ? (
                <>
                  <div className="blok-label td-label">URUSAN PETA</div>
                  <div className="chip-baris">{aktif.urusan.map((u) => <button type="button" key={u} className="chip-urusan" onClick={() => onBukaTelaah(u)}>{u}</button>)}</div>
                </>
              ) : null}
            </div>
          </>
        ) : <div className="redup">Belum ada dokumen.</div>}
      </main>
    </div>
  );
}

function FormDok({ d, T, onTersimpan, onGalat }) {
  // v5.6: isian disimpan sebagai draf di peramban sampai simpan berhasil.
  const [f, setF, lepas, adaDraf] = useDraf('turunan:' + (d ? d.id : 'baru'), {
    dokumen: d ? d.dokumen : '', penetap: d ? d.penetap : T.penetap[0], dasar: d ? d.dasar : '',
    pokok: d ? d.pokok : '', status: d ? d.status : (T.pilihanStatus[0] || ''), catatan: d ? d.catatan : ''
  });
  const [pesan, setPesan] = useState(adaDraf ? 'Isian yang belum tersimpan dipulihkan.' : '');
  const ubah = (k) => (e) => { const v = e.target.value; setF((x) => Object.assign({}, x, { [k]: v })); };
  const simpan = async () => {
    setPesan('Menyimpan…');
    try {
      const h = await simpanTurunan(Object.assign({ id: d ? d.id : '', oleh: oleh() }, f));
      lepas();
      setPesan('Tersimpan.');
      if (onTersimpan) onTersimpan(h);
    } catch (e) {
      const m = (e && e.message) || String(e);
      setPesan('Gagal disimpan (' + m + '). Isian tetap di sini.');
      if (onGalat) onGalat(m);
    }
  };
  return (
    <div className="td-form">
      <label>Nama dokumen<input className="inp" value={f.dokumen} onChange={ubah('dokumen')} /></label>
      <div className="td-dua">
        <label>Penetap<select className="inp" value={f.penetap} onChange={ubah('penetap')}>{T.penetap.map((p) => <option key={p}>{p}</option>)}</select></label>
        <label>Status<select className="inp" value={f.status} onChange={ubah('status')}>{T.pilihanStatus.map((p) => <option key={p}>{p}</option>)}</select></label>
      </div>
      <label>Dasar pasal <span className="kecil">contoh: Pasal 39 ayat (3), 42 ayat (3)</span><input className="inp" value={f.dasar} onChange={ubah('dasar')} /></label>
      <label>Pokok urusan<textarea className="inp" rows={3} value={f.pokok} onChange={ubah('pokok')} /></label>
      <label>Catatan<textarea className="inp" rows={2} value={f.catatan} onChange={ubah('catatan')} /></label>
      <div className="tl-aksi"><button type="button" className="tbl" onClick={simpan}>{/^Gagal/.test(pesan) ? 'Simpan ulang' : 'Simpan'}</button>{pesan ? <span className="kecil">{pesan}</span> : null}</div>
    </div>
  );
}

/** Ayat yang mendelegasikan tetapi belum tercakup dasar pasal dokumen mana pun. */
function Lepas({ T, kerja, onBukaPasal, onGalat }) {
  const [tujuan, setTujuan] = useState({});
  const [pesan, setPesan] = useState({});
  const tambah = async (a) => {
    const d = T.dokumen.find((x) => x.id === tujuan[a.id]);
    if (!d) { setPesan(Object.assign({}, pesan, { [a.id]: 'Pilih dokumen.' })); return; }
    const rujuk = a.pasal + ' ayat (' + String(a.nomor).replace(/[()]/g, '') + ')';
    const dasar = d.dasar ? d.dasar + ', ' + rujuk : 'Pasal ' + rujuk;
    setPesan(Object.assign({}, pesan, { [a.id]: 'Menyimpan…' }));
    try {
      await simpanTurunan({ id: d.id, dokumen: d.dokumen, penetap: d.penetap, dasar, pokok: d.pokok, status: d.status, catatan: d.catatan, oleh: oleh() });
    } catch (e) {
      const m = (e && e.message) || String(e);
      setPesan(Object.assign({}, pesan, { [a.id]: m }));
      if (onGalat) onGalat(m);
    }
  };
  return (
    <>
      <div className="tl-kepala">
        <h2 className="nk-judul">Ayat mendelegasikan belum masuk dokumen · {T.lepas.length}</h2>
        <div className="kecil">Ayat berbunyi "ditetapkan dengan Peraturan …/Ketetapan Senat" yang belum tercantum pada Dasar pasal dokumen mana pun.
          {kerja ? ' Pilih dokumen tujuan lalu Tambahkan; dasar pasal dokumen itu diperbarui.' : ''}</div>
      </div>
      <div className="tl-gulir pk-isi">
        {T.lepas.map((a) => (
          <div key={a.id} className="pk-kembar">
            <div><button type="button" className="tautan" onClick={() => onBukaPasal(a.pasal)}>{labelAyat(a.pasal, a.nomor)}</button> <span className="kecil">· {a.penetap}</span></div>
            <div className="tl-kutip">{a.teks}</div>
            {kerja ? (
              <div className="tl-aksi">
                <select className="inp" value={tujuan[a.id] || ''} onChange={(e) => setTujuan(Object.assign({}, tujuan, { [a.id]: e.target.value }))}>
                  <option value="">Tambahkan ke dokumen…</option>
                  {T.dokumen.filter((d) => d.penetap === a.penetap).map((d) => <option key={d.id} value={d.id}>{d.dokumen}</option>)}
                </select>
                <button type="button" className="tbl" onClick={() => tambah(a)}>Tambahkan</button>
                {pesan[a.id] ? <span className="jj-pesan">{pesan[a.id]}</span> : null}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </>
  );
}
