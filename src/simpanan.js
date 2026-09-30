/**
 * simpanan.js (v5.6) — penyimpanan besar di peramban (IndexedDB) untuk paket data Naskah.
 *
 * localStorage dibatasi ±5 MB dan menulisnya menahan layar; IndexedDB tidak. Setiap nilai disimpan
 * di bawah satu kunci ('paket-n', 'paket-h'). Bila peramban menolak IndexedDB (mode privat tertentu),
 * seluruh fungsi mengembalikan null/diam, dan aplikasi tetap berjalan dengan membaca dari server.
 */

const NAMA_DB = 'peta-bisnis-uneka';
const TOKO = 'simpanan';
let janjiDb = null;

function bukaDb() {
  if (janjiDb) return janjiDb;
  janjiDb = new Promise((resolve) => {
    try {
      if (!window.indexedDB) { resolve(null); return; }
      const req = window.indexedDB.open(NAMA_DB, 1);
      req.onupgradeneeded = () => { try { req.result.createObjectStore(TOKO); } catch (e) { /* sudah ada */ } };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch (e) { resolve(null); }
  });
  return janjiDb;
}

export async function bacaSimpanan(kunci) {
  const db = await bukaDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const req = db.transaction(TOKO, 'readonly').objectStore(TOKO).get(kunci);
      req.onsuccess = () => resolve(req.result === undefined ? null : req.result);
      req.onerror = () => resolve(null);
    } catch (e) { resolve(null); }
  });
}

export async function tulisSimpanan(kunci, nilai) {
  const db = await bukaDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(TOKO, 'readwrite');
      tx.objectStore(TOKO).put(nilai, kunci);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch (e) { resolve(false); }
  });
}
