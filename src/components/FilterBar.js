import React, { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Opsi filter dibangun dari data aktual, bukan dari daftar tetap.
 * Versi 4 (format ARAS): penyaring Status bahasan, Penuangan, dan
 * Kelengkapan. Opsi status dan penuangan mengikuti urutan data validation
 * sheet (`pilihan`), ditambah nilai lama yang tidak lagi ada di daftar.
 *
 * Versi 5.22: satu baris. Cari dan Kelompok tetap di luar; penyaring lain di panel "Saring",
 * pilihan tampilan (Blok 2025, Pasal 2026, Ringkas) dan keterangan kode di panel "Tampilan".
 * Di layar sempit kedua panel terbuka selebar layar dari bawah.
 */
function daftarNilai(urusan, medan) {
  const s = new Set();
  urusan.forEach((u) => { const v = String(u[medan] || '').trim(); if (v) s.add(v); });
  return Array.from(s).sort();
}

function gabungPilihan(acuan, dariData) {
  const out = (acuan || []).slice();
  dariData.forEach((v) => { if (out.indexOf(v) === -1) out.push(v); });
  return out;
}

/** Kunci penyaring yang ada di panel Saring (untuk angka pada tombol). */
export const KUNCI_PANEL = ['jenis', 'muatan', 'statusBahasan', 'penuangan', 'lengkap', 'status', 'perubahan', 'monev'];

/** Panel lipat: menutup dengan klik di luar, Esc, atau tombol Selesai. */
function Panel({ label, angka, buka, setBuka, judul, children, kaki }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!buka) return undefined;
    const luar = (e) => { if (ref.current && !ref.current.contains(e.target)) setBuka(false); };
    const esc = (e) => { if (e.key === 'Escape') setBuka(false); };
    document.addEventListener('mousedown', luar);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', luar); document.removeEventListener('keydown', esc); };
  }, [buka, setBuka]);
  return (
    <div className="fb-panel-wadah" ref={ref}>
      <button type="button" className={'tbl tbl-ringan fb-pemicu' + (buka ? ' aktif' : '') + (angka ? ' ada' : '')}
              aria-expanded={buka} onClick={() => setBuka(!buka)}>
        {label}{angka ? <span className="fb-angka">{angka}</span> : null}
        <span className="fb-segitiga" aria-hidden="true">▾</span>
      </button>
      {buka ? (
        <>
          <div className="fb-tirai" onClick={() => setBuka(false)} aria-hidden="true" />
          <div className="fb-panel" role="dialog" aria-label={judul}>
            <div className="fb-panel-judul">{judul}</div>
            <div className="fb-panel-isi">{children}</div>
            <div className="fb-panel-kaki">
              {kaki}
              <button type="button" className="tbl" onClick={() => setBuka(false)}>Selesai</button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function Medan({ label, children }) {
  return <label className="fb-medan"><span>{label}</span>{children}</label>;
}

export default function FilterBar({
  urusan, filter, setFilter, jumlahHasil, jumlahTotal, ringkas, setRingkas, onReset,
  formatAras, pilihan, tampilLama, setTampilLama, adaPasal, tampilPasal, setTampilPasal, kelompok, keterangan
}) {
  const [panel, setPanel] = useState('');
  const bukaSaring = panel === 'saring';
  const bukaTampil = panel === 'tampil';

  const berkelompok = (kelompok || []).length > 0;
  const adaTetap = useMemo(() => urusan.some((u) => String(u.jenisBaris || '').toUpperCase() === 'MUATAN TETAP'), [urusan]);
  const daftarBidang = useMemo(() => daftarNilai(urusan, 'bidang'), [urusan]);
  const daftarStatus = useMemo(() => daftarNilai(urusan, 'status'), [urusan]);
  const daftarMuatan = useMemo(() => daftarNilai(urusan, 'muatan'), [urusan]);
  const daftarBahasan = useMemo(
    () => gabungPilihan(pilihan && pilihan.STATUS, daftarNilai(urusan, 'statusBahasan')),
    [urusan, pilihan]
  );
  const daftarTuang = useMemo(
    () => gabungPilihan(pilihan && pilihan.PENUANGAN, daftarNilai(urusan, 'penuangan')),
    [urusan, pilihan]
  );

  const adaTambahan = useMemo(() => urusan.some((u) => u.adaDiSumber === false), [urusan]);
  const adaHanya2025 = useMemo(
    () => urusan.some((u) => u.adaDiSumber !== false && u.adaDiRancangan === false),
    [urusan]
  );
  const adaMonev = useMemo(() => urusan.some((u) => String(u.monev || '').trim()), [urusan]);

  const ubah = (k, v) => setFilter(Object.assign({}, filter, { [k]: v }));
  const disaring = jumlahHasil !== jumlahTotal;
  const angkaSaring = KUNCI_PANEL.filter((k) => String(filter[k] || '').trim()).length;
  const setBuka = (nama) => (b) => setPanel(b ? nama : '');

  return (
    <div className="filterbar">
      <input className="inp cari" type="search" placeholder="Cari urusan, organ, unit…"
             value={filter.cari} onChange={(e) => ubah('cari', e.target.value)} />

      {berkelompok ? (
        <select className="inp fb-kelompok" value={filter.kelompok || ''} onChange={(e) => ubah('kelompok', e.target.value)}
                title="Kelompok urusan menurut Permenristekdikti 16/2018">
          <option value="">Semua kelompok</option>
          {kelompok.map((k) => (
            <option key={k.kode} value={k.kode}>{(k.tingkat === 2 ? '   ' : '') + k.kode + '. ' + k.judul}</option>
          ))}
        </select>
      ) : (
        <select className="inp fb-kelompok" value={filter.bidang} onChange={(e) => ubah('bidang', e.target.value)}>
          <option value="">Semua bidang</option>
          {daftarBidang.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      )}

      <Panel label="Saring" angka={angkaSaring} buka={bukaSaring} setBuka={setBuka('saring')} judul="Saring urusan"
             kaki={<button type="button" className="tbl tbl-ringan" onClick={onReset}>Reset semua</button>}>
        <div className="fb-kisi">
          {adaTetap ? (
            <Medan label="Jenis">
              <select className="inp" value={filter.jenis || ''} onChange={(e) => ubah('jenis', e.target.value)}>
                <option value="">Semua jenis</option>
                <option value="ALUR">Alur kewenangan</option>
                <option value="TETAP">Muatan tetap</option>
              </select>
            </Medan>
          ) : null}

          {daftarMuatan.length ? (
            <Medan label="Sumber muatan">
              <select className="inp" value={filter.muatan} onChange={(e) => ubah('muatan', e.target.value)}>
                <option value="">Semua sumber muatan</option>
                {daftarMuatan.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </Medan>
          ) : null}

          {formatAras && daftarBahasan.length ? (
            <Medan label="Status bahasan">
              <select className="inp" value={filter.statusBahasan || ''} onChange={(e) => ubah('statusBahasan', e.target.value)}>
                <option value="">Semua status bahasan</option>
                {daftarBahasan.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Medan>
          ) : null}

          {formatAras && daftarTuang.length ? (
            <Medan label="Penuangan ke Statuta">
              <select className="inp" value={filter.penuangan || ''} onChange={(e) => ubah('penuangan', e.target.value)}>
                <option value="">Semua penuangan</option>
                {daftarTuang.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Medan>
          ) : null}

          {formatAras ? (
            <Medan label="Kelengkapan lima aras">
              <select className="inp" value={filter.lengkap || ''} onChange={(e) => ubah('lengkap', e.target.value)}>
                <option value="">Semua kelengkapan</option>
                <option value="YA">Lima aras lengkap</option>
                <option value="TIDAK">Ada aras kosong</option>
              </select>
            </Medan>
          ) : null}

          <Medan label="Keadaan">
            <select className="inp" value={filter.perubahan} onChange={(e) => ubah('perubahan', e.target.value)}>
              <option value="">Semua keadaan</option>
              <option value="BERUBAH">Berbeda dari 2025</option>
              <option value="SAMA">Sama dengan 2025</option>
              <option value="BELUM">Belum ada rancangan</option>
              {adaTambahan ? <option value="TAMBAHAN">Urusan tambahan</option> : null}
              {adaHanya2025 ? <option value="2025">2025 saja / tidak diteruskan</option> : null}
            </select>
          </Medan>

          {!formatAras || tampilLama ? (
            <Medan label={formatAras ? 'Status pada Statuta 2025' : 'Status'}>
              <select className="inp" value={filter.status} onChange={(e) => ubah('status', e.target.value)}>
                <option value="">{formatAras ? 'Semua status 2025' : 'Semua status'}</option>
                {daftarStatus.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Medan>
          ) : null}

          {adaMonev ? (
            <label className="saklar fb-saklar" title="Hanya urusan yang penomoran pasalnya dikunci Berita Acara Monev">
              <input type="checkbox" checked={!!filter.monev} onChange={(e) => ubah('monev', e.target.checked ? '1' : '')} />
              <span>Hanya yang terkunci Monev</span>
            </label>
          ) : null}
        </div>
      </Panel>

      <Panel label="Tampilan" buka={bukaTampil} setBuka={setBuka('tampil')} judul="Tampilan tabel">
        <div className="fb-saklar-daftar">
          {formatAras ? (
            <label className="saklar fb-saklar">
              <input type="checkbox" checked={!!tampilLama} onChange={(e) => setTampilLama(e.target.checked)} />
              <span>Blok Statuta 2025 di samping rancangan</span>
            </label>
          ) : null}
          {adaPasal ? (
            <label className="saklar fb-saklar">
              <input type="checkbox" checked={!!tampilPasal} onChange={(e) => setTampilPasal(e.target.checked)} />
              <span>Letak Pasal 2026 di bawah setiap aras</span>
            </label>
          ) : null}
          <label className="saklar fb-saklar">
            <input type="checkbox" checked={ringkas} onChange={(e) => setRingkas(e.target.checked)} />
            <span>Ringkas (kode organ, tabel muat satu layar)</span>
          </label>
        </div>
        {keterangan ? <div className="fb-keterangan">{keterangan}</div> : null}
      </Panel>

      <span className={'jumlah' + (disaring ? ' jumlah-saring' : '')}>
        {disaring ? jumlahHasil + ' dari ' + jumlahTotal : jumlahTotal} urusan
      </span>
    </div>
  );
}
