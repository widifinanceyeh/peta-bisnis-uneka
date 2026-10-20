import React from 'react';
import { useApp } from '../konteks';
import { Panel } from '../components/Modal';
import { Lencana, Bagian, DaftarTautan, Info, Kosong } from '../components/Dasar';
import { MenuTitik } from '../components/Pilih';
import { EditPilihan, EditOrang } from '../components/EditSel';
import { aksiPokok } from './PokokBahasan';
import { DaftarTlRingkas } from './DetailTL';
import { tgl, tglJam, kunciTanggal, rentangJam } from '../utils/format';
import Riwayat from '../components/Riwayat';
import { nadaTahap, nadaPrioritas, nadaPembahasan, opsi, opsiOrang, TAHAP_OTOMATIS, TAHAP_ARSIP, agendaPokok, arahanPokok, tlPokok, dokumenPokok } from '../utils/data';

export default function DetailPokok({ id }) {
  const app = useApp();
  const { data, tutupPanel, buka, bukaForm, tulis } = app;
  const x = data.peta.isu[id];
  if (!x) return <Panel onTutup={tutupPanel} kepala={<h2>Tidak ditemukan</h2>}><Kosong>Pokok bahasan ini tidak ada atau sudah dihapus.</Kosong></Panel>;

  const riwayat = [];
  arahanPokok(data, id).forEach((a) => riwayat.push({ k: kunciTanggal(a.TANGGAL), jenis: 'arahan', a }));
  agendaPokok(data, id).forEach((ag) => { const r = data.peta.rapat[ag.ID_RAPAT]; if (r) riwayat.push({ k: kunciTanggal(r.TANGGAL), jenis: 'rapat', ag, r }); });
  riwayat.sort((a, b) => (b.k || '').localeCompare(a.k || ''));
  const tl = tlPokok(data, id);
  const dok = dokumenPokok(data, id);
  const tahapManual = opsi(data, 'STATUS_ISU').filter((t) => TAHAP_OTOMATIS.indexOf(t) === -1);
  const ubah = (field, v) => tulis('updateIsu', { id, [field]: v });
  const narasi = [['Latar belakang', x.RINGKASAN], ['Tujuan pembahasan', x.TUJUAN_PEMBAHASAN], ['Hal yang perlu diputuskan', x.PERTANYAAN_KEPUTUSAN], ['Catatan persiapan', x.CATATAN_PERSIAPAN], ['Catatan internal', x.CATATAN]].filter((n) => n[1]);

  return (
    <Panel onTutup={tutupPanel}
      kepala={<><small className="panel-label">Pokok bahasan · {x.KATEGORI || 'tanpa kategori'}</small><h2>{x.JUDUL}</h2></>}
      aksi={<>
        {TAHAP_ARSIP.indexOf(x.STATUS_ISU) === -1 ? <button type="button" className="tombol utama" onClick={() => bukaForm('rapat', { agendaAwal: [id] })}>Jadwalkan rapat</button> : null}
        <button type="button" className="tombol" onClick={() => bukaForm('tl', { awal: { idIsu: id, judul: x.JUDUL } })}>Tindak lanjut</button>
        <button type="button" className="tombol" onClick={() => bukaForm('pokok', { item: x })}>Edit</button>
        <MenuTitik items={aksiPokok(app, x).filter((a) => ['Lihat rincian', 'Edit', 'Jadwalkan rapat', 'Tambah tindak lanjut'].indexOf(a.label) === -1)} />
      </>}>
      <div className="grid-info">
        <Info label="Tahap"><EditPilihan value={x.STATUS_ISU} opsi={tahapManual} nada={nadaTahap} onSimpan={(v) => ubah('statusIsu', v)} /></Info>
        <Info label="Prioritas"><EditPilihan value={x.PRIORITAS} opsi={opsi(data, 'PRIORITAS')} nada={nadaPrioritas} onSimpan={(v) => ubah('prioritas', v)} /></Info>
        <Info label="PIC"><EditOrang value={x.PIC_UTAMA} opsi={opsiOrang(data)} onSimpan={(v) => ubah('picUtama', v)} /></Info>
        <Info label="Muncul">{tgl(x.TANGGAL_MUNCUL)}</Info>
        {x.PENGUSUL ? <Info label="Pengusul">{x.PENGUSUL}</Info> : null}
        {x.UNIT_TERKAIT ? <Info label="Unit terkait">{x.UNIT_TERKAIT}</Info> : null}
      </div>
      {x.PENANDA ? <div className="baris-lencana">{String(x.PENANDA).split(',').map((p) => p.trim()).filter(Boolean).map((p) => <Lencana key={p} nada="pink" kecil>{p}</Lencana>)}</div> : null}
      {narasi.length ? <div className="narasi">{narasi.map((n) => <div key={n[0]}><h4>{n[0]}</h4><p>{n[1]}</p></div>)}</div> : null}

      <Bagian judul="Tindak lanjut" jumlah={tl.length}>
        {tl.length ? <DaftarTlRingkas list={tl} /> : <Kosong ikon="tl">Belum ada tindak lanjut.</Kosong>}
      </Bagian>

      <Bagian judul="Riwayat" jumlah={riwayat.length}>
        {riwayat.length ? (
          <ol className="linimasa">
            {riwayat.map((e, i) => e.jenis === 'arahan' ? (
              <li key={'a' + i}>
                <span className="lm-titik pink" />
                <div className="lm-isi">
                  <div className="lm-kepala"><strong>Arahan</strong><small>{tgl(e.a.TANGGAL)} · {e.a.PEMBERI_ARAHAN ? e.a.PEMBERI_ARAHAN.split(',')[0] : '—'}</small></div>
                  <button type="button" className="lm-teks tautan-teks" onClick={() => buka('arahan', e.a.ID_ARAHAN)}>{e.a.ISI_ARAHAN}</button>
                </div>
              </li>
            ) : (
              <li key={'r' + i}>
                <span className={'lm-titik ' + (e.r.ID_NOTULEN ? 'hijau' : 'biru')} />
                <div className="lm-isi">
                  <div className="lm-kepala">
                    <button type="button" className="tautan-teks" onClick={() => buka('rapat', e.r.ID_RAPAT)}><strong>{e.r.JUDUL_RAPAT}</strong></button>
                    <small>{tgl(e.r.TANGGAL)}{rentangJam(e.r) ? ' · ' + rentangJam(e.r) : ''}</small>
                    {e.r.ID_NOTULEN ? <Lencana kecil nada={nadaPembahasan(e.ag.STATUS_PEMBAHASAN)}>{e.ag.STATUS_PEMBAHASAN || 'Dibahas'}</Lencana> : <Lencana kecil nada="biru">Dijadwalkan</Lencana>}
                  </div>
                  {e.ag.HASIL_KEPUTUSAN ? <p className="lm-teks"><b>Keputusan:</b> {e.ag.HASIL_KEPUTUSAN}</p> : null}
                  {e.ag.RINGKASAN_PEMBAHASAN ? <p className="lm-teks samar">{e.ag.RINGKASAN_PEMBAHASAN}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        ) : <Kosong ikon="rapat">Belum pernah diagendakan atau mendapat arahan.</Kosong>}
      </Bagian>

      <Bagian judul="Dokumen" jumlah={dok.length}>
        <DaftarTautan list={dok} />
      </Bagian>
      <Riwayat jenis="Pokok Bahasan" id={x.ID_ISU} />
      <p className="kaki-panel samar">Kode: {x.ID_ISU}{x.DIBUAT_OLEH ? ' · dibuat oleh ' + x.DIBUAT_OLEH : ''} · diperbarui {tglJam(x.TANGGAL_UPDATE) || tgl(x.TANGGAL_UPDATE)}{x.DIUBAH_OLEH ? ' oleh ' + x.DIUBAH_OLEH : ''}</p>
    </Panel>
  );
}
