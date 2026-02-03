'use client';
import { useState } from 'react';
import { Users, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import toast from 'react-hot-toast';

interface WatchPartyButtonProps {
  subject: {
    id: string;
    type: number;
    title: string;
    coverUrl?: string;
  };
  className?: string; // Allow custom styling
}

export function WatchPartyButton({ subject, className = '' }: WatchPartyButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  const handleCreateParty = async () => {
    if (!user) {
      toast.error('Please login to start a watch party');
      router.push('/login');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/watch-party/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject_id: subject.id,
          subject_type: subject.type,
          title: subject.title,
          cover_url: subject.coverUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create party');
      }

      toast.success('Watch Party created!');
      router.push(`/watch-party/${data.roomCode}`);
    } catch (error: any) {
      console.error('Error creating party:', error);
      toast.error(error.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleCreateParty}
      disabled={isLoading}
      className={`flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-full transition shadow-lg shadow-indigo-900/20 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Users className="w-5 h-5" />}
      <span>{isLoading ? 'Creating...' : 'Watch Party'}</span>
    </button>
  );
}
