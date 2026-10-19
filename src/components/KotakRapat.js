import React, { useState } from 'react';
import { simpanCatatanRapat } from '../naskah';
import { STORAGE_KEY } from '../config';

/**
 * v5.17: catatan rapat untuk satu ayat rancangan 2026 (tab 14-CATATAN-RAPAT).
 * Catatan bebas tanpa mengubah bunyi ayat; tampil terpisah dari Dasar perubahan agar selisih teks tetap bersih.
 * Tombol tindakan hanya muncul saat kursor di atas catatan (pada layar sentuh selalu tampil, tetapi redup).
 * v5.24: tidak lagi dibuka dari menu "⋯". Daftar catatan dan tombol "+ catatan rapat" tampil langsung di bawah
 * bunyi ayat, sehingga mencatat cukup satu klik. Ayat yang belum punya catatan hanya menampilkan tombolnya.
 */
export default function KotakRapat({ ayat, daftar, onGalat }) {
  const [edit, setEdit] = useState(null);            // null | {id?, teks}
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState('');

  const list = (daftar || []).filter((c) => c.status !== 'DIBATALKAN')
    .sort((a, b) => String(a.dibuat).localeCompare(String(b.dibuat)));

  const kirim = async (muatan) => {
    setSibuk(true); setPesan('');
    try { await simpanCatatanRapat(Object.assign({ oleh: oleh() }, muatan)); return true; }
    catch (e) { const m = (e && e.message) || String(e); setPesan(m); if (onGalat) onGalat(m); return false; }
    finally { setSibuk(false); }
  };
  const simpan = async () => {
    const teks = String(edit.teks || '').trim();
    if (!teks) { setPesan('Catatan masih kosong.'); return; }
    const ok = await kirim(edit.id ? { idCatatan: edit.id, teks } : { id26: ayat.id, teks });
    if (ok) setEdit(null);
  };

  const tambah = (
    <button type="button" className="cr-tambah" onClick={() => { setEdit({ teks: '' }); setPesan(''); }}
            title="Tulis catatan rapat untuk ayat ini">+ catatan{list.length ? '' : ' rapat'}</button>
  );
  if (!list.length && !edit) return <div className="cr-kosong">{tambah}</div>;
  return (
    <div className="kotak-tanda kotak-rapat">
      <b>Catatan rapat</b>
      {list.map((c) => (edit && edit.id === c.id ? null : (
        <div key={c.id} className={'cr-butir' + (c.status === 'SELESAI' ? ' cr-selesai' : '')}>
          <div className="cr-teks">{c.teks}</div>
          <div className="cr-meta">
            <span className={'cr-st cr-st-' + (c.status === 'SELESAI' ? 'selesai' : 'buka')}>{c.status === 'SELESAI' ? 'Selesai' : 'Terbuka'}</span>
            <span>{[c.oleh, String(c.diubah || c.dibuat).slice(0, 16)].filter(Boolean).join(' · ')}</span>
            <span className="cr-aksi">
              <button type="button" className="tautan" disabled={sibuk}
                      onClick={() => kirim({ idCatatan: c.id, status: c.status === 'SELESAI' ? 'TERBUKA' : 'SELESAI' })}>
                {c.status === 'SELESAI' ? 'Buka lagi' : 'Tandai selesai'}
              </button>
              <button type="button" className="tautan" disabled={sibuk} onClick={() => { setEdit({ id: c.id, teks: c.teks }); setPesan(''); }}>Ubah</button>
              <button type="button" className="tautan cr-hapus" disabled={sibuk} onClick={() => kirim({ idCatatan: c.id, status: 'DIBATALKAN' })}>Hapus</button>
            </span>
          </div>
        </div>
      )))}
      {edit ? (
        <div className="cr-editor">
          <textarea className="inp" rows={3} autoFocus value={edit.teks} placeholder="Tulis catatan rapat untuk ayat ini"
                    onChange={(e) => setEdit(Object.assign({}, edit, { teks: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) simpan(); if (e.key === 'Escape') { e.stopPropagation(); setEdit(null); } }} />
          <div className="cr-kaki">
            <span className="kecil redup">Ctrl+Enter untuk menyimpan</span>
            <button type="button" className="tbl tbl-ringan" onClick={() => setEdit(null)} disabled={sibuk}>Batal</button>
            <button type="button" className="tbl" onClick={simpan} disabled={sibuk}>{sibuk ? 'Menyimpan…' : 'Simpan catatan'}</button>
          </div>
        </div>
      ) : null}
      {!edit ? tambah : null}
      {pesan ? <div className="jj-pesan">{pesan}</div> : null}
    </div>
  );
}

function oleh() {
  try { return window.localStorage.getItem(STORAGE_KEY.OLEH) || ''; } catch (e) { return ''; }
}
