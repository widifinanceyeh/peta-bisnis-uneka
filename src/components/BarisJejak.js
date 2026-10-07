import React, { useCallback, useEffect, useRef, useState } from 'react';
import TeksBeda from './TeksBeda';
import KotakRedaksi from './KotakRedaksi';
import LencanaMonev from './LencanaMonev';
import { simpanJejak } from '../naskah';
import { labelAyatLama, namaPasal, adaPasal } from '../utils/rujukan';
import { potongSorotan } from '../utils/telaah';
import { pecahRujukan } from '../utils/rujukanHukum';
import { STORAGE_KEY } from '../config';
import { bacaDraf, tulisDraf, hapusDraf } from '../hooks/useDraf';

/**
 * Satu baris naskah (v5.1): ayat Statuta 2025 · jejak · ayat rancangan 2026 · dasar perubahan ayat.
 * Mode rapat menyembunyikan dua kolom pertama (lewat CSS). Di bawah bunyi ayat 2025 tampil pita peta 2025;
 * di bawah bunyi ayat 2026 tampil usulan redaksi, penanda Monev, rujukan silang patah, dugaan ayat mirip,
 * sorotan tugas YEH/UNEKA, dan pita peta 2026.
 * Panel sunting jejak dan penulisan usulan redaksi hanya pada Mode kerja.
 * v5.16: ayat yang dipindah ke pasal lain tampil sebagai kartu bayangan ungu di pasal asal (bukan lagi bagian
 * pasal itu); di pasal tujuan ayat tampil biasa dengan penanda hijau asalnya. Penentunya letak pasangan, bukan status.
 */
