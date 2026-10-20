import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as api from '../api';
import { useApp } from '../konteks';
import Kepala from '../components/Kepala';
import Tabel from '../components/Tabel';
import { Modal } from '../components/Modal';
import { Pilih, MenuTitik } from '../components/Pilih';
import { EditPilihan } from '../components/EditSel';
import { Field, Info, Kosong, Lencana, Orang } from '../components/Dasar';
import Ikon from '../components/Ikon';
import { GalatForm } from '../forms/umum';
import { waktuRelatif, namaPendek, tglJam } from '../utils/format';
import { opsiOrangId, salinTeks } from '../utils/data';
import { pergi } from '../navigasi';

const PERAN = [{ value: 'Admin', label: 'Admin' }, { value: 'Staf', label: 'Staf' }];
const STATUS = [{ value: 'Ya', label: 'Aktif' }, { value: 'Tidak', label: 'Nonaktif' }];

function sandiAcak() {
  const huruf = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const a = new Uint32Array(12);
  window.crypto.getRandomValues(a);
  return Array.from(a, (n) => huruf[n % huruf.length]).join('');
}

function IsianSandi({ value, onChange, acak, label = 'Sandi', autoFocus }) {
  const [lihat, setLihat] = useState(!!acak);
  return (
    <Field label={label} petunjuk="Minimal 8 karakter.">
      <span className="sandi-wadah">
        <input autoFocus={autoFocus} type={lihat ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} autoComplete="new-password" />
        <button type="button" className="tombol-ikon" onClick={() => setLihat((x) => !x)} aria-label="Tampilkan sandi"><Ikon n="mata" s={16} /></button>
        {acak ? <button type="button" className="tombol tipis kecil" onClick={() => { onChange(sandiAcak()); setLihat(true); }}>Buat acak</button> : null}
      </span>
    </Field>
  );
}

/** Modal kecil untuk aksi akun: kirim → tutup bila berhasil; galat tampil di dalam modal. */
function useKirim(onSelesai) {
  const { toast } = useApp();
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState('');
  const kirim = async (action, payload, sukses) => {
    setSibuk(true); setGalat('');
    try {
      await api.post(action, payload);
      toast(sukses, 'sukses');
      onSelesai(true);
    } catch (err) {
      setGalat(err.message);
    }
    setSibuk(false);
  };
  return { sibuk, galat, kirim, setGalat };
}

