import React, { useMemo } from 'react';
import { useApp } from '../konteks';
import { Modal } from '../components/Modal';
import { Field, Lipat } from '../components/Dasar';
import { Pilih, PilihBanyak } from '../components/Pilih';
import PilihOrang from '../components/PilihOrang';
import EditorTautan from '../components/EditorTautan';
import { useIsian, selisih, GalatForm, Kaki } from './umum';
import { kunciTanggal, hariIni } from '../utils/format';
import { opsi, tautan, TAHAP_OTOMATIS, BAWAAN, unitList } from '../utils/data';

export default function FormPokok({ item, awal, draf, galat }) {
  const { data, tutupForm, kirimForm, tulis } = useApp();
  const edit = !!item;
  const asal = edit ? {
    judul: item.JUDUL || '', ringkasan: item.RINGKASAN || '', kategori: item.KATEGORI || '', statusIsu: item.STATUS_ISU || 'Isu Awal',
    prioritas: item.PRIORITAS || 'Sedang', picUtama: item.PIC_UTAMA || '', tanggalMuncul: kunciTanggal(item.TANGGAL_MUNCUL),
    tujuanPembahasan: item.TUJUAN_PEMBAHASAN || '', pertanyaanKeputusan: item.PERTANYAAN_KEPUTUSAN || '', catatanPersiapan: item.CATATAN_PERSIAPAN || '',
    jenisPokok: item.JENIS_POKOK || '', pengusul: item.PENGUSUL || '', unitTerkait: unitList(item.UNIT_TERKAIT), catatan: item.CATATAN || '',
    penanda: String(item.PENANDA || '').split(',').map((s) => s.trim()).filter(Boolean), tautan: tautan(data, 'Pokok Bahasan', item.ID_ISU),
  } : Object.assign({
    judul: '', ringkasan: '', kategori: '', statusIsu: 'Isu Awal', prioritas: 'Sedang', picUtama: '', tanggalMuncul: hariIni(),
    tujuanPembahasan: '', pertanyaanKeputusan: '', catatanPersiapan: '', jenisPokok: '', pengusul: '', unitTerkait: [], catatan: '', penanda: [], tautan: [],
  }, awal || {});
  const [v, set] = useIsian(asal, draf);
  const unitOpsi = useMemo(() => {
    const dari = opsi(data, 'UNIT');
    const seen = {};
    return dari.concat(v.unitTerkait || []).filter((x) => { const k = String(x).toLowerCase(); if (seen[k]) return false; seen[k] = 1; return true; });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, (v.unitTerkait || []).join('|')]);
  const tahap = opsi(data, 'STATUS_ISU').filter((t) => TAHAP_OTOMATIS.indexOf(t) === -1 || t === asal.statusIsu);

  function simpan(e) {
    e.preventDefault();
    if (!v.judul.trim()) return;
    const isi = Object.assign({}, v, { judul: v.judul.trim() });
    if (edit) {
      const beda = selisih(asal, isi);
      if (!Object.keys(beda).length) { tutupForm(); return; }
      kirimForm('updateIsu', Object.assign({ id: item.ID_ISU }, beda), v, { sukses: 'Pokok bahasan diperbarui.' });
    } else {
      kirimForm('addIsu', isi, v, { sukses: 'Pokok bahasan ditambahkan.' });
    }
  }
  const adaRincian = !!(v.ringkasan || v.tujuanPembahasan || v.pertanyaanKeputusan || v.catatanPersiapan);
  const adaLain = !!(v.jenisPokok || v.pengusul || (v.unitTerkait || []).length || v.catatan || v.penanda.length);

  return (
    <Modal judul={edit ? 'Edit pokok bahasan' : 'Pokok bahasan baru'} onTutup={tutupForm} ukuran="md"
      kaki={<Kaki onBatal={tutupForm} form="form-pokok" nonaktif={!v.judul.trim()} />}>
      <form id="form-pokok" onSubmit={simpan} className="form">
        <GalatForm pesan={galat} />
        <Field label="Judul" wajib><input autoFocus value={v.judul} onChange={(e) => set('judul', e.target.value)} placeholder="mis. Pedoman Tugas Belajar dan Izin Belajar" /></Field>
        <div className="grid-3">
          <Field label="Kategori"><Pilih value={v.kategori} onChange={(x) => set('kategori', x)} opsi={opsi(data, 'KATEGORI_ISU')} kosong="— tanpa kategori —" bebas /></Field>
          <Field label="Prioritas"><Pilih value={v.prioritas} onChange={(x) => set('prioritas', x)} opsi={opsi(data, 'PRIORITAS')} cari={false} /></Field>
          <Field label="Tahap"><Pilih value={v.statusIsu} onChange={(x) => set('statusIsu', x)} opsi={tahap} /></Field>
        </div>
        <Field label="PIC utama"><PilihOrang mode="nama" value={v.picUtama} onChange={(x) => set('picUtama', x)} kosong="— belum ditentukan —" bebas /></Field>
        <Lipat judul="Rincian pembahasan" ringkas="latar, tujuan, hal yang diputuskan" terbuka={adaRincian}>
          <Field label="Latar belakang"><textarea rows={3} value={v.ringkasan} onChange={(e) => set('ringkasan', e.target.value)} /></Field>
          <div className="grid-2">
            <Field label="Tujuan pembahasan"><textarea rows={2} value={v.tujuanPembahasan} onChange={(e) => set('tujuanPembahasan', e.target.value)} /></Field>
            <Field label="Hal yang perlu diputuskan"><textarea rows={2} value={v.pertanyaanKeputusan} onChange={(e) => set('pertanyaanKeputusan', e.target.value)} /></Field>
          </div>
          <Field label="Catatan persiapan"><textarea rows={2} value={v.catatanPersiapan} onChange={(e) => set('catatanPersiapan', e.target.value)} /></Field>
        </Lipat>
        <Lipat judul="Informasi lain" ringkas="pengusul, unit, penanda, catatan" terbuka={adaLain}>
          <div className="grid-3">
            <Field label="Jenis pokok"><input value={v.jenisPokok} onChange={(e) => set('jenisPokok', e.target.value)} placeholder="mis. Draft regulasi" /></Field>
            <Field label="Pengusul"><input value={v.pengusul} onChange={(e) => set('pengusul', e.target.value)} /></Field>
            <Field label="Unit terkait" petunjuk="Boleh lebih dari satu unit.">
              <PilihBanyak value={v.unitTerkait} onChange={(x) => set('unitTerkait', x)} opsi={unitOpsi} placeholder="— tidak khusus —" lebar={360}
                onTambah={(t) => { const nama = (t || '').trim(); if (!nama) return; tulis('tambahOpsi', { kunci: 'UNIT', nilai: nama }, { sukses: 'Unit “' + nama + '” ditambahkan ke daftar pilihan.' }); set('unitTerkait', (v.unitTerkait || []).concat(nama)); }}
                labelTambah="unit" />
            </Field>
          </div>
          <div className="grid-2">
            <Field label="Tanggal muncul"><input type="date" value={v.tanggalMuncul} onChange={(e) => set('tanggalMuncul', e.target.value)} /></Field>
            <Field label="Penanda"><PilihBanyak value={v.penanda} onChange={(x) => set('penanda', x)} opsi={BAWAAN.PENANDA} placeholder="Tidak ada" /></Field>
          </div>
          <Field label="Catatan internal"><textarea rows={2} value={v.catatan} onChange={(e) => set('catatan', e.target.value)} /></Field>
        </Lipat>
        <Field label="Dokumen"><EditorTautan value={v.tautan} onChange={(x) => set('tautan', x)} data={data} /></Field>
      </form>
    </Modal>
  );
}
