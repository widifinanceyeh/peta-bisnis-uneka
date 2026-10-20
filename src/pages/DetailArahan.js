import React from 'react';
import { useApp } from '../konteks';
import { Panel } from '../components/Modal';
import { Lencana, Bagian, DaftarTautan, Info, Kosong, Orang } from '../components/Dasar';
import { MenuTitik } from '../components/Pilih';
import { aksiArahan, nadaSifat } from './Arahan';
import { DaftarTlRingkas } from './DetailTL';
import { tglPanjang, tgl, tglJam } from '../utils/format';
import { tautan, nadaTahap, nadaStatusArahan, unitList, opsi } from '../utils/data';
import { EditPilihan } from '../components/EditSel';
import Riwayat from '../components/Riwayat';

export default function DetailArahan({ id }) {
  const app = useApp();
  const { data, tutupPanel, buka, bukaForm, tulis } = app;
  const a = data.peta.arahan[id];
  if (!a) return <Panel onTutup={tutupPanel} kepala={<h2>Tidak ditemukan</h2>}><Kosong>Arahan ini tidak ada atau sudah dihapus.</Kosong></Panel>;
  const isu = a.ID_ISU_LIST.map((i) => data.peta.isu[i]).filter(Boolean);
  const tl = data.tindakLanjut.filter((t) => t.ID_ARAHAN_ASAL === id);
  const dok = tautan(data, 'Arahan', id);
  const akt = aksiArahan(app, a);
  return (
    <Panel onTutup={tutupPanel}
      kepala={<><small className="panel-label">Arahan · {a.LEMBAGA || '—'} {a.SIFAT ? <Lencana kecil nada={nadaSifat(a.SIFAT)}>{a.SIFAT}</Lencana> : null}</small><h2 className="judul-arahan">{a.ISI_ARAHAN}</h2><p className="panel-sub">{tglPanjang(a.TANGGAL)} · {a.FORUM || '—'}</p></>}
      aksi={<>
        <button type="button" className="tombol utama" onClick={akt[1].onClick}>Buat tindak lanjut</button>
        <button type="button" className="tombol" onClick={() => bukaForm('arahan', { item: a })}>Edit</button>
        <MenuTitik items={akt.slice(3)} />
      </>}>
      <div className="grid-info">
        <Info label="Pemberi"><Orang nama={a.PEMBERI_ARAHAN} /></Info>
        <Info label="Ditujukan kepada">{unitList(a.UNIT_TUJUAN).length ? unitList(a.UNIT_TUJUAN).join(', ') : <span className="samar">—</span>}</Info>
        <Info label="Pencatat"><Orang nama={a.PENCATAT} /></Info>
        <Info label="Status">
          <EditPilihan value={a.STATUS || 'Belum ditindaklanjuti'} opsi={opsi(data, 'STATUS_ARAHAN')} nada={nadaStatusArahan}
            onSimpan={(v) => tulis('updateArahan', { id: a.ID_ARAHAN, status: v }, { sukses: 'Status arahan diperbarui.' })} />
        </Info>
        {a.TANGGAL_TARGET ? <Info label="Target selesai">{tgl(a.TANGGAL_TARGET)}</Info> : null}
        {a.PERLU_DIFORMALKAN === 'Ya' ? <Info label="Perlu diformalkan"><Lencana nada="kuning">Ya</Lencana></Info> : null}
      </div>
      {a.CATATAN ? <div className="narasi"><div><h4>Catatan</h4><p>{a.CATATAN}</p></div></div> : null}
      <Bagian judul="Pokok bahasan terkait" jumlah={isu.length}>
        {isu.length ? (
          <ul className="daftar-ringkas">
            {isu.map((i) => <li key={i.ID_ISU}><button type="button" className="baris-daftar" onClick={() => buka('pokok', i.ID_ISU)}><span className="potong">{i.JUDUL}</span><Lencana kecil nada={nadaTahap(i.STATUS_ISU)}>{i.STATUS_ISU}</Lencana></button></li>)}
          </ul>
        ) : <Kosong ikon="pokok">Berdiri sendiri; dapat dikaitkan lewat Edit.</Kosong>}
      </Bagian>
      <Bagian judul="Tindak lanjut" jumlah={tl.length}>{tl.length ? <DaftarTlRingkas list={tl} /> : <Kosong ikon="tl">Belum ada tindak lanjut dari arahan ini.</Kosong>}</Bagian>
      {dok.length ? <Bagian judul="Dokumen" jumlah={dok.length}><DaftarTautan list={dok} /></Bagian> : null}
      <Riwayat jenis="Arahan" id={a.ID_ARAHAN} />
      <p className="kaki-panel samar">Kode: {a.ID_ARAHAN} · dicatat {tgl(a.TANGGAL_DIBUAT)}{a.DIBUAT_OLEH ? ' oleh ' + a.DIBUAT_OLEH : ''}{a.DIUBAH_OLEH ? ' · diperbarui ' + tglJam(a.TANGGAL_UPDATE) + ' oleh ' + a.DIUBAH_OLEH : ''}</p>
    </Panel>
  );
}
