import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import Masuk from './components/Masuk';
import { dengarAksesHabis, selesaikanKeluar, tokenBerlaku } from './akses';
import { segarkanPaksa } from './awal';

/**
 * v5.23: gerbang masuk. Aplikasi (dan seluruh permintaan data) baru dimulai sesudah masuk.
 * Bila sesi berakhir di tengah pemakaian, halaman masuk tampil di atas aplikasi agar ketikan tidak hilang.
 */
selesaikanKeluar();

function Gerbang() {
  const [masuk, setMasuk] = useState(tokenBerlaku);
  const [habis, setHabis] = useState(false);
  useEffect(() => dengarAksesHabis(() => setHabis(true)), []);
  if (!masuk) return <Masuk onMasuk={() => { setHabis(false); setMasuk(true); }} />;
  return (
    <>
      <App />
      {habis ? <Masuk lapis onMasuk={() => { setHabis(false); segarkanPaksa(); }} /> : null}
    </>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Gerbang />
  </React.StrictMode>
);
