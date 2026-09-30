import React, { useMemo } from 'react';

/**
 * Opsi filter dibangun dari data aktual, bukan dari daftar tetap.
 * Versi 4 (format ARAS): penyaring Status bahasan, Penuangan, dan
 * Kelengkapan. Opsi status dan penuangan mengikuti urutan data validation
 * sheet (`pilihan`), ditambah nilai lama yang tidak lagi ada di daftar.
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

export default function FilterBar({
  urusan, filter, setFilter, jumlahHasil, jumlahTotal, ringkas, setRingkas, onReset,
  formatAras, pilihan, tampilLama, setTampilLama, adaPasal, tampilPasal, setTampilPasal, kelompok
}) {
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

  return (
    <div className="filterbar">
      <input className="inp cari" type="search" placeholder="Cari urusan, organ, unit…"
             value={filter.cari} onChange={(e) => ubah('cari', e.target.value)} />

      {berkelompok ? (
        <select className="inp" value={filter.kelompok || ''} onChange={(e) => ubah('kelompok', e.target.value)}
                title="Kelompok urusan menurut Permenristekdikti 16/2018">
          <option value="">Semua kelompok</option>
          {kelompok.map((k) => (
            <option key={k.kode} value={k.kode}>{(k.tingkat === 2 ? '\u00a0\u00a0\u00a0' : '') + k.kode + '. ' + k.judul}</option>
          ))}
        </select>
      ) : (
        <select className="inp" value={filter.bidang} onChange={(e) => ubah('bidang', e.target.value)}>
          <option value="">Semua bidang</option>
          {daftarBidang.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      )}

      {adaTetap ? (
        <select className="inp inp-sempit" value={filter.jenis || ''} onChange={(e) => ubah('jenis', e.target.value)}
                title="Alur kewenangan memakai lima aras; muatan tetap cukup dinyatakan dalam batang tubuh">
          <option value="">Semua jenis</option>
          <option value="ALUR">Alur kewenangan</option>
          <option value="TETAP">Muatan tetap</option>
        </select>
      ) : null}

      {daftarMuatan.length ? (
        <select className="inp" value={filter.muatan} onChange={(e) => ubah('muatan', e.target.value)}
                title="Menyaring menurut kekuatan dasar hukum muatan">
          <option value="">Semua sumber muatan</option>
          {daftarMuatan.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      ) : null}

      {formatAras && daftarBahasan.length ? (
        <select className="inp" value={filter.statusBahasan || ''} onChange={(e) => ubah('statusBahasan', e.target.value)}
                title="Status bahasan rapat">
          <option value="">Semua status bahasan</option>
          {daftarBahasan.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      ) : null}

      {formatAras && daftarTuang.length ? (
        <select className="inp" value={filter.penuangan || ''} onChange={(e) => ubah('penuangan', e.target.value)}
                title="Penuangan ke Statuta">
          <option value="">Semua penuangan</option>
          {daftarTuang.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      ) : null}

      {formatAras ? (
        <select className="inp inp-sempit" value={filter.lengkap || ''} onChange={(e) => ubah('lengkap', e.target.value)}
                title="Kelengkapan lima aras">
          <option value="">Semua kelengkapan</option>
          <option value="YA">Lima aras lengkap</option>
          <option value="TIDAK">Ada aras kosong</option>
        </select>
      ) : null}

      {!formatAras || tampilLama ? (
        <select className="inp" value={filter.status} onChange={(e) => ubah('status', e.target.value)}
                title="Status pengaturan pada Statuta 2025">
          <option value="">{formatAras ? 'Semua status 2025' : 'Semua status'}</option>
          {daftarStatus.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      ) : null}

      <select className="inp" value={filter.perubahan} onChange={(e) => ubah('perubahan', e.target.value)}>
        <option value="">Semua keadaan</option>
        <option value="BERUBAH">Berbeda dari 2025</option>
        <option value="SAMA">Sama dengan 2025</option>
        <option value="BELUM">Belum ada rancangan</option>
        {adaTambahan ? <option value="TAMBAHAN">Urusan tambahan</option> : null}
        {adaHanya2025 ? <option value="2025">2025 saja / tidak diteruskan</option> : null}
      </select>

      {adaMonev ? (
        <label className="saklar" title="Hanya urusan yang penomoran pasalnya dikunci Berita Acara Monev">
          <input type="checkbox" checked={!!filter.monev} onChange={(e) => ubah('monev', e.target.checked ? '1' : '')} />
          <span>Terkunci Monev</span>
        </label>
      ) : null}

      <button className="tbl tbl-ringan" onClick={onReset}>Reset</button>

      {formatAras ? (
        <label className="saklar" title="Tampilkan blok Statuta 2025 di samping rancangan">
          <input type="checkbox" checked={!!tampilLama} onChange={(e) => setTampilLama(e.target.checked)} />
          <span>Blok 2025</span>
        </label>
      ) : null}

      {adaPasal ? (
        <label className="saklar" title="Tampilkan letak pasal Statuta 2026 di bawah setiap aras">
          <input type="checkbox" checked={!!tampilPasal} onChange={(e) => setTampilPasal(e.target.checked)} />
          <span>Pasal 2026</span>
        </label>
      ) : null}

      <label className="saklar" title="Mode ringkas memakai kode organ agar tabel muat satu layar">
        <input type="checkbox" checked={ringkas} onChange={(e) => setRingkas(e.target.checked)} />
        <span>Ringkas</span>
      </label>

      <span className={'jumlah' + (disaring ? ' jumlah-saring' : '')}>
        {disaring ? jumlahHasil + ' dari ' + jumlahTotal : jumlahTotal} urusan
      </span>
    </div>
  );
}
