import React, { useState } from 'react';
import { himpunanBaru, himpunanLama } from '../utils/aras';
import { urutkan } from '../utils/langkah';
import { adaAras25, hurufAras, ringkasRujukan } from '../utils/telaah';
import { bukaRujukan, pecahTeksRujukan } from '../utils/bukaAyat';

/**
 * Pita peta bisnis (v5.1). Setiap naskah membawa petanya sendiri:
 *   tahun="2025" : di bawah ayat Statuta 2025 — alur urusan menurut peta 2025 (langkah dan organ Statuta 2025).
 *   tahun="2026" : di bawah ayat rancangan 2026 — alur urusan menurut peta 2026.
 * Kedua pita memakai lima kotak aras yang sama, sehingga perbedaan alur terbaca dengan membandingkan kolom kiri dan kanan.
 *
 * v5.15 — satu aturan untuk dua sisi:
 *   - pita menempel pada ayat yang menyebut langkah urusan; aras yang dituangkan ayat ini dibingkai biru
 *     (dengan huruf bila yang dirujuk hanya satu huruf);
 *   - urusan yang tampil di satu sisi selalu tampil juga di sisi lain pada baris yang sama; bila ayat di sisi itu
 *     tidak menuangkan langkahnya, urusan tampil redup (item.cermin) dengan keterangan letak langkahnya;
 *   - rujukan ayat dapat diklik (onBukaPasal); ringkas = pita dengan banyak urusan tampil tertutup lebih dulu.
 * Warna dan kode organ dibaca dari Cfg_Organ; nama aras dari Cfg_Aksi.
 */
export default function PitaPeta({ daftar, ctx, tahun, onTelaah, onBukaUrusan, onBukaPasal, ringkas }) {
  const [buka, setBuka] = useState({});
  const [lebar, setLebar] = useState(false);
  if (!daftar || !daftar.length) return null;
  const lama = tahun === '2025';
  const tutup = !!ringkas && !lebar;
  return (
    <div className={'pp' + (lama ? ' pp-25' : '')}>
      <div className="pp-j">
        <span className="pp-ikon">P</span>Peta bisnis {tahun}{daftar.length > 1 ? ' — ' + daftar.length + ' urusan' : ''}
        {ringkas ? (
          <button type="button" className="pp-ringkas" onClick={() => setLebar(!lebar)} aria-expanded={!tutup}>
            {tutup ? 'tampilkan' : 'sembunyikan'}
          </button>
        ) : null}
        {tutup ? null : <KepalaMini ctx={ctx} />}
      </div>
      {tutup ? null : daftar.map(({ u, aras, cermin }) => {
        const baru = himpunanBaru(u.aras, ctx);
        const hLama = himpunanLama(u.lama, ctx);
        const berubah = u.adaDiSumber !== false && ctx.aksi.some((a) => !samaSet(baru[a.kode], hLama[a.kode]));
        const langkah = urutkan(u.lama);
        const terbuka = !!buka[u.id];
        // v5.18: satu aras dapat diisi lebih dari satu organ; semuanya ditampilkan (urut Cfg_Organ).
        const isi = lama
          ? (k) => urutOrgan(langkah.filter((x) => x.aksi === k).map((x) => x.organ), ctx)
          : (k) => urutOrgan(Array.from(baru[k] || []), ctx);
        const letak = cermin ? (lama ? letak25(u) : letak26(u, ctx)) : '';
        return (
          <div key={u.id} className={cermin ? 'pp-luar' : undefined}>
            <button type="button" className="pp-ur" onClick={() => setBuka(Object.assign({}, buka, { [u.id]: !terbuka }))}
                    aria-expanded={terbuka} title={'Lihat alur ' + tahun}>
              <span className="pp-nama">{u.urusan}
                <small>{u.id}
                  {cermin ? ' · ' + letak
                    : (aras && aras.size ? ' · ayat ini: ' + namaAras(aras, ctx) : '')}
                  {!lama && !cermin ? (berubah ? <b className="pp-berubah"> · alur berubah dari 2025</b> : (u.adaDiSumber === false ? ' · urusan baru' : '')) : null}
                </small>
              </span>
              <Mini ctx={ctx} isi={isi} tandai={cermin ? null : aras} />
            </button>
            {terbuka ? (lama
              ? <Alur2025 u={u} ctx={ctx} langkah={langkah} aras={cermin ? null : aras} letak={letak} tahun={tahun}
                          onTelaah={onTelaah} onBukaUrusan={onBukaUrusan} onBukaPasal={onBukaPasal} />
              : <Alur2026 u={u} ctx={ctx} aras={cermin ? null : aras} baru={baru} hLama={hLama} letak={letak} tahun={tahun}
                          onTelaah={onTelaah} onBukaUrusan={onBukaUrusan} onBukaPasal={onBukaPasal} />) : null}
          </div>
        );
      })}
    </div>
  );
}