export default function BarisJejak({
  baris, pasal, cfg, init, sorot, terbuka, onBuka, onTutup, onPilihPasal, onGalat,
  pertama, dasar, penanda, pita, pitaKiri, warna, bisaSunting, redaksi, onDh
}) {
  const { jejak, kiri, kanan } = baris;
  const warnaSt = warnaStatus(cfg, jejak ? jejak.status : '');
  const wajib = jejak ? perluAlasan(cfg, jejak.status) && !String(jejak.alasan || '').trim() : false;
  const bisaBeda = sorot && kiri && kanan && jejak && jejak.status !== (cfg.label || {}).TETAP;
  const pn = (kanan && penanda) || null;
  const monev = pn ? pn.monev : [];
  const keluar = !!(kanan && kanan.pasal !== pasal);           // ayat 2026 kini berada di pasal lain
  const masuk = !!(kiri && kanan && kiri.pasal !== pasal && kanan.pasal === pasal);   // ayat 2026 berasal dari pasal lain

  return (
    <div className={'jj-baris' + (terbuka ? ' jj-terbuka' : '') + (!jejak ? ' jj-tanpa' : '') + (monev.length && pertama ? ' jj-monev' : '') +
      (keluar ? ' jj-keluar' : '') + (masuk ? ' jj-masuk' : '')}
         data-k={kiri ? kiri.id : undefined} data-n={kanan ? kanan.id : undefined}>
      <div className="jj-sel jj-kiri">
        {kiri ? (
          <>
            {kiri.pasal !== pasal ? (
              <button type="button" className={'jj-asal' + (masuk ? ' jj-asal-masuk' : '')} onClick={() => onPilihPasal(kiri.pasal)}>dari {namaPasal(kiri.pasal)}</button>
            ) : null}
            <span className="jj-no">{nomorLama(kiri.nomor)}</span>
            {bisaBeda ? <TeksBeda kiri={kiri.teks} kanan={kanan.teks} sisi="kiri" /> : <span className="teks-pre">{kiri.teks}</span>}
            {pitaKiri}
          </>
        ) : <><span className="jj-kosong">—</span>{pitaKiri}</>}
      </div>

      <div className="jj-sel jj-tengah">
        {jejak ? (
          <button type="button" className="chip-status chip-status-tombol" style={{ background: warnaSt || undefined }}
                  onClick={() => { if (!bisaSunting) return; if (terbuka) onTutup(); else onBuka(); }} aria-expanded={terbuka}
                  title={bisaSunting ? 'Ubah status jejak' : 'Status jejak'}>
            {jejak.status || 'tanpa status'}{bisaSunting ? <span className="jj-panah"> ▾</span> : null}
          </button>
        ) : <span className="jj-belum">belum ada jejak</span>}
        {jejak && !jejak.dikonfirmasi ? <span className="tanda-usulan">usulan</span> : null}
        {jejak && jejak.dikonfirmasi ? <span className="tanda-konfirmasi">✓ dikonfirmasi</span> : null}
        {wajib ? <span className="tanda-awas">perlu alasan</span> : null}
        {jejak && bacaDraf('jejak:' + jejak.id) !== undefined ? <span className="tanda-awas" title="Buka untuk menyimpan ulang">belum tersimpan</span> : null}
      </div>

      <div className="jj-sel jj-kanan">
        {kanan && pertama && keluar ? (
          <div className="jj-bayang">
            <div className="jj-bayang-pita">
              <span>↪ Bukan lagi bagian {namaPasal(pasal)} — kini {namaPasal(kanan.pasal)}{letakNo(kanan)}</span>
              <button type="button" className="jj-bayang-buka" onClick={() => onPilihPasal(kanan.pasal)}>Buka {namaPasal(kanan.pasal)} →</button>
            </div>
            <div className="jj-bayang-isi">
              {bisaBeda ? <TeksBeda kiri={kiri.teks} kanan={kanan.teks} sisi="kanan" />
                : <TeksSorot teks={kanan.teks} sorot={kanan.sorot} warna={warna} />}
            </div>
          </div>
        ) : kanan ? (pertama ? (
          <>
            <span className="jj-no">{kanan.pasal === 0 ? kanan.nomor : (kanan.nomor ? '(' + kanan.nomor + ')' : '')}</span>
            {pn ? <LencanaMonev daftar={pn.monev.concat(pn.monevAda || []).sort((a, b) => Number(a.butir) - Number(b.butir))} /> : null}
            {bisaBeda ? <TeksBeda kiri={kiri.teks} kanan={kanan.teks} sisi="kanan" />
              : <TeksSorot teks={kanan.teks} sorot={kanan.sorot} warna={warna} />}
            {jejak ? <span className="st-kecil" style={{ background: warnaSt || undefined }}>{String(jejak.status || '').split(' ')[0]}</span> : null}
            {kanan.pasal === pasal ? (
              <KotakRedaksi ayat={kanan} redaksi={redaksi} kerja={bisaSunting} monev={monev} onGalat={onGalat} />
            ) : null}
            {monev.length ? (
              <div className="kotak-tanda kotak-monev">
                <b>Catatan asesor Monev</b>
                {monev.map((m) => (
                  <div key={m.butir}>Butir {m.butir} · {m.alamat} — ditagih: {m.dokumen}{m.status ? ' · status BA: ' + m.status : ''}
                    {m.hanyaPasal && m.tertuju ? (
                      <span className="kecil"> (Berita Acara hanya menyebut pasal; ayat ini ditetapkan sebagai ayat tertuju pada tab Monev dan dapat dipindah.)</span>
                    ) : null}
                  </div>
                ))}
                <div className="kecil">Nomor ayat dan pendelegasian tidak boleh bergeser.</div>
              </div>
            ) : null}
            {pn && pn.monevAda && pn.monevAda.length ? (
              <div className="kotak-tanda kotak-monev-ada">
                <b>Monev (sudah ada menurut Berita Acara)</b>
                {pn.monevAda.map((m) => <div key={m.butir}>Butir {m.butir} · {m.alamat} — {m.status}</div>)}
              </div>
            ) : null}
            {pn && pn.silang.length ? (
              <div className="kotak-tanda kotak-awas"><b>Rujukan silang patah:</b> menunjuk {pn.silang.join(', ')} yang tidak ada.</div>
            ) : null}
            {pn && pn.mirip.length ? (
              <div className="kotak-tanda kotak-awas">
                <b>Dugaan ayat kembar:</b>{' '}
                {pn.mirip.slice(0, 3).map((m, i) => (
                  <span key={m.lawan}>{i ? '; ' : ''}
                    <button type="button" className="tautan" onClick={() => onPilihPasal(Number(m.lawan.slice(1, 4)))}>{labelId(m.lawan)}</button>
                    {' '}(kemiripan {m.skor}, organ sama)
                  </span>
                ))}
              </div>
            ) : null}
            {pita}
          </>
        ) : <span className="redup kecil">sama dengan baris di atas · ({kanan.nomor})</span>) : <><span className="jj-kosong">—</span>{pita}</>}
      </div>

      <div className="jj-sel jj-dasar">
        {kanan && pertama ? (dasar && dasar.length
          ? <ul className="daftar-rapat">{dasar.map((b, i) => <li key={i}><TeksRujukan teks={b} onDh={onDh} /></li>)}</ul>
          : <span className="redup jj-ikut">Mengikuti garis besar pasal.</span>) : null}
        {!kanan && kiri && jejak && (String(jejak.alasan || '').trim() || String(jejak.dialihkan || '').trim()) ? (
          <ul className="daftar-rapat">
            {String(jejak.alasan || '').trim() ? <li><TeksRujukan teks={jejak.alasan} onDh={onDh} /></li> : null}
            {String(jejak.dialihkan || '').trim() ? <li>Dialihkan ke {jejak.dialihkan}.</li> : null}
          </ul>
        ) : null}
      </div>

      {terbuka && jejak && bisaSunting ? (
        <PanelJejak jejak={jejak} pasal={pasal} cfg={cfg} init={init} onTutup={onTutup} onGalat={onGalat} />
      ) : null}
    </div>
  );
}

