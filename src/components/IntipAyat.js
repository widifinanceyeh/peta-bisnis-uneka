import React, { useEffect, useMemo, useState } from 'react';
import { LembarSamping } from './Modal';
import { langganNaskah, ambilNaskah, muatInitNaskah, muatPasal } from '../naskah';
import { ambilKeadaan } from '../awal';
import { uraiRujukan, labelAyatLama, tautkan } from '../utils/rujukan';
import TeksBeda from './TeksBeda';
import { navigasi } from '../navigasi';

/**
 * Lembar intip: bunyi ayat rancangan 2026 yang dirujuk, pasangannya pada Statuta 2025,
 * dasar perubahan dari naskah, dan urusan lain yang merujuk ayat yang sama.
 * Dibuka dari tombol rujukan pada kolom "Letak di naskah" editor urusan.
 */
export default function IntipAyat({ rujukan, idUrusan, onTutup }) {
  const [n, setN] = useState(ambilNaskah);
  const [galat, setGalat] = useState('');
  useEffect(() => langganNaskah(setN), []);

  const pasal = rujukan.pasal;
  useEffect(() => {
    let hidup = true;
    muatInitNaskah().then(() => muatPasal(pasal)).catch((e) => { if (hidup) setGalat((e && e.message) || String(e)); });
    return () => { hidup = false; };
  }, [pasal]);

  const data = n.pasal[pasal];
  const init = n.init;
  const cfg = (init && init.cfg) || {};
  const warna = useMemo(() => {
    const o = {};
    (cfg.status || []).forEach((s) => { o[String(s.nilai).toUpperCase()] = s.warna; });
    return o;
  }, [cfg.status]);

  const tautan = init ? tautkan(rujukan, init.indeks26) : { id: [], hilang: [] };
  const ayat = data ? data.ayat26.filter((a) => tautan.id.indexOf(a.id) !== -1) : [];

  // Urusan lain yang merujuk ayat yang sama (dibaca dari data peta yang sudah ada di layar).
  const lain = useMemo(() => {
    const urusan = ambilKeadaan().urusan || [];
    const target = new Set(tautan.id);
    const out = [];
    urusan.forEach((u) => {
      if (String(u.id) === String(idUrusan) || !u.aras) return;
      const aras = [];
      Object.keys(u.aras).forEach((k) => {
        uraiRujukan((u.aras[k] || {}).pasal).forEach((r) => {
          if (r.jenis !== 'ref' || r.pasal !== pasal || !init) return;
          const t = tautkan(r, init.indeks26);
          if (t.id.some((id) => target.has(id)) && aras.indexOf(k) === -1) aras.push(k);
        });
      });
      if (aras.length) out.push({ id: u.id, urusan: u.urusan, aras });
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tautan.id.join('|'), idUrusan, pasal, init]);

  const barisPerubahan = useMemo(() => {
    if (!data) return [];
    const semua = String(data.catatan.perubahan || '').split('\n').map((s) => s.trim()).filter(Boolean);
    const nomor = (rujukan.ayat || []);
    if (!nomor.length) return semua;
    const cocok = semua.filter((b) => nomor.some((x) => new RegExp('(ayat|angka)\\s*\\(?' + x + '\\)?(?!\\d)', 'i').test(b)));
    return cocok.length ? cocok : semua;
  }, [data, rujukan.ayat]);

  const judul = 'Pasal ' + pasal + (rujukan.ayat && rujukan.ayat.length ? ' ayat (' + rujukan.ayat.join('), (') + ')' : '') +
    (rujukan.huruf ? ' huruf ' + rujukan.huruf : '');
  const sub = data ? [data.bab, data.judul].filter(Boolean).join(' · ') : '';

  const buka = () => {
    onTutup();
    if (navigasi.bukaNaskah) navigasi.bukaNaskah(pasal);
  };

  return (
    <LembarSamping
      judul={judul}
      sub={sub}
      onTutup={onTutup}
      kaki={(
        <>
          <button type="button" className="tbl tbl-ringan" onClick={onTutup}>Tutup</button>
          <button type="button" className="tbl tbl-utama" onClick={buka} disabled={!navigasi.bukaNaskah}>
            Buka Pasal {pasal} di Naskah
          </button>
        </>
      )}
    >
      {galat ? <div className="galat-kotak">{galat}</div> : null}
      {!data && !galat ? <div className="intip-muat">Membaca naskah…</div> : null}
      {data && tautan.hilang.length ? (
        <div className="galat-kotak">
          Ayat ({tautan.hilang.join('), (')}) tidak ada pada Pasal {pasal} naskah {cfg.labelBaru || '2026'}.
        </div>
      ) : null}
      {data ? ayat.map((a) => {
        const pasangan = data.jejak.filter((j) => j.id26 === a.id && j.id25);
        const tunggal = pasangan.length === 1 ? cariAyatLama(data, pasangan[0].id25) : null;
        return (
          <div className="intip-ayat" key={a.id}>
            <div className="blok-label">{(cfg.labelBaru || 'RANCANGAN 2026')}{a.nomor ? ' · AYAT (' + a.nomor + ')' : ''}</div>
            <div className="teks-baru">
              {tunggal ? <TeksBeda kiri={tunggal.teks} kanan={a.teks} sisi="kanan" /> : <TeksNaskah teks={a.teks} />}
            </div>
            {pasangan.length ? pasangan.map((j) => {
              const lama = cariAyatLama(data, j.id25);
              return (
                <div className="intip-lama" key={j.id}>
                  <div className="blok-label">
                    {(cfg.labelLama || 'STATUTA 2025')} · {lama ? labelAyatLama(lama.pasal, lama.nomor).toUpperCase() : j.id25}
                    <span className="chip-status" style={{ background: warna[String(j.status).toUpperCase()] || undefined }}>{j.status || '—'}</span>
                    {!j.dikonfirmasi ? <span className="tanda-usulan">usulan</span> : null}
                  </div>
                  <div className="teks-lama">
                    {lama ? <TeksBeda kiri={lama.teks} kanan={a.teks} sisi="kiri" /> : <span className="redup">Teks tidak tersedia.</span>}
                  </div>
                </div>
              );
            }) : (
              <div className="intip-lama">
                <div className="blok-label">{(cfg.labelLama || 'STATUTA 2025')}</div>
                <div className="redup">Tidak ada padanan pada Statuta 2025.</div>
              </div>
            )}
          </div>
        );
      }) : null}
      {data && barisPerubahan.length ? (
        <div className="intip-blok">
          <div className="blok-label">DASAR PERUBAHAN (DARI NASKAH)</div>
          <ul className="daftar-rapat">{barisPerubahan.map((b, i) => <li key={i}>{b}</li>)}</ul>
        </div>
      ) : null}
      {data && lain.length ? (
        <div className="intip-blok">
          <div className="blok-label">URUSAN LAIN YANG MERUJUK AYAT INI</div>
          <div className="chip-baris">
            {lain.map((u) => (
              <button type="button" key={u.id} className="chip-urusan"
                      onClick={() => { onTutup(); if (navigasi.bukaUrusan) navigasi.bukaUrusan(u.id); }}
                      title={u.urusan}>
                {u.id} {u.urusan}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </LembarSamping>
  );
}

function cariAyatLama(data, id) {
  const a = data.ayat25.find((x) => x.id === id);
  if (a) return Object.assign({ pasal: data.pasal }, a);
  const l = data.luar && data.luar[id];
  return l ? Object.assign({ id }, l) : null;
}

export function TeksNaskah({ teks }) {
  return <span className="teks-pre">{String(teks || '')}</span>;
}
