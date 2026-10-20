import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../konteks';
import Kepala, { SaringBar, KotakCari } from '../components/Kepala';
import Tabel from '../components/Tabel';
import { Pilih, MenuTitik } from '../components/Pilih';
import { Lencana, Orang } from '../components/Dasar';
import { EditPilihan } from '../components/EditSel';
import Ikon from '../components/Ikon';
import { pref, setPref } from '../simpanan';
import { cocokCari, tgl } from '../utils/format';
import { opsi, nadaStatusArahan, ARAHAN_TERBUKA, unitList } from '../utils/data';

const AWAL = { q: '', sifat: '', lembaga: '', kaitan: '', status: 'terbuka' };
export const nadaSifat = (s) => ({ 'Arahan/Instruksi': 'biru', Informasi: 'abu', 'Gagasan belum final': 'pink', Peringatan: 'kuning' })[s] || 'abu';

export function aksiArahan(app, a) {
  const { buka, bukaForm, hapus } = app;
  return [
    { label: 'Lihat rincian', onClick: () => buka('arahan', a.ID_ARAHAN) },
    { label: 'Buat tindak lanjut', onClick: () => bukaForm('tl', { awal: { idArahanAsal: a.ID_ARAHAN, idIsu: a.ID_ISU_LIST.length === 1 ? a.ID_ISU_LIST[0] : '', judul: a.ISI_ARAHAN.slice(0, 140) } }) },
    { label: 'Edit', onClick: () => bukaForm('arahan', { item: a }) },
    { label: 'Salin sebagai arahan baru', onClick: () => bukaForm('arahan', { awal: { isiArahan: a.ISI_ARAHAN, lembaga: a.LEMBAGA, forum: a.FORUM, idPemberi: a.ID_PEMBERI, sifat: a.SIFAT, unitTujuan: a.UNIT_TUJUAN } }) },
    { garis: true },
    { label: 'Hapus', bahaya: true, onClick: () => hapus('deleteArahan', a.ID_ARAHAN, { judul: 'Hapus arahan?', pesan: 'Arahan ini akan dihapus. Penghapusan ditolak bila sudah menjadi sumber tindak lanjut.' }) },
  ];
}

