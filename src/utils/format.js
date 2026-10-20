// Format tanggal, jam, dan teks. Zona waktu Asia/Jakarta.

export function kunciTanggal(v) {
  if (!v) return '';
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(v);
  if (isNaN(d.getTime())) return '';
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
  const m = {};
  p.forEach((x) => { m[x.type] = x.value; });
  return m.year + '-' + m.month + '-' + m.day;
}
export function hariIni() { return kunciTanggal(new Date()); }
export function tambahHari(kunci, n) {
  const d = new Date(kunci + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function selisihHari(a, b) {
  return Math.round((new Date(a + 'T00:00:00Z') - new Date(b + 'T00:00:00Z')) / 86400000);
}
function dariKunci(k) { return new Date(k + 'T00:00:00Z'); }
export function tgl(v) {
  const k = kunciTanggal(v);
  if (!k) return '—';
  return dariKunci(k).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
export function tglPanjang(v) {
  const k = kunciTanggal(v);
  if (!k) return '—';
  return dariKunci(k).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}
export function tglPendek(v) {
  const k = kunciTanggal(v);
  if (!k) return '—';
  return dariKunci(k).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}
export function hariSaja(v) {
  const k = kunciTanggal(v);
  if (!k) return '';
  return dariKunci(k).toLocaleDateString('id-ID', { weekday: 'short', timeZone: 'UTC' });
}
export function jam(v) {
  const m = String(v || '').match(/(\d{1,2})[:.](\d{2})/);
  return m ? String(Number(m[1])).padStart(2, '0') + ':' + m[2] : '';
}
export function rentangJam(r) {
  const a = jam(r && r.JAM_MULAI);
  const b = jam(r && r.JAM_SELESAI);
  if (!a) return '';
  return b ? a + '–' + b : a;
}
export function menit(v) {
  const j = jam(v);
  if (!j) return null;
  const [h, m] = j.split(':');
  return Number(h) * 60 + Number(m);
}
/** 20/10/2026 09:14 — dipakai bila waktu persisnya penting (terakhir masuk, jejak perubahan). */
export function tglJam(v) {
  const d = v ? new Date(v) : null;
  if (!d || isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}
export function waktuRelatif(v) {
  const k = kunciTanggal(v);
  if (!k) return '';
  const n = selisihHari(hariIni(), k);
  if (n <= 0) return 'hari ini';
  if (n === 1) return 'kemarin';
  if (n < 30) return n + ' hari lalu';
  return tgl(v);
}
export function teks(v) { return v === null || v === undefined ? '' : String(v).trim(); }
export function cocokCari(q, nilai) {
  const s = teks(q).toLowerCase();
  if (!s) return true;
  return nilai.some((v) => teks(v).toLowerCase().indexOf(s) !== -1);
}
/** Nama tanpa gelar di belakang koma: "Ika Asriani Yadin, S.E., ..." → "Ika Asriani Yadin". */
export function namaPendek(nama) {
  const t = teks(nama);
  if (!t) return '';
  return t.split(',')[0].trim();
}
export function inisial(nama) {
  const n = namaPendek(nama).replace(/^(dr|drs|ir|prof)\.?\s+/i, '');
  const p = n.split(/\s+/).filter(Boolean);
  return ((p[0] || '')[0] || '').toUpperCase() + ((p[1] || '')[0] || '').toUpperCase();
}