function labelId(id) {
  const m = /^[A-Z](\d{3})\.(\d+)$/.exec(String(id || ''));
  if (!m) return id;
  return Number(m[1]) === 0 ? 'Pembukaan, alinea ke-' + Number(m[2]) : 'Pasal ' + Number(m[1]) + ', ayat ke-' + Number(m[2]);
}

/** v5.16: letak ayat 2026 pada pita kartu bayangan: " ayat (1)", " alinea 2", " kalimat pembuka". */
function letakNo(a) {
  const n = String(a.nomor || '').trim();
  if (a.pasal === 0) return n ? ' ' + n : '';
  return n ? ' ayat (' + n + ')' : ' kalimat pembuka';
}

/** Bunyi ayat dengan sorotan tugas YEH/UNEKA sesuai warna di Google Doc. */
export function TeksSorot({ teks, sorot, warna }) {
  const potong = potongSorotan(teks, sorot, warna);
  return (
    <span className="teks-pre">
      {potong.map((p, i) => (p.pihak
        ? <mark key={i} className={'tugas tugas-' + String(p.pihak).toLowerCase()} title={'Tugas ' + p.pihak}>{p.t}</mark>
        : <React.Fragment key={i}>{p.t}</React.Fragment>))}
    </span>
  );
}

function nomorLama(n) {
  return String(n || '').trim();
}

export function warnaStatus(cfg, status) {
  const s = (cfg.status || []).find((x) => String(x.nilai).toUpperCase() === String(status || '').toUpperCase());
  return s ? s.warna : '';
}

function perluAlasan(cfg, status) {
  return (cfg.wajibAlasan || []).some((w) => String(w).toUpperCase() === String(status || '').toUpperCase());
}

/* ================================================================ PANEL SUNTING */