function FormAkun({ item, data, onTutup }) {
  const edit = !!item;
  const [v, setV] = useState(edit ? { nama: item.nama, idOrang: item.idOrang || '' } : { nama: '', username: '', peran: 'Staf', idOrang: '', sandi: sandiAcak() });
  const set = (k, x) => setV((s) => Object.assign({}, s, { [k]: x }));
  const { sibuk, galat, kirim, setGalat } = useKirim(onTutup);
  const orangOpsi = useMemo(() => opsiOrangId(data), [data]);
  function simpan(e) {
    e.preventDefault();
    if (!v.nama.trim()) { setGalat('Nama wajib diisi.'); return; }
    if (edit) kirim('ubahPengguna', { id: item.id, nama: v.nama.trim(), idOrang: v.idOrang }, 'Akun diperbarui.');
    else kirim('tambahPengguna', Object.assign({}, v, { nama: v.nama.trim(), username: v.username.trim().toLowerCase() }), 'Akun ' + v.username.trim().toLowerCase() + ' dibuat. Sampaikan ID dan sandinya kepada yang bersangkutan.');
  }
  return (
    <Modal judul={edit ? 'Ubah akun' : 'Tambah akun'} sub={edit ? 'ID masuk: ' + item.username : undefined} onTutup={() => onTutup(false)} ukuran="sm"
      kaki={<><button type="button" className="tombol" onClick={() => onTutup(false)}>Batal</button><button type="submit" form="form-akun" className="tombol utama" disabled={sibuk}>{sibuk ? 'Menyimpan…' : 'Simpan'}</button></>}>
      <form id="form-akun" className="form" onSubmit={simpan}>
        <GalatForm pesan={galat} />
        <Field label="Kaitkan ke DaftarOrang" petunjuk="Opsional. Membuat “Pekerjaan Saya” terisi otomatis saat orang ini masuk.">
          <Pilih value={v.idOrang} onChange={(x) => { set('idOrang', x); const o = data.peta.orang[x]; if (o && !v.nama.trim()) set('nama', namaPendek(o.NAMA)); }} opsi={orangOpsi} kosong="— tidak dikaitkan —" lebar={320} />
        </Field>
        <Field label="Nama" wajib><input autoFocus value={v.nama} onChange={(e) => set('nama', e.target.value)} /></Field>
        {!edit ? (
          <>
            <div className="grid-2">
              <Field label="ID masuk" wajib petunjuk="Huruf kecil/angka, mis. widi"><input value={v.username} onChange={(e) => set('username', e.target.value)} autoCapitalize="none" spellCheck={false} /></Field>
              <Field label="Peran"><Pilih value={v.peran} onChange={(x) => set('peran', x)} opsi={PERAN} cari={false} /></Field>
            </div>
            <IsianSandi label="Sandi awal" value={v.sandi} onChange={(x) => set('sandi', x)} acak />
            <button type="button" className="tautan-tombol kiri" onClick={() => salinTeks('ID: ' + v.username.trim().toLowerCase() + '\nSandi: ' + v.sandi)}><Ikon n="salin" s={13} /> Salin ID &amp; sandi</button>
          </>
        ) : null}
      </form>
    </Modal>
  );
}

function FormSandi({ item, onTutup }) {
  const sendiri = !item;
  const [v, setV] = useState({ lama: '', baru: sendiri ? '' : sandiAcak(), ulang: '' });
  const set = (k, x) => setV((s) => Object.assign({}, s, { [k]: x }));
  const { sibuk, galat, kirim, setGalat } = useKirim(onTutup);
  function simpan(e) {
    e.preventDefault();
    if (sendiri) {
      if (v.baru !== v.ulang) { setGalat('Ulangi sandi baru tidak sama.'); return; }
      kirim('gantiSandiSaya', { sandiLama: v.lama, sandiBaru: v.baru }, 'Sandi diganti. Perangkat lain yang memakai akun ini akan diminta masuk ulang.');
    } else {
      kirim('aturUlangSandi', { id: item.id, sandi: v.baru }, 'Sandi ' + item.username + ' diatur ulang. Sesi lamanya sudah diakhiri.');
    }
  }
  return (
    <Modal judul={sendiri ? 'Ganti sandi saya' : 'Atur ulang sandi'} sub={sendiri ? undefined : item.nama + ' · ' + item.username} onTutup={() => onTutup(false)} ukuran="sm"
      kaki={<><button type="button" className="tombol" onClick={() => onTutup(false)}>Batal</button><button type="submit" form="form-sandi" className="tombol utama" disabled={sibuk}>{sibuk ? 'Menyimpan…' : 'Simpan sandi'}</button></>}>
      <form id="form-sandi" className="form" onSubmit={simpan}>
        <GalatForm pesan={galat} />
        {sendiri ? <IsianSandi label="Sandi lama" value={v.lama} onChange={(x) => set('lama', x)} autoFocus /> : null}
        <IsianSandi label="Sandi baru" value={v.baru} onChange={(x) => set('baru', x)} acak={!sendiri} />
        {sendiri ? <IsianSandi label="Ulangi sandi baru" value={v.ulang} onChange={(x) => set('ulang', x)} /> : (
          <button type="button" className="tautan-tombol kiri" onClick={() => salinTeks('ID: ' + item.username + '\nSandi: ' + v.baru)}><Ikon n="salin" s={13} /> Salin ID &amp; sandi</button>
        )}
      </form>
    </Modal>
  );
}

