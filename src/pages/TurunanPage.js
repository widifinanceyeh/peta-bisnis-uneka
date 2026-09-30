import React, { useEffect, useMemo, useState } from 'react';
import { langganNaskah, ambilNaskah, muatTurunan, muatTeks, muatInitNaskah, simpanTurunan } from '../naskah';
import { labelAyat, petaAyatUrusan } from '../utils/telaah';
import { RelAtas, TombolLaci } from '../components/TombolRel';
import PitaPeta from '../components/PitaPeta';
import { STORAGE_KEY } from '../config';
import useDraf from '../hooks/useDraf';

/**
 * Halaman Dokumen Turunan (v5.5; dasar per ayat v5.7): dokumen yang wajib terbit setelah Statuta berlaku.
 * Sumber kebenaran: tab 13-DOKUMEN-TURUNAN (identitas dokumen) dan 13B-DASAR-TURUNAN (ayat dasar beserta
 * pokok urusan yang diatur dokumen dari ayat itu). Satu ayat hanya boleh menjadi dasar satu dokumen.
 * Dibaca di kedua ruang, disunting di ruang Kerja. Urusan peta ditampilkan dengan kartu peta 2026 apa adanya.
 */
function oleh() {
  try { return window.localStorage.getItem(STORAGE_KEY.OLEH) || ''; } catch (e) { return ''; }
}

const AWALAN = /^(Peraturan Rektor|Peraturan Yayasan|Ketetapan Senat|PY)\s+tentang\s+/i;

/** Baris dasar dokumen: {id, pokok}; baris yang ayatnya tidak ada lagi di naskah 2026 tetap dibawa. */
function barisAwal(d) {
  if (!d) return [];
  const b = (d.baris || []).map((x) => ({ id: x.id, pokok: x.pokok || '' }));
  (d.patahId || []).forEach((x) => { if (x.id && !b.some((y) => y.id === x.id)) b.push({ id: x.id, pokok: x.pokok || '', rujukan: x.rujukan }); });
  return b;
}

