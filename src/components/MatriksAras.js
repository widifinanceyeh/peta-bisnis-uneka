import React, { useEffect, useMemo, useRef } from 'react';
import SelAksi from './SelAksi';
import SelAras from './SelAras';
import { butirMonev } from '../utils/monev';
import { barisLuarStatuta } from '../utils/tuang';
import { arasBerbeda, bandingUrusan, kelasUrutan, kodeInduk, lengkap, jumlahArasKosong, tetap } from '../utils/aras';

/**
 * Matriks peta untuk rancangan format LIMA KOLOM ARAS (versi 4).
 *
 * Blok kiri : Statuta 2025, langkah bernomor dari tab sumber (opsional, bisa
 *             disembunyikan lewat saklar "Blok 2025").
 * Blok kanan: rancangan, satu kolom per aras; sel memuat chip organ dan unit.
 * Kolom akhir: perbandingan, kelengkapan lima aras, status bahasan, penuangan.
 *
 * Sel rancangan yang berbeda dari Statuta 2025 diberi tepi tebal di kiri,
 * sehingga perubahan per aras terbaca tanpa membuka rincian.
 *
 * Versi 4.2: urusan dikelompokkan menurut Permenristekdikti 16/2018. Baris
 * kepala kelompok (A, B, C) dan subkelompok (A1 ...) disisipkan dari data
 * `kelompok`; klik kepala untuk melipat atau membuka. Urusan MUATAN TETAP
 * diberi tanda "tetap"; aras usul–sah-nya mengikuti C1.1 Perubahan Statuta.
 */
