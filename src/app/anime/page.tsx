'use client';import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Film } from 'lucide-react';

export default function AnimePage() {
  return (
    <>
      <Navbar />
      <main className="bg-black min-h-screen pt-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-600/20 mb-6">
              <Film className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">Anime Section</h1>
            <p className="text-gray-400 text-lg mb-8">Coming Soon! We're working on bringing you the best anime content.</p>
            <div className="inline-block px-6 py-2 bg-zinc-800 text-gray-400 rounded-full text-sm">Under Development</div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