export default function TurunanPage({ ruang, onBukaPasal, onBukaTelaah, onBukaUrusan, urusan, ctx, onGalat }) {
  const kerja = ruang === 'kerja';
  const [n, setN] = useState(ambilNaskah);
  const [cari, setCari] = useState('');
  const [pilih, setPilih] = useState('');
  const [pesan, setPesan] = useState({});
  useEffect(() => langganNaskah(setN), []);
  useEffect(() => {
    muatTurunan().catch((e) => onGalat && onGalat((e && e.message) || String(e)));
    muatTeks().catch(() => {});
    muatInitNaskah().catch(() => {});
  }, [onGalat]);
  const T = n.turunan;

  // Bunyi dan urutan setiap ayat naskah 2026 (dari data pencarian yang sudah ada di peramban).
  const teks = useMemo(() => {
    const o = {};
    ((n.teks && n.teks.ayat) || []).forEach((a, i) => { o[a[0]] = { id: a[0], pasal: a[1], nomor: a[2], teks: a[3], urut: i }; });
    return o;
  }, [n.teks]);
  const milik = useMemo(() => {
    const o = {};
    ((T && T.dokumen) || []).forEach((d) => (d.baris || []).forEach((b) => { (o[b.id] = o[b.id] || []).push(d.id); }));
    return o;
  }, [T]);
  const namaDok = useMemo(() => {
    const o = {};
    ((T && T.dokumen) || []).forEach((d) => { o[d.id] = d.dokumen; });
    return o;
  }, [T]);
  const ayatUrusan = useMemo(() => petaAyatUrusan(urusan, n.init && n.init.indeks26), [urusan, n.init]);
  const indeksUrusan = useMemo(() => { const o = {}; (urusan || []).forEach((u) => { o[u.id] = u; }); return o; }, [urusan]);

  if (!T) return <div className="halaman nk-halaman"><div className="nk-muat">Membaca daftar dokumen turunan…</div></div>;
  if (!T.ada) return <div className="halaman nk-halaman"><div className="panel-info">{T.alasan}</div></div>;
  const siap = T.perAyat !== undefined;   // false = Apps Script belum v5.7: penyuntingan ditahan agar dasar tidak terhapus
  const lepasDaftar = T.lepas || [];
  const bentrok = T.bentrok || [];

  const q = cari.trim().toLowerCase();
  const tersaring = T.dokumen.filter((d) => !q || (d.dokumen + ' ' + d.pokok + ' ' + d.dasar).toLowerCase().indexOf(q) !== -1);
  const mode = ['LEPAS', 'BARU', 'BENTROK'].indexOf(pilih) !== -1 ? pilih : 'DOK';
  const aktif = mode === 'DOK' ? (T.dokumen.find((d) => d.id === pilih) || T.dokumen[0] || null) : null;
  const bersama = { T, teks, milik, namaDok, kerja, siap, onBukaPasal, onGalat };

  const simpanDok = async (d, ayat) => simpanTurunan({
    id: d.id, dokumen: d.dokumen, penetap: d.penetap, status: d.status, catatan: d.catatan, ayat, oleh: oleh()
  });

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
                    <span className="nk-item-judul">{d.dokumen.replace(AWALAN, '')}</span>
                    <span className={'td-st' + (/^ada/i.test(d.status) ? ' td-ada' : '')}>{d.status || '—'}</span>
                  </button>
                ))}
              </div>
            );
          })}
          {lepasDaftar.length ? (
            <button type="button" className={'nk-item pk-item' + (mode === 'LEPAS' ? ' aktif' : '')} onClick={() => setPilih('LEPAS')}>
              <span className="nk-item-judul">Ayat mendelegasikan belum masuk dokumen</span><b className="dk-ada">{lepasDaftar.length}</b>
            </button>
          ) : null}
          {bentrok.length ? (
            <button type="button" className={'nk-item pk-item' + (mode === 'BENTROK' ? ' aktif' : '')} onClick={() => setPilih('BENTROK')}>
              <span className="nk-item-judul">Ayat di lebih dari satu dokumen</span><b className="dk-ada">{bentrok.length}</b>
            </button>
          ) : null}
          {kerja ? (
            <button type="button" className={'nk-item pk-item td-baru' + (mode === 'BARU' ? ' aktif' : '')} onClick={() => setPilih('BARU')}>
              <span className="nk-item-judul">+ Dokumen baru</span><span />
            </button>
          ) : null}
        </div>
      </aside>
      <TombolLaci label="Daftar dokumen" />

      <main className="nk-utama tl-utama tl-kunci">
        {mode === 'LEPAS' ? (
          <Lepas {...bersama} simpanDok={simpanDok} />
        ) : mode === 'BENTROK' ? (
          <Bentrok {...bersama} bentrok={bentrok} simpanDok={simpanDok} />
        ) : mode === 'BARU' ? (
          <>
            <div className="tl-kepala"><h2 className="nk-judul">Dokumen baru</h2></div>
            <div className="tl-gulir pk-isi">
              <FormDok key="baru" d={null} {...bersama} onTersimpan={(h) => { setPesan({ [h.id]: 'Tersimpan.' }); setPilih(h.id); }} />
            </div>
          </>
        ) : aktif ? (
          <>
            <div className="tl-kepala">
              <div className="rincian-no">{aktif.penetap} · {aktif.id}</div>
              <h2 className="nk-judul">{aktif.dokumen}</h2>
            </div>
            <div className="tl-gulir pk-isi">
              {kerja
                ? <FormDok key={aktif.id + ':' + sidik(aktif)} d={aktif} {...bersama} pesanAwal={pesan[aktif.id]}
                           onTersimpan={(h) => setPesan({ [h.id]: 'Tersimpan.' })} />
                : <BacaDok d={aktif} {...bersama} />}
              <KartuPeta d={aktif} ayatUrusan={ayatUrusan} indeksUrusan={indeksUrusan} ctx={ctx}
                         onTelaah={onBukaTelaah} onBukaUrusan={onBukaUrusan} />
            </div>
          </>
        ) : <div className="redup">Belum ada dokumen.</div>}
      </main>
    </div>
  );
}

