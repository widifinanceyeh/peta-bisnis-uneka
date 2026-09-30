/**
 * rujukan.js — mengurai teks rujukan pasal menjadi potongan (v4.9).
 * Kembaran uraiRujukan_ pada NaskahInti.gs; keduanya diuji dengan contoh yang sama.
 *
 * "Pasal 68 ayat (13) (Peraturan Rektor)" ->
 *   [{jenis:'ref', pasal:68, ayat:[13], huruf:'', teks:'Pasal 68 ayat (13)'}, {jenis:'teks', teks:'Peraturan Rektor'}]
 */

export function uraiRujukan(teks) {
  const s = String(teks == null ? '' : teks);
  const rx = /Pasal\s+(\d+)((?:\s*(?:ayat|angka)\s*\(?\d+\)?(?:\s*(?:,\s*dan|,|dan|sampai\s+dengan|sampai|s\.d\.|–|-)\s*(?:ayat|angka)?\s*\(?\d+\)?)*)?)((?:\s*huruf\s+[a-z](?:\s*(?:,\s*dan|,|dan|sampai|–|-)\s*(?:huruf\s+)?[a-z]\b)*)?)/gi;
  const out = [];
  let akhir = 0;
  let m;
  while ((m = rx.exec(s)) !== null) {
    if (m.index > akhir) out.push({ jenis: 'teks', teks: s.slice(akhir, m.index) });
    let ayat = null;
    if (m[2] && m[2].trim()) {
      ayat = [];
      const tok = m[2].match(/\d+|sampai(?:\s+dengan)?|s\.d\.|–|-/gi) || [];
      let rentang = false;
      tok.forEach((k) => {
        if (/^\d+$/.test(k)) {
          const n = Number(k);
          if (rentang && ayat.length) {
            const dari = ayat[ayat.length - 1];
            for (let i = dari + 1; i <= n && i - dari < 60; i++) ayat.push(i);
          } else ayat.push(n);
          rentang = false;
        } else rentang = true;
      });
    }
    const huruf = m[3] ? (m[3].match(/\b[a-z]\b/gi) || []).filter((h) => h.toLowerCase() !== 'dan').join(', ') : '';
    out.push({ jenis: 'ref', pasal: Number(m[1]), ayat, huruf, teks: m[0].trim() });
    akhir = m.index + m[0].length;
    const rxLanjut = /^\s*(?:,\s*dan|,|dan)\s*(?:ayat|angka)\s*\(?(\d+)\)?((?:\s*huruf\s+[a-z]\b)?)/i;
    let ml;
    while ((ml = rxLanjut.exec(s.slice(akhir))) !== null) {
      out.push({
        jenis: 'ref', pasal: Number(m[1]), ayat: [Number(ml[1])],
        huruf: ml[2] ? ml[2].replace(/huruf/i, '').trim() : '',
        teks: ml[0].replace(/^\s*(?:,\s*dan|,|dan)\s*/i, '').trim(), lanjutan: true
      });
      akhir += ml[0].length;
    }
    rx.lastIndex = akhir;
  }
  if (akhir < s.length) out.push({ jenis: 'teks', teks: s.slice(akhir) });
  return out.map((p) => {
    if (p.jenis !== 'teks') return p;
    const t = p.teks.replace(/^[\s;,:.]+|[\s;,]+$/g, '').replace(/^\((.*)\)$/, '$1').trim();
    return { jenis: 'teks', teks: t };
  }).filter((p) => p.jenis === 'ref' || p.teks);
}

/** Label ringkas tombol: "Ps 68 (13)", "Ps 68 (1)–(3)", "Ps 37 (2) b", "Ps 24". */
export function labelRujukan(r) {
  if (!r.ayat || !r.ayat.length) return 'Ps ' + r.pasal;
  const a = r.ayat;
  let isi;
  const bersambung = a.length > 2 && a.every((n, i) => i === 0 || n === a[i - 1] + 1);
  if (bersambung) isi = '(' + a[0] + ')–(' + a[a.length - 1] + ')';
  else isi = a.map((n) => '(' + n + ')').join(', ');
  return 'Ps ' + r.pasal + ' ' + isi + (r.huruf ? ' ' + r.huruf : '');
}

/**
 * Menautkan rujukan ke ID ayat naskah 2026 memakai indeks26 dari naskahInit.
 * @return {{ada:boolean, id:string[], hilang:number[]}}
 */
export function tautkan(r, indeks26) {
  const daftar = (indeks26 && indeks26[r.pasal]) || null;
  if (!daftar) return { ada: false, id: [], hilang: r.ayat || [] };
  if (!r.ayat || !r.ayat.length) return { ada: true, id: daftar.map((x) => x[0]), hilang: [] };
  const id = [];
  const hilang = [];
  r.ayat.forEach((n) => {
    const t = daftar.find((x) => String(x[1]) === String(n));
    if (t) id.push(t[0]); else hilang.push(n);
  });
  return { ada: hilang.length === 0, id, hilang };
}

/** Label ayat Statuta 2025 dari nomor cetak: "(1)" -> "ayat (1)", "1." -> "angka 1", "" -> "kalimat pembuka". */
export function labelAyatLama(pasal, nomor) {
  const n = String(nomor || '').trim();
  if (!n) return 'Ps ' + pasal + ' kalimat pembuka';
  if (/^\(\d+\)/.test(n)) return 'Ps ' + pasal + ' ayat ' + n.replace(/\.$/, '');
  return 'Ps ' + pasal + ' angka ' + n.replace(/[().]/g, '');
}

export function labelAyatBaru(pasal, nomor) {
  return nomor ? 'Ps ' + pasal + ' (' + nomor + ')' : 'Ps ' + pasal + ' kalimat pembuka';
}
