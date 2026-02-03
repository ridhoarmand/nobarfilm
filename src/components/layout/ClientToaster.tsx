'use client';
import { Toaster } from 'react-hot-toast';

export function ClientToaster() {
  return (
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
}