function sidik(d) {
  return [d.dokumen, d.penetap, d.status, d.catatan, (d.baris || []).map((b) => b.id + '=' + (b.pokok || '')).join('|')].join('¦').length +
    '.' + (d.diperbarui || '') + '.' + (d.baris || []).length;
}

/** Label dan bunyi satu ayat; ayat yang tidak ada lagi di naskah 2026 ditandai. */
function Ayat({ id, rujukan, teks, T, milik, namaDok, dokId, onBukaPasal }) {
  const a = teks[id];
  const lain = (milik[id] || []).filter((k) => k !== dokId);
  if (!a) {
    return (
      <div className="td-ayat">
        <b className="td-patah">{rujukan || id}</b> <span className="td-tag td-tag-patah">tidak ada di naskah 2026</span>
        <div className="kecil">Ayat ini tidak ditemukan sesudah naskah ditarik ulang. Lepaskan, lalu tambahkan ayat penggantinya.</div>
      </div>
    );
  }
  const deleg = T.delegasi && T.delegasi[id];
  return (
    <div className="td-ayat">
      <button type="button" className="tautan" onClick={() => onBukaPasal(a.pasal)}>{labelAyat(a.pasal, a.nomor)}</button>
      <span className={'td-tag' + (deleg ? ' td-tag-deleg' : '')}>{deleg ? 'mendelegasikan' : 'rujukan'}</span>
      {lain.length ? <span className="td-tag td-tag-lain" title={lain.map((k) => k + ' ' + (namaDok[k] || '')).join('; ')}>juga di {lain.join(', ')}</span> : null}
      <div className="td-bunyi">{a.teks}</div>
    </div>
  );
}

function urutkan(baris, teks) {
  return baris.slice().sort((x, y) => {
    const a = teks[x.id], b = teks[y.id];
    return (a ? a.urut : 1e9) - (b ? b.urut : 1e9);
  });
}

function Ringkasan({ baris, teks, d }) {
  const isi = urutkan(baris, teks).filter((x) => String(x.pokok || '').trim());
  return (
    <div className="td-ringkas">
      <div className="blok-label td-label">DOKUMEN INI MENGURUSI</div>
      {isi.length ? (
        <ol>{isi.map((x) => <li key={x.id}>{x.pokok} <span className="kecil">— {teks[x.id] ? labelAyat(teks[x.id].pasal, teks[x.id].nomor) : (x.rujukan || x.id)}</span></li>)}</ol>
      ) : (
        <div className="kecil">Pokok urusan per ayat belum diisi.{d && d.pokok ? <> Rumusan lama: <i>{d.pokok}</i></> : null}</div>
      )}
    </div>
  );
}

function BacaDok({ d, T, teks, milik, namaDok, onBukaPasal }) {
  const baris = urutkan(barisAwal(d), teks);
  return (
    <>
      <dl className="pk-panduan">
        <dt>Status</dt><dd>{d.status || '—'}</dd>
        {d.catatan ? <><dt>Catatan</dt><dd className="td-pra">{d.catatan}</dd></> : null}
      </dl>
      <div className="blok-label td-label">DASAR AYAT DAN POKOK URUSAN ({baris.length})</div>
      <div className="td-tabel td-baca">
        <div className="td-kepala"><span>Ayat rujukan (bunyi naskah 2026)</span><span>Pokok urusan yang diatur dokumen ini</span></div>
        {baris.map((x) => (
          <div key={x.id} className="td-baris">
            <Ayat id={x.id} rujukan={x.rujukan} teks={teks} T={T} milik={milik} namaDok={namaDok} dokId={d.id} onBukaPasal={onBukaPasal} />
            <div className="td-pokok">{x.pokok || <span className="redup">—</span>}</div>
          </div>
        ))}
        {!baris.length ? <div className="td-kosong kecil">Belum ada ayat dasar.</div> : null}
      </div>
      <Ringkasan baris={baris} teks={teks} d={d} />
    </>
  );
}