export default function Arahan() {
  const app = useApp();
  const { data, buka, bukaForm, tulis } = app;
  const [f, setF] = useState(() => Object.assign({}, AWAL, pref('saring.arahan', {})));
  useEffect(() => { setPref('saring.arahan', f); }, [f]);
  const ubahF = (k, v) => setF((x) => Object.assign({}, x, { [k]: v }));

  const baris = useMemo(() => data.arahan.filter((a) => {
    const isu = a.ID_ISU_LIST.map((i) => data.peta.isu[i] && data.peta.isu[i].JUDUL);
    if (!cocokCari(f.q, [a.ISI_ARAHAN, a.PEMBERI_ARAHAN, a.UNIT_TUJUAN, a.FORUM, a.CATATAN].concat(isu))) return false;
    if (f.sifat && a.SIFAT !== f.sifat) return false;
    if (f.lembaga && a.LEMBAGA !== f.lembaga) return false;
    if (f.kaitan === 'terkait' && !a.ID_ISU_LIST.length) return false;
    if (f.kaitan === 'lepas' && a.ID_ISU_LIST.length) return false;
    if (f.status === 'terbuka' && ARAHAN_TERBUKA.indexOf(a.STATUS || '') === -1) return false;
    if (f.status && f.status !== 'terbuka' && f.status !== 'semua' && (a.STATUS || '') !== f.status) return false;
    return true;
  }).sort((a, b) => new Date(b.TANGGAL || 0) - new Date(a.TANGGAL || 0)), [data, f]);

  const kolom = useMemo(() => [
    { kunci: 'tgl', judul: 'Tanggal', lebar: 110, render: (a) => <span>{tgl(a.TANGGAL)}</span> },
    { kunci: 'isi', judul: 'Arahan', lebar: 380, render: (a) => <div className="dua-baris"><span className="isi-arahan">{a.ISI_ARAHAN}</span><small>{[a.FORUM, unitList(a.UNIT_TUJUAN).length ? '→ ' + unitList(a.UNIT_TUJUAN).join(', ') : ''].filter(Boolean).join(' · ')}</small></div> },
    { kunci: 'pemberi', judul: 'Pemberi', lebar: 170, render: (a) => <Orang nama={a.PEMBERI_ARAHAN} /> },
    { kunci: 'status', judul: 'Status', lebar: 170, render: (a) => (
      <EditPilihan value={a.STATUS || 'Belum ditindaklanjuti'} opsi={opsi(data, 'STATUS_ARAHAN')} nada={nadaStatusArahan}
        onSimpan={(v) => tulis('updateArahan', { id: a.ID_ARAHAN, status: v }, { sukses: 'Status arahan diperbarui.' })} disabled={a._baru} />
    ) },
    { kunci: 'sifat', judul: 'Sifat', lebar: 130, render: (a) => (a.SIFAT ? <Lencana nada={nadaSifat(a.SIFAT)}>{a.SIFAT}</Lencana> : <span className="samar">—</span>) },
    { kunci: 'kait', judul: 'Kaitan', lebar: 120, render: (a) => {
      const tl = data.tindakLanjut.filter((t) => t.ID_ARAHAN_ASAL === a.ID_ARAHAN).length;
      return <span className="kecil">{a.ID_ISU_LIST.length ? a.ID_ISU_LIST.length + ' pokok' : <span className="samar">tanpa pokok</span>}{tl ? ' · ' + tl + ' TL' : ''}</span>;
    } },
    { kunci: 'aksi', judul: '', lebar: 52, tetapKanan: true, kelas: 'kolom-aksi', render: (a) => (a._baru ? null : <MenuTitik items={aksiArahan(app, a)} />) },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [data]);

  return (
    <div className="halaman">
      <Kepala judul="Arahan" sub="Catatan arahan pimpinan; dapat dikaitkan ke pokok bahasan atau berdiri sendiri."
        aksi={<button type="button" className="tombol utama" onClick={() => bukaForm('arahan', {})}><Ikon n="tambah" s={15} />Catat Arahan</button>} />
      <SaringBar jumlah={baris.length + ' arahan'} adaSaring={JSON.stringify(f) !== JSON.stringify(AWAL)} onReset={() => setF(AWAL)}>
        <KotakCari value={f.q} onChange={(v) => ubahF('q', v)} placeholder="Cari isi, pemberi, pokok bahasan…" />
        <Pilih className="saring-pilih" value={f.status} onChange={(v) => ubahF('status', v || 'terbuka')}
          opsi={[{ value: 'terbuka', label: 'Yang belum tuntas' }, { value: 'semua', label: 'Semua status' }].concat(opsi(data, 'STATUS_ARAHAN').map((t) => ({ value: t, label: t })))} cari={false} />
        <Pilih className="saring-pilih" value={f.sifat} onChange={(v) => ubahF('sifat', v)} opsi={opsi(data, 'SIFAT_ARAHAN')} kosong="Semua sifat" placeholder="Sifat" cari={false} />
        <Pilih className="saring-pilih" value={f.lembaga} onChange={(v) => ubahF('lembaga', v)} opsi={opsi(data, 'LEMBAGA')} kosong="Semua lembaga" placeholder="Lembaga" cari={false} />
        <Pilih className="saring-pilih" value={f.kaitan} onChange={(v) => ubahF('kaitan', v)} opsi={[{ value: 'terkait', label: 'Terkait pokok bahasan' }, { value: 'lepas', label: 'Berdiri sendiri' }]} kosong="Semua kaitan" placeholder="Kaitan" cari={false} />
      </SaringBar>
      <Tabel id="arahan" kolom={kolom} baris={baris} kunci={(a) => a.ID_ARAHAN} onBuka={(a) => !a._baru && buka('arahan', a.ID_ARAHAN)} kosong="Belum ada arahan tercatat." />
    </div>
  );
}
