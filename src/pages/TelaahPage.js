import React, { useEffect, useMemo, useState } from 'react';
import {
  langganNaskah, ambilNaskah, muatInitNaskah, muatTelaah, muatPasal, muatKepatuhan, muatLuar, muatHasilRapat,
  simpanPutusanPasal, konfirmasiHapusLuar, simpanHasilRapat
} from '../naskah';
import { himpunanBaru, himpunanLama, indeksKelompok } from '../utils/aras';
import { urutkan } from '../utils/langkah';
import { ChipOrgan } from '../components/PitaPeta';
import { pasalId, labelAyat, KODE_TEMUAN, NAMA_TEMUAN } from '../utils/telaah';
import { STORAGE_KEY } from '../config';
import { RelAtas, TombolLaci } from '../components/TombolRel';
import TombolTautan from '../components/TombolTautan';
import useDraf from '../hooks/useDraf';

/**
 * Halaman Telaah (v5.4): berangkat dari urusan peta 2026, urut 59 urusan.
 *
 * Pertanyaan yang dijawab per urusan: apakah alur kewenangan pada peta 2026 sudah tertuang
 * benar di naskah 2026, dan apa bedanya dengan Statuta 2025.
 *
 * Ruang Rapat : Ringkasan dan rincian per urusan (tanpa kolom pembanding 2025); hasil rapat dibaca saja.
 * Ruang Kerja : ditambah kolom peta 2025 dan padanan 2025, dan pencatatan hasil rapat per urusan.
 * v5.4: "Butir Permen" dan "Muatan di luar peta" pindah ke halaman Periksa (komponennya diekspor dari sini).
 * Penjelasan, legenda, dan kepala tetap di atas; hanya tabel yang digulir dengan judul kolom yang membeku.
 */
