import React, { useState } from 'react';
import TeksBeda from './TeksBeda';
import { simpanRedaksi, batalRedaksi, terapkanRedaksi } from '../naskah';
import { cekStrukturRedaksi } from '../utils/telaah';
import { STORAGE_KEY } from '../config';

/**
 * Usulan redaksi satu ayat rancangan 2026 (v5.1).
 *
 * Google Doc tetap naskah induk; web hanya lapis usulan. Mode rapat menampilkan usulan yang masih
 * terbuka (semula → menjadi, beserta alasannya). Mode kerja menambah: menulis/mengubah usulan,
 * membatalkan, dan "Terapkan ke Doc". Penerapan hanya untuk penggantian kata di dalam baris yang sama
 * dan tidak untuk ayat yang terkunci catatan asesor Monev; backend memeriksa ulang seluruh syarat itu.
 */
export default function KotakRedaksi({ ayat, redaksi, kerja, monev, onGalat }) {
  const aktif = redaksi ? redaksi.aktif : null;
  const diterapkan = redaksi ? redaksi.diterapkan : [];
  const [sunting, setSunting] = useState(false);
  const [yakin, setYakin] = useState(false);
  const [sibuk, setSibuk] = useState('');
  const [pesan, setPesan] = useState('');
  const terkunci = monev && monev.length > 0;

  const jalankan = async (jenis, fn) => {
    setSibuk(jenis); setPesan('');
    try { await fn(); setYakin(false); }
    catch (e) { const m = (e && e.message) || String(e); setPesan(m); if (onGalat) onGalat(m); }
    finally { setSibuk(''); }
  };

  if (sunting && kerja) {
    return <EditorRedaksi ayat={ayat} aktif={aktif} terkunci={terkunci} onTutup={() => setSunting(false)} onGalat={onGalat} />;
  }

  const struktur = aktif ? cekStrukturRedaksi(aktif.lama, aktif.baru) : '';
  const basi = aktif && String(aktif.lama).trim() !== String(ayat.teks).trim();
  const alasanTolak = terkunci ? 'Ayat terkunci catatan asesor Monev: usulan dibahas, perubahan dikerjakan langsung di Google Doc.'
    : struktur || (basi ? 'Bunyi ayat sudah berubah sejak usulan dibuat; ubah usulan lebih dulu.' : '');

  return (
    <>
      {aktif ? (
        <div className="kotak-tanda kotak-redaksi">
          <b>Usulan redaksi</b>
          <div className="rd-baris"><span className="rd-lbl">Semula</span><TeksBeda kiri={aktif.lama} kanan={aktif.baru} sisi="kiri" /></div>
          <div className="rd-baris"><span className="rd-lbl">Menjadi</span><TeksBeda kiri={aktif.lama} kanan={aktif.baru} sisi="kanan" /></div>
          <div className="rd-alasan"><span className="rd-lbl">Alasan</span>{aktif.alasan}</div>
          {kerja ? (
            <div className="rd-kaki">
              <span className="kecil">Diusulkan {aktif.tgl}{aktif.oleh ? ' oleh ' + aktif.oleh : ''}</span>
              {!yakin ? (
                <>
                  <button type="button" className="tbl tbl-ringan" onClick={() => setSunting(true)} disabled={!!sibuk}>Ubah</button>
                  <button type="button" className="tbl tbl-ringan" disabled={!!sibuk}
                          onClick={() => jalankan('batal', () => batalRedaksi(aktif, oleh()))}>{sibuk === 'batal' ? 'Membatalkan…' : 'Batalkan usulan'}</button>
                  <button type="button" className="tbl" disabled={!!sibuk || !!alasanTolak} title={alasanTolak || 'Ganti bunyi ayat ini di Google Doc'}
                          onClick={() => setYakin(true)}>Terapkan ke Doc</button>
                </>
              ) : (
                <>
                  <span className="rd-yakin">Bunyi ayat di Google Doc akan diganti sesuai usulan. Lanjutkan?</span>
                  <button type="button" className="tbl" disabled={!!sibuk}
                          onClick={() => jalankan('terap', () => terapkanRedaksi(aktif, oleh()))}>{sibuk === 'terap' ? 'Menerapkan…' : 'Ya, terapkan'}</button>
                  <button type="button" className="tbl tbl-ringan" disabled={!!sibuk} onClick={() => setYakin(false)}>Batal</button>
                </>
              )}
              {alasanTolak ? <span className="rd-tolak">{alasanTolak}</span> : null}
              {pesan ? <span className="jj-pesan">{pesan}</span> : null}
            </div>
          ) : null}
        </div>
      ) : null}
      {kerja && !aktif ? (
        <div className="rd-aksi">
          <button type="button" className="tautan" onClick={() => setSunting(true)}>✎ Usulkan redaksi</button>
          {diterapkan.length ? (
            <span className="kecil redup"> · redaksi terakhir diterapkan dari web {diterapkan[diterapkan.length - 1].diterapkan}: {diterapkan[diterapkan.length - 1].alasan}</span>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function oleh() {
  try { return window.localStorage.getItem(STORAGE_KEY.OLEH) || ''; } catch (e) { return ''; }
}

function EditorRedaksi({ ayat, aktif, terkunci, onTutup, onGalat }) {
  const [bunyi, setBunyi] = useState(aktif ? aktif.baru : ayat.teks);
  const [alasan, setAlasan] = useState(aktif ? aktif.alasan : '');
  const [nama, setNama] = useState(oleh);
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState('');
  const struktur = cekStrukturRedaksi(ayat.teks, bunyi);
  const sama = bunyi.trim() === String(ayat.teks).trim();

  const simpan = async () => {
    if (sama) { setPesan('Usulan masih sama dengan bunyi sekarang.'); return; }
    if (!alasan.trim()) { setPesan('Alasan wajib diisi.'); return; }
    try { window.localStorage.setItem(STORAGE_KEY.OLEH, nama); } catch (e) { /* abaikan */ }
    setSibuk(true); setPesan('');
    try {
      await simpanRedaksi({ id26: ayat.id, lama: ayat.teks, baru: bunyi, alasan, oleh: nama });
      onTutup();
    } catch (e) {
      const m = (e && e.message) || String(e);
      setPesan(m); if (onGalat) onGalat(m);
    } finally { setSibuk(false); }
  };

  return (
    <div className="rd-editor" role="group" aria-label="Usulan redaksi">
      <div className="blok-label">USULAN REDAKSI</div>
      <textarea className="inp rd-teks" rows={Math.min(14, String(bunyi).split('\n').length + 2)} value={bunyi}
                onChange={(e) => setBunyi(e.target.value)} aria-label="Bunyi usulan" />
      <div className="kecil redup">Ubah kata di dalam baris. Menambah, menghapus, atau memindah ayat dan rincian dikerjakan langsung di Google Doc.</div>
      {struktur ? <div className="rd-tolak">{struktur} Usulan tetap dapat disimpan untuk dibahas, tetapi tidak dapat diterapkan dari web.</div> : null}
      {terkunci ? <div className="rd-tolak">Ayat terkunci catatan asesor Monev: usulan dapat disimpan untuk dibahas, tetapi tidak dapat diterapkan dari web.</div> : null}
      {!sama ? (
        <div className="rd-pratinjau"><span className="rd-lbl">Pratinjau</span><TeksBeda kiri={ayat.teks} kanan={bunyi} sisi="kanan" /></div>
      ) : null}
      <label className="jj-medan jj-lebar">
        <span>Alasan (wajib)</span>
        <textarea className="inp" rows={2} value={alasan} onChange={(e) => setAlasan(e.target.value)}
                  placeholder="Mengapa bunyi ayat perlu diubah" />
      </label>
      <label className="jj-medan">
        <span>Oleh</span>
        <input className="inp" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama atau forum" />
      </label>
      <div className="jj-kaki">
        {pesan ? <span className="jj-pesan">{pesan}</span> : null}
        <button type="button" className="tbl tbl-ringan" onClick={onTutup} disabled={sibuk}>Batal</button>
        <button type="button" className="tbl" onClick={simpan} disabled={sibuk}>{sibuk ? 'Menyimpan…' : 'Simpan usulan'}</button>
      </div>
    </div>
  );
}
