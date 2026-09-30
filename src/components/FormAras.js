import React from 'react';
import { gabungOrgan, normNama, pecahOrgan } from '../utils/aras';
import LetakNaskah from './LetakNaskah';

/**
 * Formulir lima aras. Satu baris per aras (urutan Cfg_Aksi):
 *   - chip organ dari daftar pilihan sheet (data validation). Klik untuk
 *     memilih atau melepas; boleh lebih dari satu, urutan klik dipertahankan;
 *   - isian unit atau pejabat.
 * Organ lama yang tidak ada di daftar tetap tampil dan dapat dilepas, tidak
 * dibuang diam-diam.
 * Versi 4.9: kolom letak pasal memakai LetakNaskah (rujukan hidup + letak Statuta 2025).
 */
export default function FormAras({
  aksi, nilai, setNilai, pilihanOrgan, ctx, arasBeda, ringkas, tampilPasal, bolehPasal, bolehAras, idUrusan
}) {
  const ubah = (kode, bagian) => {
    const lama = nilai[kode] || { organ: '', unit: '' };
    setNilai(Object.assign({}, nilai, { [kode]: Object.assign({}, lama, bagian) }));
  };

  const togel = (kode, nama) => {
    const kini = pecahOrgan((nilai[kode] || {}).organ, ctx.pemisah);
    const ada = kini.findIndex((n) => normNama(n) === normNama(nama));
    const baru = ada === -1 ? kini.concat([nama]) : kini.filter((_, i) => i !== ada);
    ubah(kode, { organ: gabungOrgan(baru, ctx.pemisah) });
  };

  return (
    <div className={'form-aras' + (tampilPasal ? ' fa-dengan-pasal' : '')}>
      <div className="fa-kepala">
        <span>Aras</span><span>Organ</span><span>Unit atau pejabat</span>
        {tampilPasal ? <span>Letak di naskah</span> : null}
      </div>
      {aksi.map((a, idx) => {
        const v = nilai[a.kode] || { organ: '', unit: '' };
        const dipilih = pecahOrgan(v.organ, ctx.pemisah);
        const asing = dipilih.filter((n) => !pilihanOrgan.some((p) => normNama(p) === normNama(n)));
        const kosong = dipilih.length === 0;
        return (
          <div key={a.kode} className={'fa-baris' + (kosong ? ' fa-kosong' : '')}>
            <div className="fa-aras">
              <span className="fa-no">{idx + 1}</span>
              <span>{a.nama}</span>
              {arasBeda && arasBeda.has(a.kode) ? <span className="fa-beda" title="Berbeda dari Statuta 2025">beda</span> : null}
            </div>
            <div className="fa-organ">
              {pilihanOrgan.map((nama) => {
                const o = ctx.idxNama[normNama(nama)];
                const pos = dipilih.findIndex((n) => normNama(n) === normNama(nama));
                const aktif = pos !== -1;
                return (
                  <button key={nama} type="button"
                          className={'fa-chip' + (aktif ? ' aktif' : '')}
                          style={aktif && o ? { background: o.warnaLatar, color: o.warnaTeks, borderColor: o.warnaLatar }
                                            : o ? { borderColor: o.warnaLatar, color: o.warnaLatar } : undefined}
                          onClick={() => { if (bolehAras !== false) togel(a.kode, nama); }}
                          disabled={bolehAras === false}
                          aria-pressed={aktif}
                          title={aktif ? 'Klik untuk melepas' : 'Klik untuk memilih'}>
                    {aktif && dipilih.length > 1 ? <span className="fa-urut">{pos + 1}</span> : null}
                    {o ? (ringkas ? o.kode : o.nama) : nama}
                  </button>
                );
              })}
              {asing.map((nama) => (
                <button key={'x' + nama} type="button" className="fa-chip fa-chip-asing aktif"
                        onClick={() => togel(a.kode, nama)}
                        title="Nilai lama di luar daftar pilihan sheet. Klik untuk melepas.">
                  {nama} ×
                </button>
              ))}
              {kosong ? <span className="fa-awas">wajib diisi</span> : null}
            </div>
            <textarea className="inp fa-unit" rows={2} value={v.unit || ''}
                      placeholder="Unit atau pejabat, mis. Program Studi; Wakil Rektor I"
                      readOnly={bolehAras === false}
                      onChange={(e) => ubah(a.kode, { unit: e.target.value })} />
            {tampilPasal ? (
              <LetakNaskah nilai={v.pasal || ''} boleh={!!bolehPasal} idUrusan={idUrusan}
                           onUbah={(teks) => ubah(a.kode, { pasal: teks })} />
            ) : null}
          </div>
        );
      })}
      <p className="grid-bantuan">
        Pilih organ pada setiap aras; dua organ boleh dipilih bila kewenangannya berbagi (urutan klik menjadi urutan
        penulisan). Pilihan organ mengikuti data validation sheet. Perubahan tersimpan sendiri.
      </p>
    </div>
  );
}