export default function TelaahPage({ sel, onPilih, onBukaPasal, onBukaUrusan, urusan, ctx, kelompok, judul, onGalat, ruang }) {
  const [n, setN] = useState(ambilNaskah);
  const [cari, setCari] = useState('');
  const [tag, setTag] = useState('');   // v5.5.1: saringan dari tag status alur (klik lagi untuk kembali ke semua)
  const kerja = ruang === 'kerja';
  useEffect(() => langganNaskah(setN), []);
  useEffect(() => { muatInitNaskah().catch(() => {}); muatTelaah().catch(() => {}); muatHasilRapat().catch(() => {}); }, []);

  const telaah = n.telaah;
  const idxK = useMemo(() => indeksKelompok(kelompok), [kelompok]);
  const hasil = useMemo(() => { const o = {}; ((telaah && telaah.urusan) || []).forEach((u) => { o[u.id] = u; }); return o; }, [telaah]);
  const daftar = useMemo(() => (urusan || []).filter((u) => hasil[u.id]), [urusan, hasil]);
  const rapat = useMemo(() => (n.hasilRapat && n.hasilRapat.hasil) || {}, [n.hasilRapat]);
  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return daftar.filter((u) => {
      if (q && !(String(u.id).toLowerCase().indexOf(q) !== -1 || String(u.urusan).toLowerCase().indexOf(q) !== -1)) return false;
      if (tag === 'MONEV') return adaMonev(u);
      if (tag) return !!((hasil[u.id].hitung || {})[tag]);
      return true;
    });
  }, [daftar, hasil, cari, tag]);
  const jumlahTag = useMemo(() => {
    const o = { MONEV: daftar.filter(adaMonev).length };
    daftar.forEach((u) => Object.keys(hasil[u.id].hitung || {}).forEach((k) => { if (hasil[u.id].hitung[k]) o[k] = (o[k] || 0) + 1; }));
    return o;
  }, [daftar, hasil]);
  const Tombol = ({ k, label }) => (
    <button type="button" className={'tag-t tag-' + k + ' tag-klik' + (tag === k ? ' aktif' : '')} onClick={() => { setTag(tag === k ? '' : k); onPilih('ring'); }}
            aria-pressed={tag === k} title={tag === k ? 'Tampilkan semua urusan' : 'Saring urusan'}>
      {label || NAMA_TEMUAN[k]} {jumlahTag[k] || 0}
    </button>
  );

  // v5.4: alamat lama (#telaah-permen, #telaah-luar, #telaah-yatim) kembali ke Ringkasan; isinya kini di halaman Periksa.
  const tampil = sel || 'ring';

  useEffect(() => { try { window.localStorage.setItem(STORAGE_KEY.TELAAH_SEL, sel || 'ring'); } catch (e) { /* abaikan */ } }, [sel]);
  useEffect(() => { const g = document.querySelector('.tl-gulir'); if (g) g.scrollTop = 0; }, [tampil]);

  return (
    <div className="nk-wrap">
      <aside className="nk-rel" aria-label="Daftar urusan">
        <RelAtas><input className="inp nk-cari" type="search" value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari urusan" /></RelAtas>
        <div className="nk-daftar">
          <button type="button" className={'nk-item tl-ring' + (tampil === 'ring' ? ' aktif' : '')} onClick={() => onPilih('ring')}>
            <span /><span className="nk-item-no">Ringkasan {daftar.length} urusan</span><span />
          </button>
          {kelompokUrut(tersaring).map(([k, isi]) => (
            <div key={k} className="nk-bab">
              <div className="nk-bab-judul">{k}{idxK[k] ? ' · ' + idxK[k].judul : ''}</div>
              {isi.map((u) => (
                <button type="button" key={u.id} className={'nk-item' + (tampil === u.id ? ' aktif' : '')} onClick={() => onPilih(u.id)} title={u.urusan}>
                  <i className={'nk-titik ' + titikU(hasil[u.id])} aria-hidden="true" />
                  <span className="nk-item-no">{u.id}</span>
                  <span className="nk-item-judul">{u.urusan}</span>
                  {u.monev && String(u.monev).toLowerCase() !== 'tidak' ? <span className="tanda-m" title="Terkunci Monev">M</span> : <span />}
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="nk-legenda">
          <span><i className="nk-titik hijau" /> tertuang</span>
          <span><i className="nk-titik kuning" /> perlu diperiksa</span>
          <span><i className="nk-titik merah" /> belum tertuang</span>
        </div>
      </aside>
      <TombolLaci label="Daftar urusan" />

      <main className="nk-utama tl-utama tl-kunci">
        <div className="tl-intro">
          <b>{judul || 'Telaah'} menjawab satu pertanyaan per urusan:</b> apakah alur kewenangan pada <b>peta bisnis 2026</b> sudah
          tertuang benar di <b>naskah 2026</b>, dan apa bedanya dengan yang berlaku di <b>Statuta 2025</b>.
          <div className="kecil">Urutan mengikuti peta 2026. Yang diuji: naskah 2026. Bila berbeda, naskah yang menyesuaikan peta.</div>
        </div>
        <div className="tl-legenda kecil">
          <span className="tl-grup-tag">Tertuang:</span><Tombol k="SESUAI" /><Tombol k="DITAMBAH" /><Tombol k="BERUBAH" />
          <span className="tl-grup-tag">Perlu tindakan:</span><Tombol k="PERIKSA" /><Tombol k="BELUM" />
          <span className="tl-grup-tag">Lain:</span><Tombol k="BAWAH" /><Tombol k="MONEV" label="Monev" />
          {tag ? <button type="button" className="tautan kecil" onClick={() => setTag('')}>tampilkan semua</button> : null}
        </div>

        {n.galatTelaah && !telaah ? <div className="galat-kotak">Telaah belum dapat dibaca: {n.galatTelaah}</div> : null}
        {!telaah && !n.galatTelaah ? <div className="nk-muat">Menyusun telaah…</div> : null}

        {telaah && hasil[tampil] ? (
          <Rincian u={daftar.find((u) => u.id === tampil)} h={hasil[tampil]} n={n} ctx={ctx} idxK={idxK} kerja={kerja}
                   rapat={rapat[tampil]} pilihanRapat={(n.hasilRapat && n.hasilRapat.pilihan) || []} onGalat={onGalat}
                   onBukaPasal={onBukaPasal} onBukaUrusan={onBukaUrusan}
                   onGeser={(arah) => { const i = daftar.findIndex((u) => u.id === tampil) + arah; if (daftar[i]) onPilih(daftar[i].id); }} />
        ) : null}
        {telaah && (tampil === 'ring' || !hasil[tampil]) ? (
          <Ringkasan daftar={tersaring} hasil={hasil} ctx={ctx} idxK={idxK} onPilih={onPilih} rapat={rapat} />
        ) : null}
      </main>
    </div>
  );
}

function kelompokUrut(daftar) {
  const out = [];
  daftar.forEach((u) => {
    const k = u.kelompok || String(u.id).split('.')[0];
    const akhir = out[out.length - 1];
    if (akhir && akhir[0] === k) akhir[1].push(u); else out.push([k, [u]]);
  });
  return out;
}

function adaMonev(u) { return !!(u.monev && String(u.monev).toLowerCase() !== 'tidak'); }

function titikU(h) {
  const c = (h && h.hitung) || {};
  if (c.BELUM) return 'merah';
  if (c.PERIKSA) return 'kuning';
  return 'hijau';
}

function TagT({ k, jumlah }) {
  return <span className={'tag-t tag-' + k}>{jumlah != null ? jumlah + ' ' : ''}{NAMA_TEMUAN[k]}</span>;
}

function TagRapat({ r }) {
  if (!r) return <span className="tag-rapat tag-rapat-belum">belum dibahas</span>;
  const k = /setuju/i.test(r.hasil) ? 'ok' : /revisi/i.test(r.hasil) ? 'revisi' : 'tunda';
  return <span className={'tag-rapat tag-rapat-' + k}>{r.hasil}</span>;
}

function oleh() {
  try { return window.localStorage.getItem(STORAGE_KEY.OLEH) || ''; } catch (e) { return ''; }
}

/* ================================================================ RINGKASAN */

function Ringkasan({ daftar, hasil, ctx, idxK, onPilih, rapat }) {
  let grup = '';
  return (
    <div className="tl-gulir">
      <table className="tl-tabel tl-beku">
        <thead>
          <tr><th style={{ width: 64 }}>No</th><th>Urusan</th><th style={{ width: 88 }}>Peta 2025</th><th style={{ width: 88 }}>Peta 2026</th>
            <th>Tertuang di naskah 2026</th><th style={{ width: 230 }}>Temuan</th><th style={{ width: 110 }}>Hasil rapat</th></tr>
        </thead>
        <tbody>
          {daftar.map((u) => {
            const k = u.kelompok || String(u.id).split('.')[0];
            let kepala = null;
            if (k !== grup) {
              grup = k;
              kepala = <tr key={'g' + k} className="tl-grup"><td colSpan={7}>{k}{idxK[k] ? ' · ' + idxK[k].judul : ''}</td></tr>;
            }
            const lama = himpunanLama(u.lama, ctx);
            const baru = himpunanBaru(u.aras, ctx);
            const n25 = ctx.aksi.filter((a) => (lama[a.kode] || new Set()).size).length;
            const n26 = ctx.aksi.filter((a) => (baru[a.kode] || new Set()).size).length;
            const h = hasil[u.id];
            return (
              <React.Fragment key={u.id}>
                {kepala}
                <tr className="tl-klik" onClick={() => onPilih(u.id)}>
                  <td><b>{u.id}</b></td>
                  <td>{u.urusan} {u.monev && String(u.monev).toLowerCase() !== 'tidak' ? <span className="tag-t tag-BELUM">Monev</span> : null}</td>
                  <td>{u.adaDiSumber === false ? '—' : n25 + ' dari ' + ctx.aksi.length}</td>
                  <td>{n26} dari {ctx.aksi.length}</td>
                  <td className="kecil-teks">{(h.letak || []).join('; ') || '—'}</td>
                  <td>{KODE_TEMUAN.filter((kk) => h.hitung[kk]).map((kk) => <TagT key={kk} k={kk} jumlah={h.hitung[kk]} />)}</td>
                  <td><TagRapat r={rapat[u.id]} /></td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ================================================================ RINCIAN */

function Rincian({ u, h, n, ctx, idxK, kerja, rapat, pilihanRapat, onGalat, onBukaPasal, onBukaUrusan, onGeser }) {
  const pasalPerlu = useMemo(() => {
    const s = new Set();
    h.aras.forEach((x) => { (x.i || []).forEach((id) => s.add(pasalId(id))); (x.p || []).forEach((id) => s.add(pasalId(id))); });
    return Array.from(s).filter(Boolean);
  }, [h]);
  useEffect(() => { pasalPerlu.forEach((p) => { muatPasal(p).catch(() => {}); }); }, [pasalPerlu]);
  if (!u) return null;

  const cariAyat = (id, lama) => {
    // Ayat dicari pada salinan pasal mana pun yang sudah dimuat (termasuk "luar" untuk ayat 2025 di pasal lain).
    const ps = n.pasal[pasalId(id)];
    if (ps) {
      const a = (lama ? ps.ayat25 : ps.ayat26).find((x) => x.id === id);
      if (a) return Object.assign({ pasal: ps.pasal }, a);
    }
    let hasil = null;
    Object.keys(n.pasal).forEach((k) => { const l = (n.pasal[k].luar || {})[id]; if (l && !hasil) hasil = Object.assign({ id }, l); });
    return hasil;
  };
  const langkah = urutkan(u.lama);
  const baru = himpunanBaru(u.aras, ctx);
  const k = u.kelompok || String(u.id).split('.')[0];

  return (
    <>
      <div className="tl-kepala">
        <div className="rincian-no">{k}{idxK[k] ? ' · ' + idxK[k].judul : ''}{u.butir ? ' · Butir Permen ' + u.butir : ''}{u.muatan ? ' · ' + u.muatan : ''}{u.penuangan ? ' · ' + u.penuangan : ''}</div>
        <div className="nk-judul-baris">
          <h2 className="nk-judul">{u.id} · {u.urusan}</h2>
          {u.monev && String(u.monev).toLowerCase() !== 'tidak' ? <span className="lencana lencana-merah">Monev {u.monev}</span> : null}
          {!kerja ? <TagRapat r={rapat} /> : null}
          <TombolTautan alamat={'#telaah-' + encodeURIComponent(u.id)} />
          <div className="nk-pindah">
            <button type="button" className="tbl tbl-ringan" onClick={() => onGeser(-1)} aria-label="Urusan sebelumnya">‹</button>
            <button type="button" className="tbl tbl-ringan" onClick={() => onGeser(1)} aria-label="Urusan berikutnya">›</button>
          </div>
        </div>
        {kerja ? (
          <div className="kecil">Dasar Statuta 2025 menurut peta 2025: {u.pasal || '—'}{u.status ? ' · status ' + u.status : ''}
            <button type="button" className="tautan tl-kepeta" onClick={() => onBukaUrusan(u.id)}>Buka urusan di Peta ›</button></div>
        ) : (rapat && rapat.catatan ? <div className="kecil">Catatan rapat: {rapat.catatan}</div> : null)}
        {kerja ? <HasilRapat id={u.id} r={rapat} pilihan={pilihanRapat} onGalat={onGalat} /> : null}
      </div>
      <div className="tl-gulir">
        <table className="tl-tabel tl-rinci tl-beku">
          <thead>
            <tr><th style={{ width: 120 }}>Aras</th>{kerja ? <><th style={{ width: 120 }}>Peta 2025</th><th>Padanan Statuta 2025</th></> : null}
              <th style={{ width: 160 }}>Peta 2026</th><th>Naskah 2026</th><th style={{ width: 170 }}>Temuan</th></tr>
          </thead>
          <tbody>
            {h.aras.map((x) => {
              const a = ctx.aksi.find((y) => y.kode === x.A) || { nama: x.A };
              const x26 = (u.aras || {})[x.A] || {};
              const l = langkah.filter((s) => s.aksi === x.A);
              const kodeOrg = Array.from(baru[x.A] || []);
              const kata = kodeOrg.map((kk) => (ctx.idxKode[kk] ? ctx.idxKode[kk].nama : '')).filter(Boolean);
              return (
                <tr key={x.A}>
                  <td><b>{a.nama}</b></td>
                  {kerja ? (
                    <>
                      <td>{l.length ? l.map((s) => <div key={s.kunci}><ChipOrgan kode={s.organ} ctx={ctx} teks={'langkah ' + s.nomor} /></div>) : <span className="redup">—</span>}</td>
                      <td className="tl-kutip">
                        {(x.p || []).slice(0, 2).map((id) => {
                          const ay = cariAyat(id, true);
                          return ay ? <div key={id}><button type="button" className="tautan" onClick={() => onBukaPasal(ay.pasal)}>{labelAyat(ay.pasal, ay.nomor, true)}</button> {potong(ay.teks, 160)}</div>
                            : <div key={id} className="redup">{id} (memuat…)</div>;
                        })}
                        {!(x.p || []).length ? <span className="redup">{l.length ? 'padanan belum tercatat di Jejak' : 'tidak diatur'}</span> : null}
                      </td>
                    </>
                  ) : null}
                  <td>{kodeOrg.map((kk) => <ChipOrgan key={kk} kode={kk} ctx={ctx} />)} {x26.unit || '—'}<div className="kecil">{x26.pasal || ''}</div></td>
                  <td className="tl-kutip">
                    {(x.i || []).slice(0, 3).map((id) => {
                      const ay = cariAyat(id, false);
                      return ay ? <div key={id}><button type="button" className="tautan" onClick={() => onBukaPasal(ay.pasal)}>{labelAyat(ay.pasal, ay.nomor)}</button> <Sorot teks={potong(ay.teks, 260)} kata={kata} /></div>
                        : <div key={id} className="redup">{id} (memuat…)</div>;
                    })}
                    {!(x.i || []).length ? <span className="redup">{x26.pasal || '—'}</span> : null}
                  </td>
                  <td><TagT k={x.t} />{x.k && kerja ? <div className="kecil">{x.k}</div> : null}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="kecil">Nomor pasal dapat diklik untuk membuka ayat utuh di halaman Naskah. Sorotan kuning pada Naskah 2026 = nama organ yang dicari.</p>
      </div>
    </>
  );
}

/** Pencatatan hasil pembahasan bunyi naskah satu urusan (ruang Kerja). Hanya status dan catatan substansi. */
function HasilRapat({ id, r, pilihan, onGalat }) {
  // v5.6: catatan yang belum tersimpan disimpan sebagai draf di peramban.
  const [draf, setDraf, lepas] = useDraf('rapat:' + id, null);
  const [pesan, setPesan] = useState('');
  useEffect(() => { setPesan(''); }, [id]);
  const d = draf || { hasil: r ? r.hasil : '', catatan: r ? r.catatan : '' };
  const simpan = async (patch) => {
    const nilai = Object.assign({}, d, patch);
    setDraf(nilai);
    setPesan('Menyimpan…');
    try {
      await simpanHasilRapat({ id, hasil: nilai.hasil, catatan: nilai.catatan, oleh: oleh() });
      lepas(null);
      setPesan('Tersimpan');
    } catch (e) {
      const m = (e && e.message) || String(e);
      setPesan('Gagal disimpan (' + m + '). Ketikan tetap di sini.'); if (onGalat) onGalat(m);
    }
  };
  return (
    <div className="tl-hasil">
      <b>Hasil rapat</b>
      {pilihan.map((p) => (
        <button type="button" key={p} className={'pil' + (d.hasil === p ? ' aktif' : '')} onClick={() => simpan({ hasil: d.hasil === p ? '' : p })}>{p}</button>
      ))}
      <input className="inp" value={d.catatan} placeholder="Catatan substansi (tanpa riwayat proses)"
             onChange={(e) => setDraf(Object.assign({}, d, { catatan: e.target.value }))}
             onBlur={() => { if (draf && draf.catatan !== (r ? r.catatan : '')) simpan({}); }} />
      {pesan ? <span className={'kecil' + (/gagal|tidak|wajib/i.test(pesan) ? ' jj-pesan' : '')}>{pesan}</span> : null}
      {draf && /^Gagal/.test(pesan) ? <button type="button" className="tbl" onClick={() => simpan({})}>Simpan ulang</button> : null}
    </div>
  );
}

function potong(t, n) {
  const s = String(t || '');
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function Sorot({ teks, kata }) {
  const daftar = (kata || []).filter((k) => k && k.length > 2);
  if (!daftar.length) return <span>{teks}</span>;
  const rx = new RegExp('(' + daftar.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'gi');
  const bagian = String(teks).split(rx);
  return <span>{bagian.map((b, i) => (i % 2 ? <mark key={i} className="tl-organ">{b}</mark> : <React.Fragment key={i}>{b}</React.Fragment>))}</span>;
}

/* ================================================================ BUTIR PERMEN (v5.3) */

const BELUM_TERPENUHI = ['BELUM ADA', 'SEBAGIAN'];

/** v5.4: dipakai halaman Periksa. Satu sakelar: yang belum terpenuhi (bawaan) atau semua butir. */
export function ButirPermen({ n, onBukaPasal, onPilih, onGalat }) {
  const [semua, setSemua] = useState(false);
  useEffect(() => { muatKepatuhan().catch((e) => onGalat && onGalat((e && e.message) || String(e))); }, [onGalat]);
  const k = n.kepatuhan;
  if (!k) return <div className="nk-muat">Membaca butir Permen…</div>;
  if (!k.ada) return <div className="panel-info">{k.alasan}</div>;
  // v5.5: "belum" dihitung dari status saja; alamat/urusan yang tidak cocok tampil sebagai catatan di barisnya.
  const belum = (b) => BELUM_TERPENUHI.indexOf(b.st) !== -1;
  const nBelum = k.butir.filter(belum).length;
  const isi = semua ? k.butir : k.butir.filter(belum);
  let grup = '';
  return (
    <>
      <div className="tl-kepala">
        <div className="chip-baris">
          <button type="button" className={'pil' + (!semua ? ' aktif' : '')} onClick={() => setSemua(false)}>Belum terpenuhi {nBelum}</button>
          <button type="button" className={'pil' + (semua ? ' aktif' : '')} onClick={() => setSemua(true)}>Semua {k.butir.length}</button>
          <span className="kecil">Status dibaca dari tab {k.tab}.</span>
        </div>
      </div>
      <div className="tl-gulir">
        <table className="tl-tabel tl-beku">
          <thead><tr><th style={{ width: 100 }}>Butir</th><th>Bunyi Permen</th><th style={{ width: 190 }}>Letak di naskah 2026</th>
            <th style={{ width: 80 }}>Urusan</th><th style={{ width: 280 }}>Status dan yang kurang</th></tr></thead>
          <tbody>
            {isi.map((b) => {
              let kepala = null;
              if (b.g !== grup) { grup = b.g; kepala = <tr key={'g' + b.k} className="tl-grup"><td colSpan={5}>{b.g}</td></tr>; }
              return (
                <React.Fragment key={b.k}>
                  {kepala}
                  <tr>
                    <td><b>{b.k}</b><div className="kecil">{String(b.s || '').split(' — ')[0]}</div></td>
                    <td className="tl-kutip">{b.b}</td>
                    <td className="kecil-teks"><AlamatPasal teks={b.p} onBukaPasal={onBukaPasal} />
                      {b.patah.length ? <div className="jj-pesan">Tidak ada di naskah: {b.patah.join(', ')}</div> : null}</td>
                    <td>{String(b.u || '').split(/[;,]/).map((t) => t.trim()).filter(Boolean).map((t) => {
                      const id = (/^[A-Z]\d+\.\d+/.exec(t) || [])[0];
                      return id ? <div key={t}><button type="button" className="tautan" onClick={() => onPilih(id)}>{t}</button></div> : <div key={t} className="kecil">{t}</div>;
                    })}{b.uh.length ? <div className="jj-pesan">Tidak ada di peta: {b.uh.join(', ')}</div> : null}</td>
                    <td><span className={'tag-st tag-st-' + b.st.replace(/\s/g, '-')}>{b.st.toLowerCase()}</span> <span className="kecil-teks">{b.c}</span></td>
                  </tr>
                </React.Fragment>
              );
            })}
            {!isi.length ? <tr><td colSpan={5} className="redup">Semua butir sudah terpenuhi.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** "Pasal 47 ayat (13); Pasal 60" → tombol per pasal yang membuka halaman Naskah. */
export function AlamatPasal({ teks, onBukaPasal }) {
  const s = String(teks || '');
  const bagian = s.split(/(Pasal\s+\d+)/);
  return (
    <span>{bagian.map((b, i) => {
      const m = /^Pasal\s+(\d+)$/.exec(b);
      return m ? <button type="button" key={i} className="tautan" onClick={() => onBukaPasal(Number(m[1]))}>{b}</button> : <React.Fragment key={i}>{b}</React.Fragment>;
    })}</span>
  );
}

/* ================================================================ MUATAN DI LUAR PETA (v5.3) */

const NAMA_JENIS = { dibawa: 'Dibawa dari 2025', baru: 'Baru di 2026', dihapus: 'Dihapus dari 2025' };

/**
 * Dipakai halaman Periksa (v5.5).
 *   jenis "luar"  : ayat 2026 tanpa urusan, dikelompokkan per pasal; satu putusan per pasal.
 *   jenis "hapus" : ayat Statuta 2025 yang jejaknya DIHAPUS; dikonfirmasi satu per satu beserta alasan.
 * Bawaan: hanya yang belum diputus.
 */
export function MuatanLuar({ n, urusan, onBukaPasal, onGalat, jenis }) {
  const hapus = jenis === 'hapus';
  const [belum, setBelum] = useState(true);
  const [draf, setDraf] = useDraf('luar:' + (hapus ? 'hapus' : 'luar'), {});   // v5.6: draf putusan bertahan bila simpan gagal
  const [pesan, setPesan] = useState({});
  useEffect(() => { muatLuar().catch((e) => onGalat && onGalat((e && e.message) || String(e))); }, [onGalat]);
  const L = n.luar;
  if (!L) return <div className="nk-muat">Menyusun daftar…</div>;
  const set = (k, patch) => setDraf((d) => Object.assign({}, d, { [k]: Object.assign({}, d[k] || {}, patch) }));
  const hapusDraf = (k) => setDraf((d) => { const nd = Object.assign({}, d); delete nd[k]; return nd; });
  const tulisPesan = (k, m) => setPesan((p) => Object.assign({}, p, { [k]: m }));

  if (hapus) {
    const ok = (x) => !!(x.jejak && x.jejak.dikonfirmasi);
    const isi = L.baris.filter((x) => x.j === 'dihapus' && (!belum || !ok(x)));
    const setuju = async (x) => {
      const d = draf[x.id] || {};
      if (!String(d.alasan || '').trim()) { tulisPesan(x.id, 'Alasan wajib diisi.'); return; }
      tulisPesan(x.id, 'Menyimpan…');
      try { await konfirmasiHapusLuar(x, d.alasan, oleh()); hapusDraf(x.id); tulisPesan(x.id, ''); }
      catch (e) { tulisPesan(x.id, 'Gagal disimpan (' + ((e && e.message) || String(e)) + '). Ketikan tetap di sini.'); }
    };
    return (
      <>
        <div className="tl-kepala">
          <div className="chip-baris">
            <button type="button" className={'pil' + (belum ? ' aktif' : '')} onClick={() => setBelum(true)}>Belum dikonfirmasi {L.rekap.hapusBelum}</button>
            <button type="button" className={'pil' + (!belum ? ' aktif' : '')} onClick={() => setBelum(false)}>Semua {L.rekap.dihapus}</button>
          </div>
        </div>
        <div className="tl-gulir">
          <table className="tl-tabel tl-beku">
            <thead><tr><th style={{ width: 130 }}>Letak 2025</th><th>Bunyi Statuta 2025</th><th style={{ width: 330 }}>Putusan</th></tr></thead>
            <tbody>
              {isi.map((x) => (
                <tr key={x.id}>
                  <td><button type="button" className="tautan" onClick={() => onBukaPasal(x.pasal)}>{labelAyat(x.pasal, x.nomor, true)}</button></td>
                  <td className="tl-kutip teks-pre">{x.teks}</td>
                  <td>
                    {ok(x) ? (
                      <><span className="tag-t tag-BELUM">dihapus · dikonfirmasi</span><div className="kecil">{x.jejak.alasan}</div></>
                    ) : (
                      <div className="tl-putus">
                        <textarea className="inp" rows={2} placeholder="Alasan setuju dihapus (wajib)" value={(draf[x.id] && draf[x.id].alasan) || ''} onChange={(e) => set(x.id, { alasan: e.target.value })} />
                        <div className="tl-aksi">
                          <button type="button" className="tbl" onClick={() => setuju(x)}>{/^Gagal/.test(pesan[x.id] || '') ? 'Simpan ulang' : 'Setuju dihapus'}</button>
                          <button type="button" className="tbl tbl-ringan" onClick={() => onBukaPasal(x.pasal)}>Pertahankan… (buka Naskah)</button>
                          {pesan[x.id] ? <span className="jj-pesan">{pesan[x.id]}</span> : null}
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {!isi.length ? <tr><td colSpan={3} className="redup">Semua ayat yang dihapus sudah dikonfirmasi.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  const grup = [];
  const idx = {};
  L.baris.filter((x) => x.j !== 'dihapus').forEach((x) => {
    if (!idx[x.pasal]) { idx[x.pasal] = { pasal: x.pasal, judul: x.judul, baris: [] }; grup.push(idx[x.pasal]); }
    idx[x.pasal].baris.push(x);
  });
  grup.forEach((g) => { g.diputus = g.baris.every((x) => x.pu); g.pu = g.baris.map((x) => x.pu).filter(Boolean)[0] || null; });
  const tampil = grup.filter((g) => !belum || !g.diputus);
  const simpan = async (g) => {
    const d = draf[g.pasal] || {};
    if (!d.putusan) { tulisPesan(g.pasal, 'Pilih putusan.'); return; }
    if (!String(d.alasan || '').trim()) { tulisPesan(g.pasal, 'Alasan wajib diisi.'); return; }
    tulisPesan(g.pasal, 'Menyimpan…');
    try { await simpanPutusanPasal({ pasal: g.pasal, putusan: d.putusan, alasan: d.alasan, urusan: d.urusan || '', oleh: oleh() }); hapusDraf(g.pasal); tulisPesan(g.pasal, ''); }
    catch (e) { tulisPesan(g.pasal, 'Gagal disimpan (' + ((e && e.message) || String(e)) + '). Ketikan tetap di sini.'); }
  };
  return (
    <>
      <div className="tl-kepala">
        <div className="chip-baris">
          <button type="button" className={'pil' + (belum ? ' aktif' : '')} onClick={() => setBelum(true)}>Belum diputus {L.rekap.pasalBelum} pasal</button>
          <button type="button" className={'pil' + (!belum ? ' aktif' : '')} onClick={() => setBelum(false)}>Semua {L.rekap.pasal} pasal</button>
          <span className="kecil">Pasal ketentuan umum dan penutup dikecualikan. Putusan tidak mengubah naskah.</span>
        </div>
      </div>
      <div className="tl-gulir">
        <table className="tl-tabel tl-beku">
          <thead><tr><th style={{ width: 150 }}>Pasal</th><th>Ayat yang tidak dirujuk urusan</th><th style={{ width: 330 }}>Putusan untuk pasal ini</th></tr></thead>
          <tbody>
            {tampil.map((g) => {
              const d = draf[g.pasal];
              return (
                <tr key={g.pasal}>
                  <td><button type="button" className="tautan" onClick={() => onBukaPasal(g.pasal)}>Pasal {g.pasal}</button>{g.judul ? <div className="kecil">{g.judul}</div> : null}</td>
                  <td className="tl-kutip">
                    {g.baris.map((x) => (
                      <div key={x.id} className="pk-ayat">
                        <b>{labelAyat(x.pasal, x.nomor)}</b> <span className={'tag-jenis tag-jenis-' + x.j}>{NAMA_JENIS[x.j]}</span> {potong(x.teks, 220)}
                      </div>
                    ))}
                  </td>
                  <td>
                    {g.diputus && !d ? (
                      <div>
                        <span className={'tag-t ' + (/hapus/i.test(g.pu.putusan) ? 'tag-BELUM' : 'tag-SESUAI')}>{g.pu.putusan}</span>
                        {g.pu.urusan ? <span className="kecil"> → {g.pu.urusan}</span> : null}<div className="kecil">{g.pu.alasan}</div>
                        <button type="button" className="tbl tbl-ringan tl-ubah" onClick={() => set(g.pasal, { putusan: g.pu.putusan, alasan: g.pu.alasan, urusan: g.pu.urusan })}>Ubah</button>
                      </div>
                    ) : (
                      <div className="tl-putus">
                        <div className="chip-baris">
                          {L.pilihan.map((p) => (
                            <button type="button" key={p} className={'pil' + (d && d.putusan === p ? ' aktif' : '')} onClick={() => set(g.pasal, { putusan: p })}>{p}</button>
                          ))}
                        </div>
                        {d ? (
                          <>
                            {/urusan/i.test(d.putusan || '') ? (
                              <select className="inp" value={d.urusan || ''} onChange={(e) => set(g.pasal, { urusan: e.target.value })}>
                                <option value="">Pilih urusan…</option>
                                {(urusan || []).map((u) => <option key={u.id} value={u.id}>{u.id} · {u.urusan}</option>)}
                              </select>
                            ) : null}
                            <textarea className="inp" rows={2} placeholder="Alasan (wajib)" value={d.alasan || ''} onChange={(e) => set(g.pasal, { alasan: e.target.value })} />
                            <div className="tl-aksi">
                              <button type="button" className="tbl" onClick={() => simpan(g)}>{/^Gagal/.test(pesan[g.pasal] || '') ? 'Simpan ulang' : 'Simpan'}</button>
                              <button type="button" className="tbl tbl-ringan" onClick={() => hapusDraf(g.pasal)}>Batal</button>
                              {pesan[g.pasal] ? <span className="jj-pesan">{pesan[g.pasal]}</span> : null}
                            </div>
                          </>
                        ) : null}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {!tampil.length ? <tr><td colSpan={3} className="redup">Semua pasal sudah diputus.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