/** "mempertimbangkan, memutuskan (huruf f)" */
function namaAras(aras, ctx) {
  return ctx.aksi.filter((a) => aras.has(a.kode)).map((a) => {
    const h = hurufAras(aras, a.kode);
    return String(a.nama || a.kode).toLowerCase() + (h ? ' (huruf ' + h + ')' : '');
  }).join(', ');
}

/** Letak langkah urusan pada Statuta 2025, untuk urusan cermin di pita 2025. */
export function letak25(u) {
  if (u.adaDiSumber === false) return 'urusan baru, tidak ada pada peta 2025';
  if (!adaAras25(u)) return 'langkahnya tidak disebut di ayat Statuta 2025';
  return 'langkahnya di 2025: ' + ringkasRujukan(u.aras25);
}

/** Letak langkah urusan pada rancangan 2026, untuk urusan cermin di pita 2026. */
export function letak26(u, ctx) {
  if (u.adaDiRancangan === false) return 'tidak ada pada peta 2026';
  const teks = {};
  ctx.aksi.forEach((a) => { const x = (u.aras || {})[a.kode]; if (x && x.pasal) teks[a.kode] = x.pasal; });
  const r = ringkasRujukan(teks);
  return r ? 'langkahnya di 2026: ' + r : 'langkahnya diatur di bawah Statuta';
}

/** Teks dengan rujukan ayat yang dapat diklik. */
export function TeksRujukanPeta({ teks, tahun, onBukaPasal }) {
  if (!onBukaPasal) return <>{teks}</>;
  return (
    <>
      {pecahTeksRujukan(teks).map((p, i) => (p.r
        ? <span key={i} role="button" tabIndex={0} className="pp-ruj" title={'Buka ' + p.t}
                onClick={(e) => { e.stopPropagation(); bukaRujukan(tahun, p.r, onBukaPasal); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); bukaRujukan(tahun, p.r, onBukaPasal); } }}>{p.t}</span>
        : <React.Fragment key={i}>{p.t}</React.Fragment>))}
    </>
  );
}

function samaSet(a, b) {
  const x = a || new Set();
  const y = b || new Set();
  if (x.size !== y.size) return false;
  for (const v of x) if (!y.has(v)) return false;
  return true;
}

function singkat(a) {
  const k = String(a.kode || '').toUpperCase();
  return k.length <= 5 ? k : k.slice(0, 4);
}

function KepalaMini({ ctx }) {
  return (
    <span className="pp-am pp-am-kepala" aria-hidden="true">
      {ctx.aksi.map((a) => <span key={a.kode} title={a.nama || a.kode}>{singkat(a)}</span>)}
    </span>
  );
}

/** Kode organ unik, diurutkan menurut kolom Urutan Cfg_Organ (Yayasan sebelum Rektor, dst.). */
function urutOrgan(daftar, ctx) {
  const unik = Array.from(new Set((daftar || []).filter(Boolean)));
  const no = (k) => { const o = ctx.idxKode[k]; return o && o.urutan !== undefined && o.urutan !== '' ? Number(o.urutan) : 99; };
  return unik.sort((a, b) => no(a) - no(b));
}

/**
 * Lima kotak aras berisi kode organ. tandai = aras yang dituangkan ayat ini.
 * v5.18: bila satu aras diisi dua organ atau lebih, kotaknya dibelah bertumpuk sehingga semua organ terbaca.
 */
