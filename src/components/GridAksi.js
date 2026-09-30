import React from 'react';
import { klikSel, kunci } from '../utils/langkah';

/**
 * Grid organ x aksi. Klik sel kosong = jadi langkah berikutnya.
 * Klik sel terisi = dihapus, sisanya dinomori ulang.
 * Baris dan kolom dibangun dari Cfg_Organ dan Cfg_Aksi.
 *
 * PERUBAHAN VERSI 2: tidak semua kombinasi organ x aksi punya kolom pada sheet
 * rancangan. Contohnya Pembina Yayasan hanya memiliki satu kewenangan.
 * Sel tanpa kolom kini dimatikan dan diberi tanda, supaya tidak ada klik yang
 * tersimpan lalu hilang tanpa jejak saat disimpan ke Spreadsheet.
 */
export default function GridAksi({ organ, aksi, steps, setSteps, terkunci, kombinasi }) {
  const punyaKolom = (kodeOrgan, kodeAksi) => {
    if (!kombinasi) return true; // tanpa informasi, jangan membatasi apa pun
    return kombinasi.has(kodeOrgan + '|' + kodeAksi);
  };

  const tekan = (kodeOrgan, kodeAksi) => {
    if (terkunci) return;
    if (!punyaKolom(kodeOrgan, kodeAksi)) return;
    setSteps(klikSel(steps, kunci(kodeOrgan, kodeAksi)));
  };

  // Langkah tersimpan yang organ atau aksinya tidak lagi dikenal konfigurasi.
  const kodeOrgan = new Set(organ.map((o) => o.kode));
  const kodeAksi = new Set(aksi.map((a) => a.kode));
  const yatim = Object.keys(steps || {}).filter((k) => {
    if (typeof steps[k] !== 'number') return false;
    const [o, a] = String(k).split('|');
    return !kodeOrgan.has(o) || !kodeAksi.has(a);
  });

  return (
    <div className="grid-wrap">
      <table className="grid">
        <thead>
          <tr>
            <th className="grid-sudut">ORGAN</th>
            {aksi.map((a) => <th key={a.kode} className="grid-h">{a.nama}</th>)}
          </tr>
        </thead>
        <tbody>
          {organ.map((o) => (
            <tr key={o.kode}>
              <th className="grid-organ" style={{ background: o.warnaLatar, color: o.warnaTeks }}>
                {o.nama}
              </th>
              {aksi.map((a) => {
                const k = kunci(o.kode, a.kode);
                const nomor = steps[k];
                const terisi = typeof nomor === 'number';
                const tersedia = punyaKolom(o.kode, a.kode);

                if (!tersedia) {
                  return (
                    <td key={a.kode} className="grid-td">
                      <div
                        className="grid-sel tanpa-kolom"
                        title={o.nama + ' tidak memiliki kewenangan ' + a.nama.toLowerCase() + ' pada rancangan ini'}
                        aria-label={o.nama + ' ' + a.nama + ' tidak tersedia'}
                      >
                        ·
                      </div>
                    </td>
                  );
                }

                return (
                  <td key={a.kode} className="grid-td">
                    <button
                      type="button"
                      className={'grid-sel' + (terisi ? ' aktif' : '') + (terkunci ? ' mati' : '')}
                      style={terisi ? { background: o.warnaLatar, color: o.warnaTeks, borderColor: o.warnaLatar } : undefined}
                      onClick={() => tekan(o.kode, a.kode)}
                      disabled={terkunci}
                      aria-label={o.nama + ' ' + a.nama + (terisi ? ' langkah ' + nomor : ' kosong')}
                    >
                      {terisi ? nomor : ''}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {yatim.length ? (
        <p className="grid-bantuan grid-bantuan-awas">
          {yatim.length} langkah tersimpan memakai organ atau aksi yang tidak ada pada konfigurasi
          sekarang ({yatim.join(', ')}). Nilainya tetap dipertahankan di Spreadsheet dan tidak akan
          terhapus, tetapi tidak dapat disunting dari halaman ini.
        </p>
      ) : null}

      {!terkunci ? (
        <p className="grid-bantuan">
          Klik kotak kosong untuk menjadikannya langkah berikutnya. Klik kotak berangka untuk menghapusnya —
          nomor sisanya menyesuaikan sendiri. Kotak bertanda titik berarti organ tersebut tidak memiliki
          kewenangan itu pada rancangan.
        </p>
      ) : null}
    </div>
  );
}
