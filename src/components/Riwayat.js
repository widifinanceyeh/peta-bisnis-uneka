import React, { useCallback, useEffect, useState } from 'react';
import * as api from '../api';
import Ikon from './Ikon';
import { tglJam } from '../utils/format';

/** Nama kolom internal → kata yang dikenal pengguna. */
const LABEL = {
  DIBUAT: 'Dibuat', JUDUL: 'Judul', JUDUL_RAPAT: 'Judul rapat', RINGKASAN: 'Ringkasan', KATEGORI: 'Kategori',
  STATUS_ISU: 'Tahap', PRIORITAS: 'Prioritas', PIC_UTAMA: 'PIC', ID_PIC_UTAMA: 'PIC (kode)', PENGUSUL: 'Pengusul',
  UNIT_TERKAIT: 'Unit terkait', PENANDA: 'Penanda', CATATAN: 'Catatan', TUJUAN_PEMBAHASAN: 'Tujuan pembahasan',
  PERTANYAAN_KEPUTUSAN: 'Pertanyaan keputusan', CATATAN_PERSIAPAN: 'Catatan persiapan', STATUS: 'Status',
  TANGGAL_TARGET: 'Target', PROGRES_TERAKHIR: 'Progres', PIC: 'PIC', ID_PIC: 'PIC (kode)', JENIS_HASIL: 'Jenis hasil',
  ID_INDUK: 'Induk', ID_ISU: 'Pokok bahasan', ISI_ARAHAN: 'Isi arahan', SIFAT: 'Sifat', UNIT_TUJUAN: 'Ditujukan kepada',
  PERLU_DIFORMALKAN: 'Perlu diformalkan', TINDAK_LANJUT_RINGKAS: 'Ringkasan tindak lanjut', TANGGAL: 'Tanggal',
  JENIS_RAPAT: 'Jenis rapat', MODE: 'Sifat pertemuan', TEMPAT: 'Tempat', TAUTAN_RAPAT: 'Tautan daring',
  JAM_MULAI: 'Jam mulai', JAM_SELESAI: 'Jam selesai', PESERTA: 'Peserta', PIMPINAN_RAPAT: 'Pimpinan', NOTULIS: 'Notulis',
  STATUS_PEMBAHASAN: 'Status pembahasan', RINGKASAN_PEMBAHASAN: 'Ringkasan pembahasan', HASIL_KEPUTUSAN: 'Keputusan',
  UNIT_PESERTA: 'Unit peserta', LINK_DOKUMEN: 'Dokumen', ID_NOTULEN: 'Notulen', SUSULAN: 'Selipan',
};
const label = (f) => LABEL[f] || String(f || '').replace(/_/g, ' ').toLowerCase();

/**
 * Jejak perubahan satu entitas. Dibaca dari server hanya saat dibuka,
 * supaya tidak membebani pemuatan awal aplikasi.
 */
export default function Riwayat({ jenis, id }) {
  const [buka, setBuka] = useState(false);
  const [state, setState] = useState({ muat: false, galat: '', list: null });

  const muat = useCallback(async () => {
    setState({ muat: true, galat: '', list: null });
    try {
      const list = await api.riwayat(jenis, id);
      setState({ muat: false, galat: '', list: Array.isArray(list) ? list : [] });
    } catch (err) {
      setState({ muat: false, galat: err.message, list: null });
    }
  }, [jenis, id]);

  useEffect(() => { setBuka(false); setState({ muat: false, galat: '', list: null }); }, [jenis, id]);
  useEffect(() => { if (buka && !state.list && !state.muat && !state.galat) muat(); }, [buka, state, muat]);

  return (
    <details className="lipat riwayat" open={buka} onToggle={(e) => setBuka(e.target.open)}>
      <summary><Ikon n="kanan" s={14} /><span>Jejak perubahan</span></summary>
      <div className="lipat-isi">
        {state.muat ? <p className="samar kecil">Memuat…</p> : null}
        {state.galat ? <p className="kecil teks-merah">{state.galat}</p> : null}
        {state.list && !state.list.length ? <p className="samar kecil">Belum ada perubahan yang tercatat.</p> : null}
        {state.list && state.list.length ? (
          <ul className="daftar-jejak">
            {state.list.map((r, i) => (
              <li key={i}>
                <span className="jejak-waktu">{tglJam(r.waktu)}</span>
                <span className="jejak-isi">
                  <strong>{label(r.field)}</strong>
                  {r.field === 'DIBUAT' ? null : <> : <span className="samar">{r.lama || '(kosong)'}</span> → {r.baru || <span className="samar">(kosong)</span>}</>}
                </span>
                <span className="jejak-oleh">{r.oleh || '—'}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </details>
  );
}
