import React, { useCallback, useMemo, useRef, useState } from 'react';
import Popover from './Popover';
import Ikon from './Ikon';

function normal(opsi) {
  return (opsi || []).map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
}

/**
 * Pilihan dengan pencarian.
 * - kosong: label untuk pilihan kosong (bila boleh dikosongkan)
 * - bebas: izinkan teks bebas (nilai lama / nama di luar daftar)
 */
export function Pilih({ value, onChange, opsi, placeholder = 'Pilih…', kosong, bebas, disabled, cari = true, className, pemicu, lebar, onTambah, labelTambah = 'orang baru' }) {
  const jangkar = useRef(null);
  const [buka, setBuka] = useState(false);
  const [q, setQ] = useState('');
  const list = useMemo(() => normal(opsi), [opsi]);
  const terpilih = list.find((o) => String(o.value) === String(value === undefined || value === null ? '' : value));
  const s = q.trim().toLowerCase();
  const tersaring = list.filter((o) => !s || [o.label, o.value, o.meta, o.cari].some((x) => String(x || '').toLowerCase().indexOf(s) !== -1));
  const tutup = useCallback(() => { setBuka(false); setQ(''); }, []);
  function pilih(v) { onChange(v); tutup(); }
  const labelTampil = terpilih ? terpilih.label : (value ? String(value) : '');
  return (
    <>
      {pemicu ? (
        <span ref={jangkar} className="pilih-pemicu-kustom" onClick={(e) => { e.stopPropagation(); if (!disabled) setBuka((x) => !x); }}>{pemicu}</span>
      ) : (
        <button type="button" ref={jangkar} className={'pilih ' + (className || '') + (buka ? ' buka' : '')} disabled={disabled}
          onClick={(e) => { e.stopPropagation(); setBuka((x) => !x); }}>
          <span className={labelTampil ? '' : 'samar'}>{labelTampil || placeholder}</span>
          {value && !terpilih && !bebas ? <small className="nilai-lama">nilai lama</small> : null}
          <Ikon n="bawah" s={14} />
        </button>
      )}
      <Popover jangkar={jangkar} buka={buka} onTutup={tutup} lebar={lebar}>
        {(cari && list.length > 6) || bebas ? (
          <div className="pop-cari">
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ketik untuk mencari…"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (tersaring[0]) pilih(tersaring[0].value);
                  else if (bebas && q.trim()) pilih(q.trim());
                }
              }} />
          </div>
        ) : null}
        <div className="pop-daftar">
          {kosong !== undefined ? <button type="button" className={'pop-opsi' + (!value ? ' aktif' : '')} onClick={() => pilih('')}><span className="samar">{kosong}</span></button> : null}
          {tersaring.map((o) => (
            <button type="button" key={String(o.value)} className={'pop-opsi' + (String(o.value) === String(value) ? ' aktif' : '')} disabled={o.disabled} onClick={() => pilih(o.value)}>
              <span>{o.label}</span>{o.meta ? <small>{o.meta}</small> : null}
            </button>
          ))}
          {bebas && q.trim() && !list.some((o) => String(o.label).toLowerCase() === q.trim().toLowerCase()) ? (
            <button type="button" className="pop-opsi" onClick={() => pilih(q.trim())}><span>Gunakan “{q.trim()}”</span><small>di luar daftar</small></button>
          ) : null}
          {!tersaring.length && !(bebas && q.trim()) ? <div className="pop-kosong">Tidak ada yang cocok.</div> : null}
        </div>
        {onTambah ? (
          <button type="button" className="pop-tambah" onClick={() => { const awal = q.trim(); tutup(); onTambah(awal); }}>
            <Ikon n="tambah" s={14} />{q.trim() ? 'Tambah “' + q.trim() + '” sebagai ' + labelTambah : 'Tambah ' + labelTambah}
          </button>
        ) : null}
      </Popover>
    </>
  );
}