function Mini({ ctx, isi, tandai }) {
  return (
    <span className="pp-am">
      {ctx.aksi.map((a) => {
        const kode = isi(a.kode) || [];
        const ini = tandai && tandai.has(a.kode);
        const nama = kode.map((k) => { const o = ctx.idxKode[k]; return o ? o.nama : String(k).replace(/^NAMA:/, ''); });
        const judul = (a.nama || a.kode) + ': ' + (nama.length ? nama.join(' dan ') : 'tidak diatur') + (ini ? ' — dituangkan ayat ini' : '');
        if (!kode.length) return <span key={a.kode} className={'pp-am-kosong' + (ini ? ' pp-am-ini' : '')} title={judul}>—</span>;
        return (
          <span key={a.kode} className={(kode.length > 1 ? 'pp-am-ganda' : '') + (ini ? ' pp-am-ini' : '')} title={judul}
                style={kode.length === 1 ? warna(kode[0], ctx) : undefined}>
            {kode.length === 1 ? label(kode[0], ctx) : kode.map((k) => <i key={k} style={warna(k, ctx)}>{label(k, ctx)}</i>)}
          </span>
        );
      })}
    </span>
  );
}

function warna(k, ctx) {
  const o = ctx.idxKode[k];
  return o ? { background: o.warnaLatar, color: o.warnaTeks } : undefined;
}

function label(k, ctx) {
  const o = ctx.idxKode[k];
  return o ? o.kode : String(k).replace(/^NAMA:/, '').slice(0, 5);
}

export function ChipOrgan({ kode, ctx, teks }) {
  const o = ctx.idxKode[kode];
  const label = o ? o.kode : String(kode || '').replace(/^NAMA:/, '');
  return (
    <span className="org-chip" style={o ? { background: o.warnaLatar, color: o.warnaTeks } : undefined} title={o ? o.nama : label}>
      {label}{teks ? <span className="org-chip-teks">{teks}</span> : null}
    </span>
  );
}

function KepalaAlur({ ctx }) {
  return (
    <div className="pp-brs pp-kepala-brs">
      {ctx.aksi.map((a) => <span key={a.kode} className="pp-h">{String(a.nama || a.kode).toUpperCase()}</span>)}
    </div>
  );
}


function Kaki({ u, teks, onTelaah, onBukaUrusan }) {
  return (
    <div className="pp-kaki">
      <span className="kecil">{teks}</span>
      {onTelaah ? <button type="button" className="tbl tbl-ringan" onClick={() => onTelaah(u.id)}>Telaah urusan</button> : null}
      {onBukaUrusan ? <button type="button" className="tbl tbl-ringan" onClick={() => onBukaUrusan(u.id)}>Buka di Peta ›</button> : null}
    </div>
  );
}

function Alur2025({ u, ctx, langkah, aras, letak, tahun, onTelaah, onBukaUrusan, onBukaPasal }) {
  const per = u.aras25 || null;   // v5.14: ayat Statuta 2025 per aras
  return (
    <div className="pp-alur pp-lama">
      <KepalaAlur ctx={ctx} />
      <div className="pp-brs">
        {ctx.aksi.map((a) => {
          const l = langkah.filter((s) => s.aksi === a.kode);
          const ini = !!(aras && aras.has(a.kode));
          const h = ini ? hurufAras(aras, a.kode) : '';
          return (
            <span key={a.kode} className={'pp-c' + (l.length ? '' : ' pp-kosong') + (ini ? ' pp-ini' : '')}>
              {l.length ? l.map((s) => <ChipOrgan key={s.kunci} kode={s.organ} ctx={ctx} teks={String(s.nomor)} />) : 'tidak diatur'}
              {per && l.length ? <em>{ini ? 'ayat ini' + (h ? ' (huruf ' + h + ')' : '')
                : <TeksRujukanPeta teks={per[a.kode] || ''} tahun={tahun} onBukaPasal={onBukaPasal} />}</em> : null}
            </span>
          );
        })}
      </div>
      <Kaki u={u} onTelaah={onTelaah} onBukaUrusan={onBukaUrusan}
            teks={<>{letak ? <b>{letak.charAt(0).toUpperCase() + letak.slice(1)}. </b> : null}
              Angka pada kotak = urutan langkah{aras && aras.size ? ' · bingkai biru = dituangkan ayat ini' : ''} · teks di bawah kotak = ayat 2025 yang menyebut langkah itu.
              Dasar urusan pada Statuta 2025: <TeksRujukanPeta teks={u.pasal || '—'} tahun={tahun} onBukaPasal={onBukaPasal} /></>} />
    </div>
  );
}

