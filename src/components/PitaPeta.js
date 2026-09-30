import React, { useState } from 'react';
import { himpunanBaru, himpunanLama } from '../utils/aras';
import { urutkan } from '../utils/langkah';

/**
 * Pita peta bisnis (v5.1). Setiap naskah membawa petanya sendiri:
 *   tahun="2025" : di bawah ayat Statuta 2025 — alur urusan menurut peta 2025 (langkah dan organ Statuta 2025).
 *   tahun="2026" : di bawah ayat rancangan 2026 — alur urusan menurut peta 2026; aras yang dituangkan ayat ini dibingkai.
 * Kedua pita memakai lima kotak aras yang sama, sehingga perbedaan alur terbaca dengan membandingkan kolom kiri dan kanan.
 * Peta 2025 mencatat dasar pasal per urusan (bukan per aras), sehingga pita 2025 tidak menandai aras tertentu.
 * Warna dan kode organ dibaca dari Cfg_Organ; nama aras dari Cfg_Aksi.
 */
export default function PitaPeta({ daftar, ctx, tahun, onTelaah, onBukaUrusan }) {
  const [buka, setBuka] = useState({});
  if (!daftar || !daftar.length) return null;
  const lama = tahun === '2025';
  return (
    <div className={'pp' + (lama ? ' pp-25' : '')}>
      <div className="pp-j">
        <span className="pp-ikon">P</span>Peta bisnis {tahun}{daftar.length > 1 ? ' — ' + daftar.length + ' urusan' : ''}
        <KepalaMini ctx={ctx} />
      </div>
      {daftar.map(({ u, aras, dasar }) => {
        const baru = himpunanBaru(u.aras, ctx);
        const hLama = himpunanLama(u.lama, ctx);
        const berubah = u.adaDiSumber !== false && ctx.aksi.some((a) => !samaSet(baru[a.kode], hLama[a.kode]));
        const langkah = urutkan(u.lama);
        const terbuka = !!buka[u.id];
        const isi = lama
          ? (k) => { const s = langkah.find((x) => x.aksi === k); return s ? s.organ : null; }
          : (k) => Array.from(baru[k] || [])[0] || null;
        return (
          <div key={u.id}>
            <button type="button" className="pp-ur" onClick={() => setBuka(Object.assign({}, buka, { [u.id]: !terbuka }))}
                    aria-expanded={terbuka} title={'Lihat alur ' + tahun}>
              <span className="pp-nama">{u.urusan}
                <small>{u.id}
                  {lama ? (dasar ? ' · dasar: ' + dasar : '')
                    : (berubah ? <b className="pp-berubah"> · alur berubah dari 2025</b> : (u.adaDiSumber === false ? ' · urusan baru' : ''))}
                </small>
              </span>
              <Mini ctx={ctx} isi={isi} tandai={lama ? null : aras} />
            </button>
            {terbuka ? (lama
              ? <Alur2025 u={u} ctx={ctx} langkah={langkah} onTelaah={onTelaah} onBukaUrusan={onBukaUrusan} />
              : <Alur2026 u={u} ctx={ctx} aras={aras} baru={baru} hLama={hLama} onTelaah={onTelaah} onBukaUrusan={onBukaUrusan} />) : null}
          </div>
        );
      })}
    </div>
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

/** Lima kotak aras berisi kode organ. tandai = aras yang dituangkan ayat ini (hanya peta 2026). */
function Mini({ ctx, isi, tandai }) {
  return (
    <span className="pp-am">
      {ctx.aksi.map((a) => {
        const kode = isi(a.kode);
        const o = kode && ctx.idxKode[kode];
        const ini = tandai && tandai.has(a.kode);
        const label = o ? o.kode : (kode ? String(kode).replace(/^NAMA:/, '').slice(0, 5) : '—');
        return (
          <span key={a.kode} className={(kode ? '' : 'pp-am-kosong') + (ini ? ' pp-am-ini' : '')}
                style={o ? { background: o.warnaLatar, color: o.warnaTeks } : undefined}
                title={(a.nama || a.kode) + ': ' + (o ? o.nama : (kode || 'tidak diatur')) + (ini ? ' — dituangkan ayat ini' : '')}>
            {label}
          </span>
        );
      })}
    </span>
  );
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

function Alur2025({ u, ctx, langkah, onTelaah, onBukaUrusan }) {
  return (
    <div className="pp-alur pp-lama">
      <KepalaAlur ctx={ctx} />
      <div className="pp-brs">
        {ctx.aksi.map((a) => {
          const l = langkah.filter((s) => s.aksi === a.kode);
          return (
            <span key={a.kode} className={'pp-c' + (l.length ? '' : ' pp-kosong')}>
              {l.length ? l.map((s) => <ChipOrgan key={s.kunci} kode={s.organ} ctx={ctx} teks={String(s.nomor)} />) : 'tidak diatur'}
            </span>
          );
        })}
      </div>
      <Kaki u={u} onTelaah={onTelaah} onBukaUrusan={onBukaUrusan}
            teks={'Angka pada kotak = urutan langkah. Dasar pada Statuta 2025: ' + (u.pasal || '—')} />
    </div>
  );
}

function Alur2026({ u, ctx, aras, baru, hLama, onTelaah, onBukaUrusan }) {
  return (
    <div className="pp-alur">
      <KepalaAlur ctx={ctx} />
      <div className="pp-brs">
        {ctx.aksi.map((a) => {
          const x = (u.aras || {})[a.kode] || {};
          const ubah = u.adaDiSumber !== false && !samaSet(baru[a.kode], hLama[a.kode]);
          const ini = aras && aras.has(a.kode);
          return (
            <span key={a.kode} className={'pp-c' + (ubah ? ' pp-ubah' : '') + (ini ? ' pp-ini' : '')}>
              {Array.from(baru[a.kode] || []).map((k) => <ChipOrgan key={k} kode={k} ctx={ctx} />)}
              <span className="pp-unit">{x.unit || '—'}</span>
              <em>{ini ? 'ayat ini' : (x.pasal || '')}</em>
            </span>
          );
        })}
      </div>
      <Kaki u={u} onTelaah={onTelaah} onBukaUrusan={onBukaUrusan}
            teks="Bingkai kuning = berbeda dari peta 2025 (lihat pita di kolom Statuta 2025) · bingkai biru = dituangkan ayat ini." />
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