export default function Pengaturan() {
  const { data, pengguna, toast, rute } = useApp();
  const admin = pengguna && pengguna.peran === 'Admin';
  const [daftar, setDaftar] = useState(null);
  const [galat, setGalat] = useState('');
  const [modal, setModal] = useState(null);
  // Dari menu akun di kanan atas: #pengaturan?aksi=sandi langsung membuka Ganti sandi.
  const aksi = rute && rute.query ? rute.query.aksi : '';
  useEffect(() => {
    if (aksi !== 'sandi') return;
    setModal({ jenis: 'sandi' });
    pergi('pengaturan', '', {}, true);
  }, [aksi]);

  const muat = useCallback(async () => {
    if (!admin) return;
    try { setDaftar(await api.daftarPengguna()); setGalat(''); } catch (err) { setGalat(err.message); }
  }, [admin]);
  useEffect(() => { muat(); }, [muat]);

  const ubah = useCallback(async (u, payload, sukses) => {
    setDaftar((d) => d.map((x) => (x.id === u.id ? Object.assign({}, x, payload.peran ? { peran: payload.peran } : {}, payload.aktif !== undefined ? { aktif: payload.aktif } : {}) : x)));
    try { await api.post('ubahPengguna', Object.assign({ id: u.id }, payload)); toast(sukses, 'sukses'); } catch (err) { toast(err.message, 'galat'); }
    muat();
  }, [muat, toast]);

  const tutup = (berubah) => { setModal(null); if (berubah) muat(); };

  // Akun yang pernah dipakai masuk hanya dinonaktifkan, karena ID-nya menempel pada jejak perubahan.
  const hapusAkun = useCallback(async (u) => {
    if (!u.bolehHapus) {
      toast('Akun “' + u.username + '” pernah dipakai masuk sehingga tidak dapat dihapus permanen. Nonaktifkan saja agar jejak perubahannya tetap dapat ditelusuri.', 'galat');
      return;
    }
    // eslint-disable-next-line no-alert
    if (!window.confirm('Hapus akun “' + u.nama + '” (' + u.username + ')? Akun ini belum pernah dipakai masuk dan penghapusannya tidak dapat dibatalkan.')) return;
    try { await api.post('hapusPengguna', { id: u.id }); toast('Akun ' + u.nama + ' dihapus.', 'sukses'); } catch (err) { toast(err.message, 'galat'); }
    muat();
  }, [muat, toast]);
  const kolom = useMemo(() => [
    { kunci: 'nama', judul: 'Nama', lebar: 260, render: (u) => <div className="dua-baris"><strong className="judul-baris">{u.nama}{u.id === pengguna.id ? <Lencana kecil nada="pink">Anda</Lencana> : null}</strong><small>ID: {u.username}</small></div> },
    { kunci: 'peran', judul: 'Peran', lebar: 120, render: (u) => <EditPilihan value={u.peran} opsi={PERAN} nada={(p) => (p === 'Admin' ? 'biru' : 'abu')} onSimpan={(p) => ubah(u, { peran: p }, 'Peran ' + u.nama + ' menjadi ' + p + '.')} /> },
    { kunci: 'orang', judul: 'Orang terkait', lebar: 200, render: (u) => (u.idOrang && data.peta.orang[u.idOrang] ? <Orang nama={data.peta.orang[u.idOrang].NAMA} /> : <span className="samar">—</span>) },
    { kunci: 'status', judul: 'Status', lebar: 120, render: (u) => <EditPilihan value={u.aktif ? 'Ya' : 'Tidak'} opsi={STATUS} label={(s) => (s === 'Ya' ? 'Aktif' : 'Nonaktif')} nada={(s) => (s === 'Ya' ? 'hijau' : 'redup')} disabled={u.id === pengguna.id} onSimpan={(s) => ubah(u, { aktif: s === 'Ya' }, u.nama + (s === 'Ya' ? ' diaktifkan.' : ' dinonaktifkan.'))} /> },
    { kunci: 'masuk', judul: 'Terakhir masuk', lebar: 180, render: (u) => (u.terakhirMasuk ? (
      <div className="dua-baris"><strong className="judul-baris">{tglJam(u.terakhirMasuk)}</strong><small>{waktuRelatif(u.terakhirMasuk)}</small></div>
    ) : <span className="kecil samar">belum pernah</span>) },
    { kunci: 'aksi', judul: '', lebar: 52, tetapKanan: true, kelas: 'kolom-aksi', render: (u) => <MenuTitik items={[
      { label: 'Ubah nama / orang terkait', onClick: () => setModal({ jenis: 'akun', item: u }) },
      { label: 'Atur ulang sandi', onClick: () => setModal({ jenis: 'sandi', item: u }) },
      { label: u.aktif ? 'Nonaktifkan akun' : 'Aktifkan akun', hilang: u.id === pengguna.id,
        onClick: () => ubah(u, { aktif: !u.aktif }, u.nama + (u.aktif ? ' dinonaktifkan.' : ' diaktifkan.')) },
      { garis: true, hilang: u.id === pengguna.id },
      { label: 'Hapus akun', bahaya: true, hilang: u.id === pengguna.id, onClick: () => hapusAkun(u) },
    ]} /> },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [data, pengguna, ubah, hapusAkun]);

  return (
    <div className="halaman">
      <Kepala judul="Pengaturan" sub={admin ? 'Akun Anda dan akun pengguna aplikasi.' : 'Akun Anda.'} />
      <section className="kartu kartu-akun">
        <div className="kartu-kepala"><h2>Akun saya</h2><button type="button" className="tombol" onClick={() => setModal({ jenis: 'sandi' })}><Ikon n="kunci" s={15} />Ganti sandi</button></div>
        <div className="grid-info">
          <Info label="Nama">{pengguna.nama}</Info>
          <Info label="ID masuk">{pengguna.username}</Info>
          <Info label="Peran"><Lencana nada={admin ? 'biru' : 'abu'}>{pengguna.peran}</Lencana></Info>
          <Info label="Orang terkait">{pengguna.idOrang && data.peta.orang[pengguna.idOrang] ? <Orang nama={data.peta.orang[pengguna.idOrang].NAMA} /> : <span className="samar">—</span>}</Info>
        </div>
      </section>
      {admin ? (
        <section className="bagian-akun">
          <div className="kartu-kepala"><h2>Akun pengguna{daftar ? <span className="jumlah">{daftar.length}</span> : null}</h2>
            <button type="button" className="tombol utama" onClick={() => setModal({ jenis: 'akun' })}><Ikon n="tambah" s={15} />Tambah akun</button></div>
          {galat ? <div className="galat-form"><Ikon n="peringatan" s={15} /><span>{galat}</span></div> : null}
          {daftar ? <Tabel id="pengguna" kolom={kolom} baris={daftar} kunci={(u) => u.id} kosong="Belum ada akun." /> : !galat ? <Kosong ikon="orang">Memuat daftar akun…</Kosong> : null}
          <p className="samar kecil catatan-akun">Admin dapat mengatur akun; Staf dapat membaca dan mengubah semua data. Menonaktifkan akun atau mengatur ulang sandi langsung mengakhiri sesi orang tersebut. Bila sandi Admin terlupa, gunakan menu Spreadsheet: Aplikasi Rapat › Atur Admin.</p>
        </section>
      ) : null}
      {modal && modal.jenis === 'akun' ? <FormAkun item={modal.item} data={data} onTutup={tutup} /> : null}
      {modal && modal.jenis === 'sandi' ? <FormSandi item={modal.item} onTutup={tutup} /> : null}
    </div>
  );
}
