import React from 'react';
import { useApp } from '../konteks';
import { Panel } from '../components/Modal';
import { Lencana, Bagian, DaftarTautan, Info, Kosong, Orang } from '../components/Dasar';
import { MenuTitik } from '../components/Pilih';
import { EditPilihan, EditOrang, EditTanggal, EditTeks } from '../components/EditSel';
import { aksiTl, TombolStatus } from './TindakLanjut';
import { tgl, tglJam, tglPendek, kunciTanggal, waktuRelatif } from '../utils/format';
import Riwayat from '../components/Riwayat';
import { BAWAAN, labelStatusTl, nadaStatusTl, opsiOrang, tautan, dokumenPokok, unik } from '../utils/data';

/** Daftar tindak lanjut ringkas (dipakai di panel lain). */
export function DaftarTlRingkas({ list }) {
  const { buka, data } = useApp();
  const urut = list.slice().sort((a, b) => (a.STATUS === 'Selesai') - (b.STATUS === 'Selesai') || (a.TINGKAT || 0) - (b.TINGKAT || 0));
  return (
    <ul className="daftar-tl">
      {urut.map((t) => {
        const k = kunciTanggal(t.TANGGAL_TARGET);
        return (
          <li key={t.ID_TINDAKLANJUT} className={t.STATUS === 'Selesai' ? 'selesai' : ''} style={{ paddingLeft: Math.min(t.TINGKAT || 0, 3) * 16 }}>
            <button type="button" className="baris-daftar" onClick={() => buka('tindak-lanjut', t.ID_TINDAKLANJUT)}>
              <span className={'titik-urgensi u-' + t.URGENSI} />
              <span className="potong">{t.JUDUL}</span>
              <small><Orang nama={t.PIC} kosong="Tanpa PIC" /></small>
              <small className={t.STATUS !== 'Selesai' && k && k < data.hari ? 'teks-merah' : ''}>{k ? tglPendek(k) : ''}</small>
              <Lencana kecil nada={nadaStatusTl(t.STATUS)}>{labelStatusTl(t.STATUS)}</Lencana>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export default function DetailTL({ id }) {
  const app = useApp();
  const { data, tutupPanel, buka, bukaForm, tulis } = app;
  const t = data.peta.tl[id];
  if (!t) return <Panel onTutup={tutupPanel} kepala={<h2>Tidak ditemukan</h2>}><Kosong>Tindak lanjut ini tidak ada atau sudah dihapus.</Kosong></Panel>;
  const isu = data.peta.isu[t.ID_ISU];
  const notulen = data.peta.notulen[t.ID_NOTULEN];
  const rapat = notulen && data.peta.rapat[notulen.ID_RAPAT];
  const arahan = data.peta.arahan[t.ID_ARAHAN_ASAL];
  const induk = data.peta.tl[t.ID_INDUK];
  const turunan = data.tindakLanjut.filter((x) => x.ID_INDUK === id);
  const terkait = String(t.TERKAIT_DENGAN || '').split(',').map((s) => s.trim()).filter(Boolean).map((k) => data.peta.tl[k]).filter(Boolean);
  const milik = tautan(data, 'Tindak Lanjut', id, t.LINK_DOKUMEN, 'Dokumen/output');
  const warisan = unik((isu ? dokumenPokok(data, isu.ID_ISU) : []).concat(notulen ? tautan(data, 'Notulen', notulen.ID_NOTULEN, notulen.LINK_DOKUMEN, 'Notulen') : []))
    .filter((l) => !milik.some((m) => m.url === l.url));
  const ubah = (field, v) => tulis('updateTindakLanjut', { id, [field]: v });

  return (
    <Panel onTutup={tutupPanel}
      kepala={<><small className="panel-label">Tindak lanjut{induk ? ' · turunan' : ''}</small><h2>{t.JUDUL}</h2></>}
      aksi={<>
        <TombolStatus t={t} />
        <button type="button" className="tombol" onClick={() => bukaForm('tl', { item: t })}>Edit</button>
        <button type="button" className="tombol" onClick={() => bukaForm('tl', { awal: { idInduk: id, idNotulen: t.ID_NOTULEN, idArahanAsal: t.ID_ARAHAN_ASAL, idIsu: t.ID_ISU } })}>Turunan</button>
        <MenuTitik items={aksiTl(app, t).filter((a) => ['Lihat rincian', 'Edit', 'Tambah turunan', 'Catat progres'].indexOf(a.label) === -1)} />
      </>}>
      <div className="grid-info">
        <Info label="Status"><EditPilihan value={t.STATUS} opsi={BAWAAN.STATUS_TL.map((s) => ({ value: s, label: labelStatusTl(s) }))} label={labelStatusTl} nada={nadaStatusTl} onSimpan={(v) => tulis('updateStatus', { id, status: v })} /></Info>
        <Info label="PIC"><EditOrang value={t.PIC} opsi={opsiOrang(data)} onSimpan={(v) => ubah('pic', v)} /></Info>
        <Info label="Target"><EditTanggal value={t.TANGGAL_TARGET} nada={t.URGENSI === 'merah' && t.STATUS !== 'Selesai' ? 'merah' : ''} onSimpan={(v) => ubah('tanggalTarget', v)} /></Info>
        <Info label="Diperbarui">{waktuRelatif(t.TANGGAL_UPDATE_TERAKHIR) || '—'}</Info>
      </div>
      {t.PENANDA ? <div className="baris-lencana">{String(t.PENANDA).split(',').map((p) => p.trim()).filter(Boolean).map((p) => <Lencana key={p} nada="pink" kecil>{p}</Lencana>)}</div> : null}

      <Bagian judul="Progres terakhir">
        <EditTeks value={t.PROGRES_TERAKHIR} onSimpan={(v) => ubah('progresTerakhir', v)} placeholder="Tulis perkembangan terbaru. Tersimpan otomatis." />
      </Bagian>
      {t.CATATAN ? <div className="narasi"><div><h4>Deskripsi pekerjaan</h4><p>{t.CATATAN}</p></div></div> : null}

      <Bagian judul="Asal & kaitan">
        <ul className="daftar-kaitan">
          {isu ? <li><span>Pokok bahasan</span><button type="button" className="tautan-teks" onClick={() => buka('pokok', isu.ID_ISU)}>{isu.JUDUL}</button></li> : null}
          {notulen ? <li><span>Hasil rapat</span><button type="button" className="tautan-teks" onClick={() => buka('rapat', rapat ? rapat.ID_RAPAT : notulen.ID_NOTULEN)}>{notulen.JUDUL} · {tgl(notulen.TANGGAL)}</button></li> : null}
          {arahan ? <li><span>Arahan</span><button type="button" className="tautan-teks" onClick={() => buka('arahan', arahan.ID_ARAHAN)}>{arahan.ISI_ARAHAN}</button></li> : null}
          {induk ? <li><span>Induk</span><button type="button" className="tautan-teks" onClick={() => buka('tindak-lanjut', induk.ID_TINDAKLANJUT)}>{induk.JUDUL}</button></li> : null}
          {terkait.map((k) => <li key={k.ID_TINDAKLANJUT}><span>Terkait</span><button type="button" className="tautan-teks" onClick={() => buka('tindak-lanjut', k.ID_TINDAKLANJUT)}>{k.JUDUL}</button></li>)}
          {!isu && !notulen && !arahan && !induk && !terkait.length ? <li className="samar">Berdiri sendiri.</li> : null}
        </ul>
      </Bagian>

      {turunan.length ? <Bagian judul="Turunan" jumlah={turunan.length}><DaftarTlRingkas list={turunan} /></Bagian> : null}

      <Bagian judul="Dokumen / output" jumlah={milik.length}><DaftarTautan list={milik} kosong="Belum ada dokumen khusus tindak lanjut ini." /></Bagian>
      {warisan.length ? <Bagian judul="Dokumen pembahasan terkait" jumlah={warisan.length}><DaftarTautan list={warisan} /></Bagian> : null}
      <Riwayat jenis="Tindak Lanjut" id={t.ID_TINDAKLANJUT} />
      <p className="kaki-panel samar">Kode: {t.ID_TINDAKLANJUT} · dibuat {tgl(t.TANGGAL_DIBUAT)}{t.DIBUAT_OLEH ? ' oleh ' + t.DIBUAT_OLEH : ''}{t.DIUBAH_OLEH ? ' · diperbarui ' + tglJam(t.TANGGAL_UPDATE_TERAKHIR) + ' oleh ' + t.DIUBAH_OLEH : ''}</p>
    </Panel>
  );
}
