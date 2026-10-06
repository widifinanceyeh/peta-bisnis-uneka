/**
 * v5.15: rujukan ayat pada pita peta dapat diklik.
 *   - Rujukan peta 2026 membuka pasal naskah 2026 yang dirujuk.
 *   - Rujukan peta 2025 membuka pasal 2026 tempat ayat 2025 itu disandingkan (dari Jejak, init.letak25),
 *     karena penomoran pasal 2025 dan 2026 tidak selalu sama.
 * Ayat tujuan disimpan sebagai sasaran; halaman Naskah menggulir ke barisnya dan menyorotnya sebentar.
 */
import { ambilNaskah } from '../naskah';
import { uraiRujukan, tautkan } from './rujukan';
import { pasalId } from './telaah';

let sasaran = null;
const pendengar = new Set();

export function langganSasaran(fn) { pendengar.add(fn); return () => pendengar.delete(fn); }
export function ambilSasaran() { return sasaran; }
export function lepasSasaran() { sasaran = null; pendengar.forEach((f) => f(null)); }

const norm = (n) => String(n || '').replace(/[().\s]/g, '');

/** Ayat tujuan satu rujukan: { id, pasal (halaman 2026), tahun } atau null bila tidak ditemukan. */
export function tujuanRujukan(tahun, r) {
  const init = (ambilNaskah() || {}).init;
  if (!init || !r) return null;
  if (tahun === '2025') {
    const daftar = (init.indeks25 || {})[r.pasal] || [];
    const t = r.ayat && r.ayat.length ? daftar.find((x) => norm(x[1]) === String(r.ayat[0])) : daftar[0];
    if (!t) return null;
    const halaman = (init.letak25 || {})[t[0]] || r.pasal;
    return { id: t[0], pasal: Number(halaman), tahun };
  }
  const ids = r.ayat && r.ayat.length ? tautkan(r, init.indeks26).id : (((init.indeks26 || {})[r.pasal] || []).map((x) => x[0]));
  if (!ids.length) return null;
  return { id: ids[0], pasal: pasalId(ids[0]), tahun };
}

/** Buka rujukan: simpan sasaran, lalu pindah ke halaman pasal lewat penangan halaman. */
export function bukaRujukan(tahun, r, onBukaPasal) {
  const t = tujuanRujukan(tahun, r);
  if (!t || !onBukaPasal) return false;
  sasaran = t;
  pendengar.forEach((f) => f(t));
  onBukaPasal(t.pasal);
  return true;
}

/**
 * Pecah teks rujukan menjadi potongan teks biasa dan potongan rujukan, dengan teks asli dipertahankan
 * (termasuk tanda baca dan keterangan dalam kurung). Rujukan lanjutan ("…, ayat (8) huruf d") membawa nomor pasalnya.
 * @return {Array<{t:string, r?:Object}>}
 */
export function pecahTeksRujukan(teks) {
  const s = String(teks == null ? '' : teks);
  const out = [];
  let pos = 0;
  uraiRujukan(s).forEach((p) => {
    if (p.jenis !== 'ref') return;
    const i = s.indexOf(p.teks, pos);
    if (i === -1) return;
    if (i > pos) out.push({ t: s.slice(pos, i) });
    out.push({ t: p.teks, r: p });
    pos = i + p.teks.length;
  });
  if (pos < s.length) out.push({ t: s.slice(pos) });
  return out;
}
