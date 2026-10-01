import React from 'react';
import { jenisTautan } from '../utils/telaah';

/**
 * v5.10: tautan draf dokumen turunan — judul yang dapat diklik (tab baru) dan jenis berkas yang dibaca dari tautannya.
 * @param {{judul?: string, tautan: string, cadangan?: string, kecil?: boolean}} props
 */
export default function TautanDraf({ judul, tautan, cadangan, kecil }) {
  const url = String(tautan || '').trim();
  if (!/^https?:\/\//i.test(url)) return null;
  const jenis = jenisTautan(url);
  return (
    <span className={'td-draf' + (kecil ? ' td-draf-kecil' : '')}>
      <a href={url} target="_blank" rel="noopener noreferrer" title={'Buka draf: ' + url}>{String(judul || '').trim() || cadangan || 'Draf'}</a>
      {jenis ? <span className="td-draf-jenis">{jenis}</span> : null}
    </span>
  );
}
