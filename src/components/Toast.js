import React, { useEffect } from 'react';

export default function Toast({ pesan, jenis, onTutup }) {
  useEffect(() => {
    if (!pesan) return undefined;
    const t = setTimeout(onTutup, jenis === 'galat' ? 7000 : 3000);
    return () => clearTimeout(t);
  }, [pesan, jenis, onTutup]);

  if (!pesan) return null;
  return (
    <div className={'toast toast-' + (jenis || 'info')} role="status">
      <span>{pesan}</span>
      <button className="toast-x" onClick={onTutup} aria-label="Tutup">×</button>
    </div>
  );
}
