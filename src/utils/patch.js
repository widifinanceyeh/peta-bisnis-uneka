// Perubahan optimistik: tampil di layar sebelum server menjawab.
const PETA = {
  isu: { judul: 'JUDUL', ringkasan: 'RINGKASAN', kategori: 'KATEGORI', statusIsu: 'STATUS_ISU', prioritas: 'PRIORITAS', picUtama: 'PIC_UTAMA', tanggalMuncul: 'TANGGAL_MUNCUL', catatan: 'CATATAN', jenisPokok: 'JENIS_POKOK', pengusul: 'PENGUSUL', unitTerkait: 'UNIT_TERKAIT', tujuanPembahasan: 'TUJUAN_PEMBAHASAN', pertanyaanKeputusan: 'PERTANYAAN_KEPUTUSAN', catatanPersiapan: 'CATATAN_PERSIAPAN', penanda: 'PENANDA' },
  tindakLanjut: { judul: 'JUDUL', catatan: 'CATATAN', progresTerakhir: 'PROGRES_TERAKHIR', pic: 'PIC', status: 'STATUS', tanggalTarget: 'TANGGAL_TARGET', idInduk: 'ID_INDUK', penanda: 'PENANDA', terkaitDengan: 'TERKAIT_DENGAN', idIsu: 'ID_ISU', idNotulen: 'ID_NOTULEN', idArahanAsal: 'ID_ARAHAN_ASAL', jenisHasil: 'JENIS_HASIL' },
  rapat: { judulRapat: 'JUDUL_RAPAT', tanggal: 'TANGGAL', jenisRapat: 'JENIS_RAPAT', jamMulai: 'JAM_MULAI', jamSelesai: 'JAM_SELESAI', status: 'STATUS', catatan: 'CATATAN', idPimpinan: 'ID_PIMPINAN', idNotulis: 'ID_NOTULIS', idPeserta: 'ID_PESERTA', mode: 'MODE', tempat: 'TEMPAT', tautanRapat: 'TAUTAN_RAPAT' },
  arahan: { tanggal: 'TANGGAL', lembaga: 'LEMBAGA', forum: 'FORUM', unitTujuan: 'UNIT_TUJUAN', isiArahan: 'ISI_ARAHAN', sifat: 'SIFAT', catatan: 'CATATAN', status: 'STATUS', perluDiformalkan: 'PERLU_DIFORMALKAN', tindakLanjutRingkas: 'TINDAK_LANJUT_RINGKAS', tanggalTarget: 'TANGGAL_TARGET' },
  notulen: { tanggal: 'TANGGAL', judul: 'JUDUL', unitPeserta: 'UNIT_PESERTA', catatan: 'CATATAN', idRapat: 'ID_RAPAT' },
  tautanDokumen: { judul: 'JUDUL_TAUTAN', jenisDokumen: 'JENIS_DOKUMEN', jenisBerkas: 'JENIS_BERKAS' },
};
const ID = { isu: 'ID_ISU', tindakLanjut: 'ID_TINDAKLANJUT', rapat: 'ID_RAPAT', arahan: 'ID_ARAHAN', notulen: 'ID_NOTULEN', tautanDokumen: 'ID_TAUTAN' };
const JENIS_TAUTAN = { isu: 'Pokok Bahasan', tindakLanjut: 'Tindak Lanjut', rapat: 'Rapat', arahan: 'Arahan', notulen: 'Notulen' };
const AKSI = {
  addIsu: ['isu', 'tambah'], updateIsu: ['isu', 'ubah'], deleteIsu: ['isu', 'hapus'],
  addTindakLanjut: ['tindakLanjut', 'tambah'], updateTindakLanjut: ['tindakLanjut', 'ubah'], deleteTindakLanjut: ['tindakLanjut', 'hapus'],
  addRapat: ['rapat', 'tambah'], updateRapat: ['rapat', 'ubah'], deleteRapat: ['rapat', 'hapus'],
  addArahan: ['arahan', 'tambah'], updateArahan: ['arahan', 'ubah'], deleteArahan: ['arahan', 'hapus'],
  updateNotulen: ['notulen', 'ubah'], deleteNotulen: ['notulen', 'hapus'],
  ubahTautan: ['tautanDokumen', 'ubah'],
};