function Alur2026({ u, ctx, aras, baru, hLama, letak, tahun, onTelaah, onBukaUrusan, onBukaPasal }) {
  return (
    <div className="pp-alur">
      <KepalaAlur ctx={ctx} />
      <div className="pp-brs">
        {ctx.aksi.map((a) => {
          const x = (u.aras || {})[a.kode] || {};
          const ubah = u.adaDiSumber !== false && !samaSet(baru[a.kode], hLama[a.kode]);
          const ini = !!(aras && aras.has(a.kode));
          const h = ini ? hurufAras(aras, a.kode) : '';
          return (
            <span key={a.kode} className={'pp-c' + (ubah ? ' pp-ubah' : '') + (ini ? ' pp-ini' : '')}>
              {Array.from(baru[a.kode] || []).map((k) => <ChipOrgan key={k} kode={k} ctx={ctx} />)}
              <span className="pp-unit">{x.unit || '—'}</span>
              <em>{ini ? 'ayat ini' + (h ? ' (huruf ' + h + ')' : '') : <TeksRujukanPeta teks={x.pasal || ''} tahun={tahun} onBukaPasal={onBukaPasal} />}</em>
            </span>
          );
        })}
      </div>
      <Kaki u={u} onTelaah={onTelaah} onBukaUrusan={onBukaUrusan}
            teks={<>{letak ? <b>{letak.charAt(0).toUpperCase() + letak.slice(1)}. </b> : null}
              Bingkai kuning = berbeda dari peta 2025 · bingkai biru = dituangkan ayat ini · "Diatur di bawah Statuta" = diatur dalam peraturan di bawah Statuta (unit kerja atau proses internal organ).</>} />
    </div>
  );
}

/**
 * Peta bisnis ringkas untuk ruang Rapat (v5.3): satu baris nama urusan per ayat 2026.
 * Nama urusan diklik membuka alur lima aras dalam dua baris, Statuta 2025 dan rancangan 2026;
 * bingkai kuning = berbeda dari 2025, bingkai biru = aras yang dituangkan ayat ini.
 */
export function PetaBaris({ daftar, ctx, onTelaah }) {
  const [buka, setBuka] = useState({});
  if (!daftar || !daftar.length) return null;
  return (
    <div className="pb-baris">
      <span className="pb-lbl">PETA BISNIS</span>
      {daftar.map(({ u }) => (
        <button type="button" key={u.id} className={'pb-urusan' + (buka[u.id] ? ' aktif' : '')}
                onClick={() => setBuka(Object.assign({}, buka, { [u.id]: !buka[u.id] }))} aria-expanded={!!buka[u.id]}>
          {u.id} {u.urusan} {buka[u.id] ? '▴' : '▾'}
        </button>
      ))}
      {daftar.filter(({ u }) => buka[u.id]).map(({ u, aras }) => {
        const baru = himpunanBaru(u.aras, ctx);
        const lama = himpunanLama(u.lama, ctx);
        const langkah = urutkan(u.lama);
        return (
          <div className="pb-alur" key={'a' + u.id}>
            <div className="pb-g">
              <span />
              {ctx.aksi.map((a) => <span key={a.kode} className="pp-h">{String(a.nama || a.kode).toUpperCase()}</span>)}
              <span className="pb-t">2025</span>
              {ctx.aksi.map((a) => {
                const l = langkah.filter((s) => s.aksi === a.kode);
                return <span key={a.kode} className="pb-c">{l.length ? l.map((s) => <ChipOrgan key={s.kunci} kode={s.organ} ctx={ctx} />) : <span className="redup">—</span>}</span>;
              })}
              <span className="pb-t">2026</span>
              {ctx.aksi.map((a) => {
                const ubah = u.adaDiSumber !== false && !samaSet(baru[a.kode], lama[a.kode]);
                const ini = aras && aras.has(a.kode);
                const org = Array.from(baru[a.kode] || []);
                return <span key={a.kode} className={'pb-c' + (ubah ? ' pp-ubah' : '') + (ini ? ' pp-ini' : '')}>{org.length ? org.map((k) => <ChipOrgan key={k} kode={k} ctx={ctx} />) : <span className="redup">—</span>}</span>;
              })}
            </div>
            <div className="kecil">Bingkai kuning = berbeda dari Statuta 2025 · bingkai biru = dituangkan ayat ini
              {onTelaah ? <> · <button type="button" className="tautan" onClick={() => onTelaah(u.id)}>telaah urusan ›</button></> : null}</div>
          </div>
        );
      })}
    </div>
  );
}
