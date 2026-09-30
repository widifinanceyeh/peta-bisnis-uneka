import { samaPersis, urutkan } from './langkah';
import { terkunciMonev } from './monev';
import { bandingUrusan, kodeInduk, lengkap, organDiRancangan, tetap } from './aras';

export const FILTER_KOSONG = {
  cari: '', bidang: '', muatan: '', status: '', perubahan: '', monev: '', organ: '',
  statusBahasan: '', penuangan: '', lengkap: '', kelompok: '', jenis: ''
};

/**
 * Menyaring daftar urusan. Dipakai halaman peta untuk menampilkan tabel, dan
 * dipakai halaman rincian untuk menentukan urusan sebelum dan sesudahnya,
 * sehingga tombol pindah mengikuti penyaring yang sedang aktif.
 *
 * Versi 4: bila `ctx` (konteks format ARAS) diberikan, keadaan perubahan
 * dihitung per aras lewat bandingUrusan, dan tiga penyaring baru aktif:
 * status bahasan, penuangan, dan kelengkapan.
 * Versi 4.2: penyaring kelompok Permen 16/2018 (A, A1, ...) dan jenis baris
 * (ALUR = alur kewenangan, TETAP = muatan tetap). Penyaring kelengkapan dan
 * keadaan perubahan hanya berlaku untuk urusan alur kewenangan.
 */
export function saringUrusan(urusan, filter, mode, organSorot, ctx) {
  const f = Object.assign({}, FILTER_KOSONG, filter || {});
  const cari = String(f.cari || '').trim().toLowerCase();
  const m = String(mode || 'SEMUA').toUpperCase();

  return (urusan || []).filter((u) => {
    if (m === 'HANYA_SOROT' && organSorot) {
      const diLama = urutkan(u.lama).some((s) => s.organ === organSorot);
      const diBaru = ctx ? organDiRancangan(u, organSorot, ctx) : urutkan(u.baru).some((s) => s.organ === organSorot);
      if (!diLama && !diBaru) return false;
    }
    if (m === 'TIDAK_DIATUR' && urutkan(u.lama).length > 0) return false;

    if (f.bidang && String(u.bidang || '').trim() !== f.bidang) return false;
    if (f.kelompok) {
      const k = String(u.kelompok || '');
      if (f.kelompok.length === 1 ? kodeInduk(k) !== f.kelompok : k !== f.kelompok) return false;
    }
    if (f.jenis === 'TETAP' && !tetap(u)) return false;
    if (f.jenis === 'ALUR' && tetap(u)) return false;
    if (f.muatan && String(u.muatan || '').trim() !== f.muatan) return false;
    if (f.status && String(u.status || '').trim() !== f.status) return false;
    if (f.monev && !terkunciMonev(u.monev)) return false;
    if (f.statusBahasan && String(u.statusBahasan || '').trim() !== f.statusBahasan) return false;
    if (f.penuangan && String(u.penuangan || '').trim() !== f.penuangan) return false;
    if (ctx && f.lengkap) {
      const ok = lengkap(u, ctx);
      if (f.lengkap === 'YA' && !ok) return false;
      if (f.lengkap === 'TIDAK' && ok) return false;
    }

    if (f.perubahan) {
      if (ctx) {
        const b = bandingUrusan(u, ctx);
        if (f.perubahan === 'BELUM' && b !== 'KOSONG') return false;
        if (f.perubahan === 'BERUBAH' && b !== 'BEDA') return false;
        if (f.perubahan === 'SAMA' && b !== 'SAMA') return false;
        if (f.perubahan === 'TAMBAHAN' && u.adaDiSumber !== false) return false;
        if (f.perubahan === '2025' && b !== 'DIHENTIKAN') return false;
      } else {
        const ada = urutkan(u.baru).length > 0;
        if (f.perubahan === 'BELUM' && ada) return false;
        if (f.perubahan === 'BERUBAH' && (!ada || samaPersis(u.lama, u.baru))) return false;
        if (f.perubahan === 'SAMA' && (!ada || !samaPersis(u.lama, u.baru))) return false;
        if (f.perubahan === 'TAMBAHAN' && u.adaDiSumber !== false) return false;
      }
    }

    if (cari) {
      const bagianAras = u.aras
        ? Object.keys(u.aras).map((k) => (u.aras[k].organ || '') + ' ' + (u.aras[k].unit || '') + ' ' + (u.aras[k].pasal || '')).join(' ')
        : '';
      const ladang = [u.urusan, u.bidang, u.butir, u.pasal, u.pasalBaru, u.produk, u.arahan, u.dasarMuatan, bagianAras]
        .map((v) => String(v || '').toLowerCase()).join(' ');
      if (ladang.indexOf(cari) === -1) return false;
    }
    return true;
  });
}
