'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Toaster } from 'react-hot-toast';

type FullscreenDocument = Document & { webkitFullscreenElement?: Element | null };

export function ClientToaster() {
  // Saat layar penuh hanya isi elemen fullscreen yang tampil; pindahkan toast ke dalamnya.
  const [host, setHost] = useState<Element | null>(null);

  useEffect(() => {
    const sync = () => {
      const doc = document as FullscreenDocument;
      setHost(doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null);
    };
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, []);

  const toaster = (
    <Toaster
      position="bottom-center"
      toastOptions={{
        style: {
          background: '#333',
          color: '#fff',
          borderRadius: '10px',
          border: '1px solid #444',
        },
      }}
    />
  );
  return host ? createPortal(toaster, host) : toaster;
}
