/**
 * bedaKata.js — penyorot perubahan kata antara dua teks (v4.9). Tanpa pustaka luar.
 * Membandingkan per kata dengan LCS; tanda baca dan huruf besar diabaikan saat
 * membandingkan, tetapi teks asli yang ditampilkan.
 *
 * @return {{kiri: Array<{t:string,beda:boolean}>, kanan: Array<{t:string,beda:boolean}>}|null}
 *         null bila teks terlalu panjang untuk dibandingkan dengan wajar.
 */
const BATAS = 700;

function pecah(s) {
  return String(s || '').split(/(\s+)/).filter((x) => x !== '');
}

function kunci(k) {
  return k.toLowerCase().replace(/[^a-z0-9À-ɏ]/g, '');
}

export function bedaKata(a, b) {
  const A = pecah(a);
  const B = pecah(b);
  const kataA = A.filter((x) => !/^\s+$/.test(x));
  const kataB = B.filter((x) => !/^\s+$/.test(x));
  if (kataA.length > BATAS || kataB.length > BATAS) return null;
  const ka = kataA.map(kunci);
  const kb = kataB.map(kunci);
  const n = ka.length;
  const m = kb.length;
  const L = [];
  for (let i = 0; i <= n; i++) L.push(new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      L[i][j] = ka[i] === kb[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    }
  }
  const samaA = new Array(n).fill(false);
  const samaB = new Array(m).fill(false);
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (ka[i] === kb[j]) { samaA[i] = true; samaB[j] = true; i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) i++;
    else j++;
  }
  const rakit = (T, sama) => {
    const out = [];
    let k = 0;
    T.forEach((x) => {
      if (/^\s+$/.test(x)) { out.push({ t: x, beda: false, spasi: true }); return; }
      const bedaKini = !sama[k] && kunci(x) !== '';
      k++;
      const akhir = out[out.length - 1];
      // Gabungkan kata berurutan yang sama-sama berbeda (spasi di antaranya ikut) supaya sorotan tidak terputus.
      if (bedaKini && akhir && akhir.spasi && out.length > 1 && out[out.length - 2].beda) {
        const spasi = out.pop();
        out[out.length - 1].t += spasi.t + x;
        return;
      }
      out.push({ t: x, beda: bedaKini });
    });
    return out.map((o) => ({ t: o.t, beda: o.beda }));
  };
  return { kiri: rakit(A, samaA), kanan: rakit(B, samaB) };
}
