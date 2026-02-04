'use client';
import { Play } from 'lucide-react';
import { usePlatform } from '@/lib/store/platformStore';

export default function DramaBoxPage() {
  const { platformInfo } = usePlatform();

  return (
    <div className="py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-red-600/20 rounded-lg">
          <Play className="w-6 h-6 text-red-600" />
        </div>
        <h1 className="text-3xl font-bold text-white">DramaBox</h1>
      </div>

      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-600/20 mb-6">
          <Play className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">DramaBox Content</h2>
        <p className="text-gray-400 max-w-md mx-auto mb-6">
          Discover amazing drama content from DramaBox. This platform offers a wide variety of short dramas and series.
          API Base: {platformInfo.apiBase}
        </p>
        <div className="inline-block px-6 py-2 bg-zinc-800 text-gray-400 rounded-full text-sm">Connected to {platformInfo.name}</div>
      </div>
    </div>
  );
}