function PanelJejak({ jejak, pasal, cfg, init, onTutup, onGalat }) {
  // v5.6: perubahan yang belum tersimpan disimpan sebagai draf di peramban dan dipulihkan saat panel dibuka lagi.
  const kunciDraf = 'jejak:' + jejak.id;
  const [draf, setDraf] = useState(() => { const d = bacaDraf(kunciDraf); return d === undefined ? salin(jejak) : Object.assign(salin(jejak), d); });
  const [keadaan, setKeadaan] = useState(() => (bacaDraf(kunciDraf) === undefined ? 'diam' : 'galat'));  // diam | menunggu | menyimpan | tersimpan | galat
  const [pesan, setPesan] = useState(() => (bacaDraf(kunciDraf) === undefined ? '' : 'Perubahan yang belum tersimpan dipulihkan.'));
  const tunda = useRef(null);
  const terkirim = useRef(salin(jejak));
  const jeda = Number(cfg.jedaSimpanMs) > 0 ? Number(cfg.jedaSimpanMs) : 800;

  useEffect(() => {
    // v5.6: sesudah simpan gagal, ketikan tidak ditimpa nilai lama; pengguna memilih Simpan ulang.
    if (keadaan === 'menunggu' || keadaan === 'menyimpan' || keadaan === 'galat') return;
    setDraf(salin(jejak));
    terkirim.current = salin(jejak);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jejak.id, jejak.status, jejak.id25, jejak.id26, jejak.alasan, jejak.dialihkan, jejak.dikonfirmasi]);

  const kirim = useCallback(async (d) => {
    const muatan = { idJejak: jejak.id };
    ['id25', 'id26', 'status', 'alasan', 'dialihkan', 'dikonfirmasi'].forEach((k) => {
      if (d[k] !== terkirim.current[k]) muatan[k] = d[k];
    });
    if (Object.keys(muatan).length === 1) { hapusDraf('jejak:' + jejak.id); setKeadaan('diam'); setPesan(''); return; }
    if (d.oleh) muatan.oleh = d.oleh;
    setKeadaan('menyimpan');
    try {
      await simpanJejak(muatan);
      terkirim.current = Object.assign({}, terkirim.current, muatan);
      hapusDraf('jejak:' + jejak.id);
      setKeadaan('tersimpan');
      setPesan('');
    } catch (e) {
      const m = (e && e.message) || String(e);
      setKeadaan('galat');
      setPesan('Gagal disimpan (' + m + '). Ketikan tetap di sini; tekan Simpan ulang.');
      if (onGalat) onGalat(m);
    }
  }, [jejak.id, onGalat]);

  const ubah = (patch) => {
    const d = Object.assign({}, draf, patch);
    if (patch.dikonfirmasi === true && perluAlasan(cfg, d.status) && !String(d.alasan || '').trim()) {
      setPesan('Isi alasan lebih dulu: status ' + d.status + ' wajib beralasan sebelum dikonfirmasi.');
      return;
    }
    if (patch.dikonfirmasi === true && !d.status) { setPesan('Pilih status lebih dulu.'); return; }
    setPesan('');
    setDraf(d);
    tulisDraf(kunciDraf, d);
    if (patch.oleh !== undefined) { try { window.localStorage.setItem(STORAGE_KEY.OLEH, patch.oleh); } catch (e) { /* abaikan */ } }
    setKeadaan('menunggu');
    window.clearTimeout(tunda.current);
    tunda.current = window.setTimeout(() => kirim(d), jeda);
  };

  const tutup = () => {
    if (keadaan === 'menunggu') { window.clearTimeout(tunda.current); kirim(draf); }
    onTutup();
  };

  useEffect(() => () => window.clearTimeout(tunda.current), []);

  const wajib = perluAlasan(cfg, draf.status);
  const teksKeadaan = { menunggu: 'Menunggu…', menyimpan: 'Menyimpan…', tersimpan: 'Tersimpan', galat: 'Gagal disimpan' }[keadaan] || '';

  return (
    <div className="jj-panel" role="group" aria-label="Sunting jejak">
      <label className="jj-medan">
        <span>Status</span>
        <select className="inp" value={draf.status} onChange={(e) => ubah({ status: e.target.value })}>
          <option value="">—</option>
          {(cfg.status || []).map((s) => <option key={s.nilai} value={s.nilai}>{s.nilai}</option>)}
          {draf.status && !(cfg.status || []).some((s) => s.nilai === draf.status) ? <option value={draf.status}>{draf.status}</option> : null}
        </select>
      </label>
      <PilihAyat judul={'Pasangan ' + (cfg.labelLama || '2025')} jenis="lama" nilai={draf.id25} pasalAsal={pasal}
                 indeks={init.indeks25} onPilih={(id) => ubah({ id25: id })} />
      <PilihAyat judul={'Pasangan ' + (cfg.labelBaru || '2026')} jenis="baru" nilai={draf.id26} pasalAsal={pasal}
                 indeks={init.indeks26} onPilih={(id) => ubah({ id26: id })} />
      <label className="jj-medan jj-lebar">
        <span>Alasan{wajib ? ' (wajib)' : ''}</span>
        <textarea className="inp" rows={2} value={draf.alasan} onChange={(e) => ubah({ alasan: e.target.value })}
                  placeholder={wajib ? 'Mengapa muatan ini dipindah atau tidak dilanjutkan' : 'Opsional'} />
      </label>
      <label className="jj-medan">
        <span>Dialihkan ke</span>
        <input className="inp" value={draf.dialihkan} onChange={(e) => ubah({ dialihkan: e.target.value })}
               placeholder="mis. Peraturan Rektor" />
      </label>
      <label className="jj-medan">
        <span>Oleh</span>
        <input className="inp" value={draf.oleh} onChange={(e) => ubah({ oleh: e.target.value })} placeholder="Nama atau forum" />
      </label>
      <div className="jj-kaki">
        <label className="jj-centang">
          <input type="checkbox" checked={!!draf.dikonfirmasi} onChange={(e) => ubah({ dikonfirmasi: e.target.checked })} />
          <span>Dikonfirmasi</span>
        </label>
        {jejak.kemiripan !== '' && jejak.kemiripan !== undefined ? <span className="kecil">Kemiripan usulan {jejak.kemiripan}</span> : null}
        {pesan ? <span className="jj-pesan">{pesan}</span> : null}
        <span className={'jj-keadaan jj-' + keadaan}>{teksKeadaan}</span>
        {keadaan === 'galat' ? <button type="button" className="tbl" onClick={() => kirim(draf)}>Simpan ulang</button> : null}
        <button type="button" className="tbl tbl-ringan jj-tutup" onClick={tutup}>Selesai</button>
      </div>
    </div>
  );
}