function kolom(koleksi, payload) {
  const f = {};
  Object.keys(payload || {}).forEach((k) => {
    const c = PETA[koleksi][k];
    if (c && payload[k] !== undefined) f[c] = Array.isArray(payload[k]) ? payload[k].join(c === 'UNIT_TUJUAN' || c === 'UNIT_TERKAIT' ? ' | ' : ', ') : payload[k];
  });
  return f;
}
function gantiTautan(raw, koleksi, id, list) {
  const jenis = JENIS_TAUTAN[koleksi];
  const sisa = (raw.tautanDokumen || []).filter((t) => !(t.JENIS_ENTITAS === jenis && t.ID_ENTITAS === id));
  const baru = (list || []).filter((l) => l && l.url).map((l, i) => ({ ID_TAUTAN: 'BARU-' + id + '-' + i, JENIS_ENTITAS: jenis, ID_ENTITAS: id, JUDUL_TAUTAN: l.judul, URL: l.url, JENIS_DOKUMEN: l.jenisDokumen, JENIS_BERKAS: l.jenisBerkas || '', CATATAN: l.catatan || '' }));
  return sisa.concat(baru);
}

/** Terapkan satu operasi tulis pada data mentah. idSementara dipakai untuk baris baru. */
export function terapkan(raw, op) {
  const { action, payload, idSementara } = op;
  const out = Object.assign({}, raw);
  if (action === 'updateStatus') {
    out.tindakLanjut = raw.tindakLanjut.map((t) => (t.ID_TINDAKLANJUT === payload.id ? Object.assign({}, t, { STATUS: payload.status }) : t));
    return out;
  }
  if (/^bulkUpdate/.test(action)) {
    const koleksi = action === 'bulkUpdateRapat' ? 'rapat' : action === 'bulkUpdatePokokBahasan' ? 'isu' : 'tindakLanjut';
    const p = Object.assign({}, payload); delete p.ids; delete p.penandaMode;
    if (koleksi === 'tindakLanjut' && p.penanda) delete p.penanda; // mode tambah/hapus: tunggu server
    const f = kolom(koleksi, p);
    const ids = payload.ids || [];
    out[koleksi] = raw[koleksi].map((x) => (ids.indexOf(x[ID[koleksi]]) !== -1 ? Object.assign({}, x, f) : x));
    return out;
  }
  const def = AKSI[action];
  if (!def) return raw;
  const [koleksi, jenis] = def;
  const idK = ID[koleksi];
  if (jenis === 'hapus') {
    out[koleksi] = raw[koleksi].filter((x) => x[idK] !== payload.id);
    return out;
  }
  if (jenis === 'ubah') {
    const f = kolom(koleksi, payload);
    out[koleksi] = raw[koleksi].map((x) => (x[idK] === payload.id ? Object.assign({}, x, f) : x));
    if (payload.tautan !== undefined) out.tautanDokumen = gantiTautan(raw, koleksi, payload.id, payload.tautan);
    if (koleksi === 'arahan' && payload.idIsuList) {
      out.itemArahan = raw.itemArahan.filter((r) => r.ID_ARAHAN !== payload.id)
        .concat(payload.idIsuList.map((i) => ({ ID_ITEM_ARAHAN: 'BARU', ID_ARAHAN: payload.id, ID_ISU: i })));
    }
    return out;
  }
  // tambah — bila server sudah mengirim baris aslinya, tidak ditambah lagi
  if (op.idAsli && raw[koleksi].some((x) => x[idK] === op.idAsli)) return raw;
  const idBaru = op.idAsli || idSementara;
  const baris = Object.assign({ [idK]: idBaru, _baru: !op.idAsli }, kolom(koleksi, payload));
  if (koleksi === 'tindakLanjut' && !baris.STATUS) baris.STATUS = 'Belum Dimulai';
  if (koleksi === 'isu' && !baris.STATUS_ISU) baris.STATUS_ISU = 'Isu Awal';
  if (koleksi === 'rapat' && !baris.STATUS) baris.STATUS = 'Dijadwalkan';
  if (koleksi === 'arahan') {
    baris.PEMBERI_ARAHAN = payload.pemberiNama || '';
    if (payload.idIsuList) out.itemArahan = raw.itemArahan.concat(payload.idIsuList.map((i) => ({ ID_ITEM_ARAHAN: 'BARU', ID_ARAHAN: idBaru, ID_ISU: i })));
  }
  baris.TANGGAL_DIBUAT = new Date().toISOString();
  out[koleksi] = raw[koleksi].concat([baris]);
  if (payload.tautan) out.tautanDokumen = gantiTautan(raw, koleksi, idBaru, payload.tautan);
  return out;
}