export default function MatriksAras({
  daftar, aksiLama, ctx, pilihan, indeksOrgan, pemisah, teksKosong, ringkas, tampilLama,
  labelLama, labelBaru, idTerpilih, adaKolomMonev, gulirRef, aturan, onPilih, tampilPasal,
  kelompok, tutup, onLipat
}) {
  const wrapRef = useRef(null);
  const aksi = ctx.aksi;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !gulirRef) return;
    if (gulirRef.current > 0) el.scrollTop = gulirRef.current;
  }, [gulirRef]);

  const catatGulir = (e) => { if (gulirRef) gulirRef.current = e.currentTarget.scrollTop; };
  const label = (a) => (ringkas ? a.kode : a.nama);

  const jumlahKolom = 1 + (adaKolomMonev ? 1 : 0) + 1 + (tampilLama ? aksiLama.length + 1 : 0) + aksi.length + 4;
  const idxKel = useMemo(() => {
    const idx = {};
    (kelompok || []).forEach((k) => { idx[k.kode] = k; });
    return idx;
  }, [kelompok]);
  const berkelompok = (kelompok || []).length > 0;
  const tertutup = useMemo(() => tutup || new Set(), [tutup]);

  // Urutan tampil: kepala kelompok, kepala subkelompok, lalu urusannya.
  const baris = useMemo(() => {
    if (!berkelompok) return daftar.map((u) => ({ jenis: 'U', u }));
    const hitung = {};
    daftar.forEach((u) => {
      const s = u.kelompok || '';
      const k = kodeInduk(s);
      hitung[k] = (hitung[k] || 0) + 1;
      if (s !== k) hitung[s] = (hitung[s] || 0) + 1;
    });
    const out = [];
    let kAktif = null, sAktif = null;
    daftar.forEach((u) => {
      const s = u.kelompok || '';
      const k = kodeInduk(s);
      if (k !== kAktif) {
        kAktif = k; sAktif = null;
        out.push({ jenis: 'K', kode: k, info: idxKel[k] || { kode: k, judul: '' }, n: hitung[k] || 0 });
      }
      if (s && s !== k && s !== sAktif) {
        sAktif = s;
        if (!tertutup.has(k)) out.push({ jenis: 'S', kode: s, info: idxKel[s] || { kode: s, judul: '' }, n: hitung[s] || 0 });
      }
      if (!tertutup.has(k) && !tertutup.has(s)) out.push({ jenis: 'U', u });
    });
    return out;
  }, [daftar, berkelompok, idxKel, tertutup]);

  const kepala = (b) => (
    <tr key={'g' + b.kode} className={'baris-kelompok ' + (b.jenis === 'K' ? 'bk-1' : 'bk-2')}
        onClick={() => onLipat && onLipat(b.kode)} title="Klik untuk melipat atau membuka kelompok ini">
      <td colSpan={jumlahKolom}>
        <div className="bk-isi">
          <span className="bk-panah">{tertutup.has(b.kode) ? '▸' : '▾'}</span>
          <span className="bk-kode">{b.kode}</span>
          <span className="bk-judul">{b.info.judul}</span>
          <span className="bk-jumlah">{b.n} urusan</span>
          {b.info.butir || b.info.dasar ? (
            <span className="bk-dasar">{[b.info.butir, b.info.dasar].filter(Boolean).join(' · ')}</span>
          ) : null}
        </div>
      </td>
    </tr>
  );

  return (
    <div className={'tabel-wrap' + (ringkas ? ' ringkas' : '')} ref={wrapRef} onScroll={catatGulir}>
      <table className="tabel tabel-bungkus tabel-aras">
        <colgroup>
          <col className="c-no" />
          {adaKolomMonev ? <col className="c-kunci" /> : null}
          <col className="c-urusan" />
          {tampilLama ? aksiLama.map((a) => <col key={'cl' + a.kode} className="c-aksi" />) : null}
          {tampilLama ? <col className="c-pemisah" /> : null}
          {aksi.map((a) => <col key={'cb' + a.kode} className="c-aras" />)}
          <col className="c-ubah" />
          <col className="c-lengkap" />
          <col className="c-status-bahasan" />
          <col className="c-penuangan" />
        </colgroup>

        <thead>
          <tr className="h-grup">
            <th className="lengket-kiri l1" rowSpan={2}>No</th>
            {adaKolomMonev ? (
              <th className="lengket-kiri lk" rowSpan={2} title="Penomoran pasal dikunci Berita Acara Monev">Kunci</th>
            ) : null}
            <th className={'lengket-kiri l2' + (adaKolomMonev ? ' l2-geser' : '')} rowSpan={2}>Urusan</th>
            {tampilLama ? <th className="grup grup-lama" colSpan={aksiLama.length}>{labelLama}</th> : null}
            {tampilLama ? <th className="pemisah" rowSpan={2} /> : null}
            <th className="grup grup-baru" colSpan={aksi.length}>{labelBaru}</th>
            <th className="grup grup-akhir" colSpan={4}>Keadaan</th>
          </tr>
          <tr className="h-sub">
            {tampilLama ? aksiLama.map((a) => (
              <th key={'l' + a.kode} className="sub" title={a.nama}>{label(a)}</th>
            )) : null}
            {aksi.map((a) => (
              <th key={'b' + a.kode} className="sub sub-aras" title={a.nama}>{label(a)}</th>
            ))}
            <th className="sub" title="Perbandingan organ per aras dengan Statuta 2025">Beda</th>
            <th className="sub" title="Kelengkapan lima aras, dari rumus sheet">Lengkap</th>
            <th className="sub" title="Status bahasan rapat">Status</th>
            <th className="sub" title="Penuangan ke Statuta">Penuangan</th>
          </tr>
        </thead>

        <tbody>
          {baris.map((b) => {
            if (b.jenis !== 'U') return kepala(b);
            const u = b.u;
            const hanya2025 = u.adaDiSumber !== false && u.adaDiRancangan === false;
            const muatanTetap = tetap(u);
            const banding = bandingUrusan(u, ctx);
            const beda = new Set(banding === 'BEDA' ? arasBerbeda(u, ctx) : []);
            const butir = butirMonev(u.monev);
            const luar = barisLuarStatuta(aturan, u);
            const dipilih = String(u.id) === String(idTerpilih);
            const ok = lengkap(u, ctx);
            const kosong = jumlahArasKosong(u.aras, ctx);

            return (
              <tr key={u.id}
                  onClick={() => onPilih(u)}
                  title={hanya2025
                    ? 'Klik untuk melihat alasan perubahan dan tempat substansi urusan ini digabung/melekat pada Rancangan 2026'
                    : undefined}
                  className={'baris' + (dipilih ? ' baris-pilih' : '') + (luar ? ' baris-luar' : '') + (muatanTetap ? ' baris-tetap' : '') + (hanya2025 ? ' baris-riwayat2025' : '')}>
                <td className="lengket-kiri l1 tengah atas">{u.id}</td>
                {adaKolomMonev ? (
                  <td className="lengket-kiri lk tengah atas">
                    {butir ? <span className="lencana lencana-kunci" title={'Terkunci Monev — ' + butir}>kunci</span> : null}
                  </td>
                ) : null}
                <td className={'lengket-kiri l2 nama-urusan atas' + (adaKolomMonev ? ' l2-geser' : '')}>
                  <span className="urusan-teks">{u.urusan}</span>
                  {muatanTetap ? (
                    <span className="muatan-tanda tanda-tetap"
                          title={'Muatan tetap: isi di batang tubuh (' + (u.pasalBaru || 'letak belum diisi') + '); aras usul–sah mengikuti C1.1 Perubahan Statuta'}>tetap</span>
                  ) : null}
                  {u.muatan ? (
                    <span className={'muatan-tanda' + (luar ? ' muatan-luar' : '')} title={'Sumber muatan: ' + u.muatan + (u.dasarMuatan ? '\nDasar: ' + u.dasarMuatan : '') + (u.alasanMuatan ? '\nAlasan: ' + u.alasanMuatan : '')}>
                      {kodeMuatan(u.muatan)}
                    </span>
                  ) : null}
                </td>

                {tampilLama ? aksiLama.map((a) => (
                  <SelAksi key={'l' + a.kode} steps={u.lama} kodeAksi={a.kode} indeksOrgan={indeksOrgan}
                           pemisah={pemisah} teksKosong={u.adaDiSumber === false ? '' : teksKosong}
                           ringkas={ringkas} aturan={aturan} barisLuar={luar} />
                )) : null}
                {tampilLama ? <td className="pemisah" /> : null}

                {aksi.map((a) => (
                  <SelAras key={'b' + a.kode} nilai={(u.aras || {})[a.kode]} ctx={ctx}
                           ringkas={ringkas} teksKosong={teksKosong} beda={beda.has(a.kode)}
                           tampilPasal={tampilPasal} />
                ))}

                <td className="tengah atas">
                  {banding === 'DIHENTIKAN' ? (
                    <span className="lencana lencana-abu"
                          title="Ada pada Statuta 2025 tetapi tidak lagi dipetakan sebagai urusan mandiri pada Rancangan 2026">
                      2025 saja
                    </span>
                  ) : banding === 'TAMBAHAN' ? (
                    <span className="lencana lencana-biru" title="Urusan tambahan; tidak ada padanannya pada Statuta 2025">baru</span>
                  ) : banding === 'KOSONG' ? (
                    <span className="lencana lencana-abu" title="Belum ada rancangan">–</span>
                  ) : banding === 'BEDA' ? (
                    <span className="lencana lencana-kuning" title={'Berbeda pada ' + beda.size + ' aras'}>beda {beda.size}</span>
                  ) : (
                    <span className="lencana lencana-hijau" title="Organ tiap aras sama dengan Statuta 2025">sama</span>
                  )}
                </td>
                <td className="tengah atas">
                  {hanya2025 ? (
                    <span className="lencana lencana-abu">—</span>
                  ) : ok ? (
                    <span className="lencana lencana-hijau" title={u.kelengkapan || 'Lengkap'}>✓</span>
                  ) : (
                    <span className="lencana lencana-merah" title={u.kelengkapan || (kosong + ' aras kosong')}>
                      {kosong || '!'} kosong
                    </span>
                  )}
                </td>
                <td className="tengah atas">
                  {hanya2025 ? (
                    <span className="lencana lencana-abu" title="Baris pembanding Statuta 2025; tidak menjadi urusan mandiri pada Rancangan 2026">
                      RIWAYAT 2025
                    </span>
                  ) : u.statusBahasan ? (
                    <span className={'lencana lencana-bungkus ' + kelasUrutan(u.statusBahasan, pilihan.STATUS)}
                          title={u.dilengkapi ? 'Aras dilengkapi tanpa pembahasan: ' + u.dilengkapi : u.statusBahasan}>
                      {u.statusBahasan}
                    </span>
                  ) : null}
                </td>
                <td className="kecil atas penuangan-sel" title={hanya2025 ? 'Tidak lagi urusan mandiri pada Rancangan 2026' : u.penuangan}>
                  {hanya2025 ? 'tidak lagi urusan mandiri' : u.penuangan}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {daftar.length === 0 ? (
        <div className="kosong-hasil">Tidak ada urusan yang cocok dengan penyaring saat ini.</div>
      ) : null}
    </div>
  );
}

function kodeMuatan(teks) {
  const t = String(teks || '').trim();
  if (!t) return '';
  const kata = t.split(/\s+/);
  return kata[0].length > 9 ? kata[0].slice(0, 9) : kata[0];
}