/** Pilih banyak (chip). value = array */
export function PilihBanyak({ value, onChange, opsi, placeholder = 'Pilih…', lebar, onTambah, labelTambah = 'pilihan baru' }) {
  const jangkar = useRef(null);
  const [buka, setBuka] = useState(false);
  const [q, setQ] = useState('');
  const list = useMemo(() => normal(opsi), [opsi]);
  const sel = Array.isArray(value) ? value : [];
  const s = q.trim().toLowerCase();
  const tersaring = list.filter((o) => !s || [o.label, o.value, o.meta, o.cari].some((x) => String(x || '').toLowerCase().indexOf(s) !== -1));
  const tutup = useCallback(() => { setBuka(false); setQ(''); }, []);
  const toggle = (v) => onChange(sel.indexOf(v) !== -1 ? sel.filter((x) => x !== v) : sel.concat(v));
  const label = (v) => { const o = list.find((x) => x.value === v); return o ? o.label : v; };
  return (
    <div className="pilih-banyak">
      <div ref={jangkar} className={'pilih pilih-chip' + (buka ? ' buka' : '')} role="button" tabIndex={0} onClick={() => setBuka((x) => !x)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setBuka((x) => !x); } }}>
        {sel.length ? sel.map((v) => (
          <span className="chip" key={v}>{label(v)}<button type="button" aria-label="Hapus" onClick={(e) => { e.stopPropagation(); toggle(v); }}><Ikon n="tutup" s={11} /></button></span>
        )) : <span className="samar">{placeholder}</span>}
        <Ikon n="bawah" s={14} />
      </div>
      <Popover jangkar={jangkar} buka={buka} onTutup={tutup} lebar={lebar || 360}>
        <div className="pop-cari"><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ketik untuk mencari…" /></div>
        <div className="pop-daftar">
          {tersaring.map((o) => {
            const aktif = sel.indexOf(o.value) !== -1;
            return (
              <label key={String(o.value)} className={'pop-opsi cek' + (aktif ? ' aktif' : '')}>
                <input type="checkbox" checked={aktif} onChange={() => toggle(o.value)} />
                <span>{o.label}{o.meta ? <small>{o.meta}</small> : null}</span>
              </label>
            );
          })}
          {!tersaring.length ? <div className="pop-kosong">Tidak ada yang cocok.</div> : null}
        </div>
        {onTambah ? (
          <button type="button" className="pop-tambah" onClick={() => { const awal = q.trim(); tutup(); onTambah(awal); }}>
            <Ikon n="tambah" s={14} />{q.trim() ? 'Tambah “' + q.trim() + '” sebagai ' + labelTambah : 'Tambah ' + labelTambah}
          </button>
        ) : null}
      </Popover>
    </div>
  );
}

/** Menu ⋯ untuk tindakan yang jarang dipakai. items: [{label, onClick, bahaya, hilang}] */
export function MenuTitik({ items, label = 'Tindakan lain', ikon = 'titik', teks }) {
  const jangkar = useRef(null);
  const [buka, setBuka] = useState(false);
  const tutup = useCallback(() => setBuka(false), []);
  const daftar = (items || []).filter((x) => x && !x.hilang);
  if (!daftar.length) return null;
  return (
    <>
      <button type="button" ref={jangkar} className={'tombol-ikon' + (teks ? ' dengan-teks' : '')} aria-label={label} title={label} onClick={(e) => { e.stopPropagation(); setBuka((x) => !x); }}>
        <Ikon n={ikon} s={18} />{teks ? <span>{teks}</span> : null}
      </button>
      <Popover jangkar={jangkar} buka={buka} onTutup={tutup} lebar={220} rata="kanan" className="menu-titik">
        <div className="pop-daftar">
          {daftar.map((it, i) => it.garis ? <div key={i} className="pop-garis" /> : (
            <button type="button" key={i} className={'pop-opsi' + (it.bahaya ? ' bahaya' : '')} disabled={it.disabled}
              onClick={() => { tutup(); it.onClick(); }}>
              <span>{it.label}</span>
            </button>
          ))}
        </div>
      </Popover>
    </>
  );
}
