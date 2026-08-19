'use client';
import { useEffect } from 'react';
import toast from 'react-hot-toast';

export function NetworkStatus() {
  useEffect(() => {
    const handleOnline = () => {
      toast.success('Kembali online');
    };

    const handleOffline = () => {
      toast.error('Koneksi internet terputus');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return null;
}
