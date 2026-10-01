/**
 * navigasi.js — jembatan pindah halaman untuk komponen yang letaknya jauh dari App
 * (misalnya panel intip ayat di dalam formulir aras). App mengisi fungsinya saat hidup.
 */
export const navigasi = {
  /** v5.9: membuka Periksa › Butir Monev pada butir tertentu (lencana Monev). */
  bukaMonev: null,
  bukaNaskah: null,   // (pasal) => void
  bukaUrusan: null    // (idUrusan) => void
};