function FormDok({ d, T, teks, milik, namaDok, siap, onBukaPasal, onGalat, onTersimpan, pesanAwal }) {
  // Isian (termasuk daftar ayat dan pokok urusan) disimpan sebagai draf di peramban sampai simpan berhasil.
  const [f, setF, lepas, adaDraf] = useDraf('turunan57:' + (d ? d.id : 'baru'), {
    dokumen: d ? d.dokumen : '', penetap: d ? d.penetap : T.penetap[0], status: d ? d.status : (T.pilihanStatus[0] || ''),
    catatan: d ? d.catatan : '', baris: barisAwal(d)
  });
  const [pesan, setPesan] = useState(adaDraf ? 'Isian yang belum tersimpan dipulihkan.' : (pesanAwal || ''));
  const [buka, setBuka] = useState(false);
  const ubah = (k) => (e) => { const v = e.target.value; setF((x) => Object.assign({}, x, { [k]: v })); };
  const ubahPokok = (id, v) => setF((x) => Object.assign({}, x, { baris: x.baris.map((b) => (b.id === id ? Object.assign({}, b, { pokok: v }) : b)) }));
  const buang = (id) => setF((x) => Object.assign({}, x, { baris: x.baris.filter((b) => b.id !== id) }));
  const tambah = (id) => setF((x) => (x.baris.some((b) => b.id === id) ? x : Object.assign({}, x, { baris: x.baris.concat([{ id, pokok: '' }]) })));
  const baris = urutkan(f.baris, teks);
  const simpan = async () => {
    setPesan('Menyimpan…');
    try {
      const h = await simpanTurunan({
        id: d ? d.id : '', dokumen: f.dokumen, penetap: f.penetap, status: f.status, catatan: f.catatan,
        ayat: f.baris.map((b) => ({ id: b.id, pokok: b.pokok })), oleh: oleh()
      });
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
      {!siap ? <div className="jj-pesan">Apps Script belum versi 5.7: penyuntingan ditahan supaya dasar dokumen tidak terhapus.</div> : null}
      <label>Nama dokumen<input className="inp" value={f.dokumen} onChange={ubah('dokumen')} /></label>
      <div className="td-dua">
        <label>Penetap<select className="inp" value={f.penetap} onChange={ubah('penetap')}>{T.penetap.map((p) => <option key={p}>{p}</option>)}</select></label>
        <label>Status<select className="inp" value={f.status} onChange={ubah('status')}>{T.pilihanStatus.map((p) => <option key={p}>{p}</option>)}</select></label>
      </div>

      <div className="blok-label td-label">DASAR AYAT DAN POKOK URUSAN ({baris.length})</div>
      <div className="td-tabel">
        <div className="td-kepala"><span>Ayat rujukan (bunyi naskah 2026)</span><span>Pokok urusan yang diatur dokumen ini</span><span /></div>
        {baris.map((x) => (
          <div key={x.id} className="td-baris">
            <Ayat id={x.id} rujukan={x.rujukan} teks={teks} T={T} milik={milik} namaDok={namaDok} dokId={d ? d.id : ''} onBukaPasal={onBukaPasal} />
            <textarea className="inp td-pokok" rows={2} value={x.pokok} placeholder="Pokok urusan yang diatur dari ayat ini"
                      onChange={(e) => ubahPokok(x.id, e.target.value)} />
            <button type="button" className="td-buang" title="Lepas dari dokumen ini" aria-label="Lepas dari dokumen ini" onClick={() => buang(x.id)}>×</button>
          </div>
        ))}
        {!baris.length ? <div className="td-kosong kecil">Belum ada ayat dasar. Tambahkan dari tombol di bawah.</div> : null}
      </div>
      <div className="td-tambah">
        <button type="button" className="tbl tbl-ringan" onClick={() => setBuka(!buka)} aria-expanded={buka}>{buka ? 'Tutup pilihan ayat' : '+ Tambah ayat'}</button>
        <span className="kecil">Ayat yang sudah menjadi dasar dokumen lain tidak dapat dipilih.</span>
      </div>
      {buka ? <PilihAyat T={T} teks={teks} milik={milik} namaDok={namaDok} dokId={d ? d.id : ''} ada={f.baris} onPilih={tambah} /> : null}

      <Ringkasan baris={f.baris} teks={teks} d={d} />
      <label>Catatan<textarea className="inp" rows={2} value={f.catatan} onChange={ubah('catatan')} /></label>
      <div className="tl-aksi">
        <button type="button" className="tbl" onClick={simpan} disabled={!siap}>{/^Gagal/.test(pesan) ? 'Simpan ulang' : 'Simpan'}</button>
        {pesan ? <span className="kecil">{pesan}</span> : null}
      </div>
    </div>
  );
}

/** Pilihan ayat: tanpa kata cari = ayat mendelegasikan yang belum masuk dokumen dan ayat lain pada pasal yang sama. */
function PilihAyat({ T, teks, milik, namaDok, dokId, ada, onPilih }) {
  const [q, setQ] = useState('');
  const sudah = new Set(ada.map((b) => b.id));
  const semua = Object.keys(teks).map((k) => teks[k]).sort((a, b) => a.urut - b.urut);
  let grup;
  const kata = q.trim().toLowerCase();
  if (kata) {
    grup = [['Hasil cari', semua.filter((a) => !sudah.has(a.id) &&
      (labelAyat(a.pasal, a.nomor) + ' pasal ' + a.pasal + ' ' + a.teks).toLowerCase().indexOf(kata) !== -1).slice(0, 40)]];
  } else {
    const pasal = new Set(ada.map((b) => teks[b.id] && teks[b.id].pasal).filter(Boolean));
    grup = [
      ['Mendelegasikan, belum masuk dokumen mana pun', (T.lepas || []).map((l) => teks[l.id]).filter((a) => a && !sudah.has(a.id))],
      ['Ayat lain pada pasal yang sama', semua.filter((a) => pasal.has(a.pasal) && !sudah.has(a.id))]
    ];
  }
  return (
    <div className="td-pilih">
      <input className="inp" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari pasal atau isi ayat, mis. 47 (6) atau alumni" />
      {grup.map(([judul, isi]) => (
        <div key={judul}>
          <div className="td-pilih-grup">{judul}</div>
          {isi.length ? isi.map((a) => {
            const lain = (milik[a.id] || []).filter((k) => k !== dokId);
            const deleg = T.delegasi && T.delegasi[a.id];
            return (
              <button type="button" key={a.id} className={'td-pilih-item' + (lain.length ? ' kunci' : '')} disabled={!!lain.length}
                      onClick={() => onPilih(a.id)}>
                <span className="td-pilih-lbl"><b>{labelAyat(a.pasal, a.nomor)}</b>
                  <span className={'td-tag' + (deleg ? ' td-tag-deleg' : '')}>{deleg ? 'mendelegasikan' : 'rujukan'}</span>
                  {lain.length ? <span className="td-milik">sudah dasar {lain.map((k) => k + ' ' + (namaDok[k] || '').replace(AWALAN, '')).join('; ')}</span> : null}
                </span>
                <span className="kecil td-pilih-bunyi">{a.teks}</span>
              </button>
            );
          }) : <div className="kecil td-pilih-kosong">Tidak ada.</div>}
        </div>
      ))}
    </div>
  );
}

function KartuPeta({ d, ayatUrusan, indeksUrusan, ctx, onTelaah, onBukaUrusan }) {
  if (!ctx || !(d.urusan || []).length) return null;
  const daftar = d.urusan.map((id) => {
    const aras = new Set();
    (d.baris || []).forEach((b) => { const s = ayatUrusan[b.id] && ayatUrusan[b.id][id]; if (s) s.forEach((k) => aras.add(k)); });
    return { u: indeksUrusan[id], aras };
  }).filter((x) => x.u);
  if (!daftar.length) return null;
  return (
    <>
      <div className="blok-label td-label">URUSAN PETA</div>
      <PitaPeta tahun="2026" daftar={daftar} ctx={ctx} onTelaah={onTelaah} onBukaUrusan={onBukaUrusan} />
    </>
  );
}

/** Ayat yang mendelegasikan tetapi belum menjadi dasar dokumen mana pun. */
function Lepas({ T, teks, kerja, siap, onBukaPasal, onGalat, simpanDok }) {
  const [tujuan, setTujuan] = useState({});
  const [pesan, setPesan] = useState({});
  const tambah = async (a) => {
    const d = T.dokumen.find((x) => x.id === tujuan[a.id]);
    if (!d) { setPesan(Object.assign({}, pesan, { [a.id]: 'Pilih dokumen.' })); return; }
    setPesan(Object.assign({}, pesan, { [a.id]: 'Menyimpan…' }));
    try {
      await simpanDok(d, barisAwal(d).map((b) => ({ id: b.id, pokok: b.pokok })).concat([{ id: a.id, pokok: '' }]));
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
        <div className="kecil">Ayat berbunyi "ditetapkan dengan Peraturan …/Ketetapan Senat" yang belum menjadi dasar dokumen mana pun.
          {kerja ? ' Pilih dokumen tujuan lalu Tambahkan; pokok urusannya diisi pada halaman dokumen itu.' : ''}</div>
      </div>
      <div className="tl-gulir pk-isi">
        {T.lepas.map((a) => (
          <div key={a.id} className="pk-kembar">
            <div><button type="button" className="tautan" onClick={() => onBukaPasal(a.pasal)}>{labelAyat(a.pasal, a.nomor)}</button> <span className="kecil">· {a.penetap}</span></div>
            <div className="tl-kutip">{teks[a.id] ? teks[a.id].teks : a.teks}</div>
            {kerja ? (
              <div className="tl-aksi">
                <select className="inp" value={tujuan[a.id] || ''} onChange={(e) => setTujuan(Object.assign({}, tujuan, { [a.id]: e.target.value }))}>
                  <option value="">Tambahkan ke dokumen…</option>
                  {T.dokumen.filter((d) => d.penetap === a.penetap).map((d) => <option key={d.id} value={d.id}>{d.dokumen}</option>)}
                </select>
                <button type="button" className="tbl" onClick={() => tambah(a)} disabled={!siap}>Tambahkan</button>
                {pesan[a.id] ? <span className="jj-pesan">{pesan[a.id]}</span> : null}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </>
  );
}

/** Ayat yang tercantum di lebih dari satu dokumen (data lama); diputuskan pengguna, tidak dipindah otomatis. */
function Bentrok({ T, teks, namaDok, kerja, siap, bentrok, onBukaPasal, onGalat, simpanDok }) {
  const [pesan, setPesan] = useState({});
  const lepaskan = async (b, dokId) => {
    const d = T.dokumen.find((x) => x.id === dokId);
    if (!d) return;
    const k = b.id + dokId;
    setPesan(Object.assign({}, pesan, { [k]: 'Menyimpan…' }));
    try {
      await simpanDok(d, barisAwal(d).filter((x) => x.id !== b.id).map((x) => ({ id: x.id, pokok: x.pokok })));
    } catch (e) {
      const m = (e && e.message) || String(e);
      setPesan(Object.assign({}, pesan, { [k]: m }));
      if (onGalat) onGalat(m);
    }
  };
  return (
    <>
      <div className="tl-kepala">
        <h2 className="nk-judul">Ayat di lebih dari satu dokumen · {bentrok.length}</h2>
        <div className="kecil">Satu ayat hanya menjadi dasar satu dokumen. Ayat di bawah tercantum di beberapa dokumen dari data lama.
          {kerja ? ' Lepaskan dari dokumen yang tidak semestinya mengaturnya.' : ''}</div>
      </div>
      <div className="tl-gulir pk-isi">
        {bentrok.map((b) => (
          <div key={b.id} className="pk-kembar">
            <div><button type="button" className="tautan" onClick={() => onBukaPasal(b.pasal)}>{labelAyat(b.pasal, b.nomor)}</button></div>
            <div className="tl-kutip">{teks[b.id] ? teks[b.id].teks : ''}</div>
            {b.dok.map((k) => (
              <div key={k} className="tl-aksi">
                <span className="td-bentrok-dok"><b>{k}</b> {namaDok[k] || ''}</span>
                {kerja ? <button type="button" className="tbl tbl-ringan" onClick={() => lepaskan(b, k)} disabled={!siap}>Lepas dari {k}</button> : null}
                {pesan[b.id + k] ? <span className="jj-pesan">{pesan[b.id + k]}</span> : null}
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