function salin(j) {
  let oleh = j.oleh || '';
  if (!oleh) { try { oleh = window.localStorage.getItem(STORAGE_KEY.OLEH) || ''; } catch (e) { /* abaikan */ } }
  return {
    id25: j.id25 || '', id26: j.id26 || '', status: j.status || '', alasan: j.alasan || '',
    dialihkan: j.dialihkan || '', dikonfirmasi: !!j.dikonfirmasi, oleh
  };
}

/** Pemilih ayat: nomor pasal lalu ayatnya. Nilai lama tetap tampil walau di luar daftar. */
function PilihAyat({ judul, jenis, nilai, pasalAsal, indeks, onPilih }) {
  const pasalNilai = pasalDariIdLokal(nilai);
  const [pasal, setPasal] = useState(adaPasal(pasalNilai) ? pasalNilai : pasalAsal);
  useEffect(() => { const p = pasalDariIdLokal(nilai); setPasal(adaPasal(p) ? p : pasalAsal); }, [nilai, pasalAsal]);
  const daftar = (indeks && indeks[pasal]) || [];
  const label = (x) => (jenis === 'lama' ? labelAyatLama(pasal, x[1]).replace(/^Ps \d+ /, '')
    : (pasal === 0 ? x[1] : (x[1] ? 'ayat (' + x[1] + ')' : 'kalimat pembuka')));
  const adaNilai = !nilai || daftar.some((x) => x[0] === nilai);
  return (
    <div className="jj-medan jj-pilih">
      <span>{judul}</span>
      <div className="jj-pilih-isi">
        <input className="inp jj-pasal" type="number" min="0" value={adaPasal(pasal) ? pasal : ''} aria-label="Nomor pasal (0 = Pembukaan)"
               title="0 = Pembukaan" onChange={(e) => setPasal(e.target.value === '' ? '' : Number(e.target.value))} />
        <select className="inp" value={nilai || ''} onChange={(e) => onPilih(e.target.value)}>
          <option value="">— tidak ada —</option>
          {daftar.map((x) => <option key={x[0]} value={x[0]}>{label(x)}</option>)}
          {!adaNilai ? <option value={nilai}>{nilai}</option> : null}
        </select>
      </div>
    </div>
  );
}

function pasalDariIdLokal(id) {
  const m = /^[A-Z](\d{3})\.\d+$/.exec(String(id || ''));
  return m ? Number(m[1]) : null;
}

/**
 * v5.13: kalimat catatan dengan rujukan peraturan yang dapat diklik; bunyinya dibuka pada lembar Dasar hukum
 * yang sama dengan Dasar hukum pasal.
 */
export function TeksRujukan({ teks, onDh }) {
  const bagian = pecahRujukan(teks);
  if (!onDh || !bagian.some((b) => b.q)) return <>{teks}</>;
  return (
    <>
      {bagian.map((b, i) => (b.q
        ? <button type="button" key={i} className="rujukan-dh" onClick={() => onDh({ t: teks, q: b.q })} title="Buka bunyi aturan">{b.t}</button>
        : <React.Fragment key={i}>{b.t}</React.Fragment>))}
    </>
  );
}
