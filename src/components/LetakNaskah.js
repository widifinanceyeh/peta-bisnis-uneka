import React, { useEffect, useMemo, useRef, useState } from 'react';
import { langganNaskah, ambilNaskah, muatInitNaskah, muatPasal } from '../naskah';
import { uraiRujukan, labelRujukan, tautkan, labelAyatLama } from '../utils/rujukan';
import IntipAyat from './IntipAyat';

/**
 * Kolom "Letak di naskah" pada formulir aras (v4.9).
 *
 * Baris 1: rujukan rancangan 2026 menjadi tombol hidup; keterangan lain tampil biasa.
 * Baris 2: letak padanannya pada Statuta 2025 menurut tab Jejak Ayat, beserta statusnya.
 * Ikon ✎ membuka teks rujukan asli untuk disunting (bila Cfg_App mengizinkan).
 *
 * Bila modul naskah belum terpasang di backend, kolom ini kembali menjadi isian teks biasa.
 */
export default function LetakNaskah({ nilai, boleh, onUbah, idUrusan }) {
  const [n, setN] = useState(ambilNaskah);
  const [sunting, setSunting] = useState(false);
  const [intip, setIntip] = useState(null);
  const [tanpaModul, setTanpaModul] = useState(false);
  const areaRef = useRef(null);
  useEffect(() => langganNaskah(setN), []);

  const potong = useMemo(() => uraiRujukan(nilai), [nilai]);
  const refs = potong.filter((p) => p.jenis === 'ref');
  const pasalDirujuk = useMemo(() => Array.from(new Set(refs.map((r) => r.pasal))), [refs.map((r) => r.pasal).join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!pasalDirujuk.length) return;
    let hidup = true;
    muatInitNaskah()
      .then((init) => {
        if (!init || init.siap === false) { if (hidup) setTanpaModul(true); return; }
        pasalDirujuk.forEach((p) => { muatPasal(p).catch(() => {}); });
      })
      .catch(() => { if (hidup) setTanpaModul(true); });
    return () => { hidup = false; };
  }, [pasalDirujuk]);

  useEffect(() => { if (sunting && areaRef.current) areaRef.current.focus(); }, [sunting]);

  if (tanpaModul || sunting) {
    return (
      <div className="letak letak-sunting">
        <textarea ref={areaRef} className="inp fa-unit fa-pasal" rows={2} value={nilai || ''} readOnly={!boleh}
                  placeholder="mis. Pasal 54 ayat (6)"
                  onChange={(e) => onUbah(e.target.value)}
                  onBlur={() => { if (!tanpaModul) setSunting(false); }} />
      </div>
    );
  }

  const init = n.init;
  const usulan = String(nilai || '').indexOf('[USULAN]') !== -1;

  return (
    <div className={'letak' + (usulan ? ' letak-usulan' : '')}>
      {boleh ? (
        <button type="button" className="letak-pena" onClick={() => setSunting(true)} title="Sunting teks rujukan" aria-label="Sunting teks rujukan">✎</button>
      ) : null}
      <div className="letak-26">
        {potong.length ? potong.map((p, i) => {
          if (p.jenis === 'teks') {
            return <span key={i} className={p.teks === '[USULAN]' ? 'letak-tanda-usulan' : (refs.length ? 'letak-tamb' : 'letak-polos')}>{p.teks === '[USULAN]' ? 'usulan' : p.teks}</span>;
          }
          const t = init ? tautkan(p, init.indeks26) : null;
          const patah = t && !t.ada;
          return (
            <button type="button" key={i} className={'ref' + (patah ? ' ref-patah' : '')}
                    onClick={() => setIntip(p)}
                    title={patah ? 'Tidak ada di naskah: ' + p.teks : 'Intip ' + p.teks}>
              {labelRujukan(p)}
            </button>
          );
        }) : <span className="letak-polos">—</span>}
      </div>
      {refs.length && init ? <BarisLama refs={refs} init={init} pasal={n.pasal} /> : null}
      {intip ? <IntipAyat rujukan={intip} idUrusan={idUrusan} onTutup={() => setIntip(null)} /> : null}
    </div>
  );
}

function BarisLama({ refs, init, pasal }) {
  const cfg = init.cfg || {};
  const warna = {};
  (cfg.status || []).forEach((s) => { warna[String(s.nilai).toUpperCase()] = s.warna; });
  const butir = [];
  const sudah = {};
  let menunggu = false;
  refs.forEach((r) => {
    if (!r.ayat || !r.ayat.length) return;           // rujukan seluruh pasal tidak dipasangkan per ayat
    const data = pasal[r.pasal];
    if (!data) { menunggu = true; return; }
    const t = tautkan(r, init.indeks26);
    t.id.forEach((id) => {
      const rows = data.jejak.filter((j) => j.id26 === id);
      if (!rows.length) return;
      rows.forEach((j) => {
        if (sudah[j.id]) return;
        sudah[j.id] = true;
        const lama = j.id25 ? (data.ayat25.find((a) => a.id === j.id25) || (data.luar && data.luar[j.id25] ? Object.assign({ pasal: data.luar[j.id25].pasal }, data.luar[j.id25]) : null)) : null;
        butir.push({
          kunci: j.id,
          label: j.id25 ? (lama ? labelAyatLama(lama.pasal || r.pasal, lama.nomor) : j.id25) : 'tidak ada padanan',
          status: j.status, usulan: !j.dikonfirmasi
        });
      });
    });
  });
  if (!butir.length && !menunggu) return null;
  return (
    <div className="letak-25">
      <span className="tag25">{String(cfg.labelLama || '2025').replace(/^STATUTA\s+/i, '')}</span>
      {menunggu && !butir.length ? <span className="redup">membaca…</span> : null}
      {butir.map((b) => (
        <span key={b.kunci} className="letak-25-butir">
          <span className="ref25">{b.label}</span>
          {b.status ? <span className="chip-status" style={{ background: warna[String(b.status).toUpperCase()] || undefined }}>{b.status}</span> : null}
          {b.usulan ? <span className="tanda-usulan">usulan</span> : null}
        </span>
      ))}
    </div>
  );
}
