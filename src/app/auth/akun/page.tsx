'use client';import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/components/providers/AuthProvider';
import { User, Mail, Calendar, LogOut } from 'lucide-react';

export default function AkunPage() {
  const router = useRouter();
  const { user, profile, isAuthenticated, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login?redirect=/akun');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/movie');
  };

  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="bg-black min-h-screen pt-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-zinc-800 rounded w-48 mb-8"></div>
              <div className="bg-zinc-900 rounded-lg p-8">
                <div className="h-24 w-24 bg-zinc-800 rounded-full mx-auto mb-6"></div>
                <div className="h-6 bg-zinc-800 rounded w-32 mx-auto mb-8"></div>
                <div className="space-y-4">
                  <div className="h-4 bg-zinc-800 rounded"></div>
                  <div className="h-4 bg-zinc-800 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const joinedDate = user?.created_at ? new Date(user.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';

  return (
    <>
      <Navbar />
      <main className="bg-black min-h-screen pt-24 px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8">My Account</h1>

          {/* Profile Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 mb-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center flex-shrink-0">
                <User className="w-12 h-12 text-white" />
              </div>

              {/* Info */}
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl font-bold text-white mb-2">{profile?.full_name || 'User'}</h2>
                <p className="text-gray-400 mb-1">{user?.email}</p>
                <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  <span>Joined {joinedDate}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Account Details */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 mb-6">
            <h3 className="text-xl font-bold text-white mb-6">Account Information</h3>

            <div className="space-y-4">
              <div className="flex items-start gap-4 pb-4 border-b border-zinc-800">
                <Mail className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-gray-400 mb-1">Email Address</p>
                  <p className="text-white font-medium">{user?.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 pb-4 border-b border-zinc-800">
                <User className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-gray-400 mb-1">Full Name</p>
                  <p className="text-white font-medium">{profile?.full_name || 'Not set'}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Calendar className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-gray-400 mb-1">Member Since</p>
                  <p className="text-white font-medium">{joinedDate}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
            <h3 className="text-xl font-bold text-white mb-6">Actions</h3>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-red-600/10 hover:bg-red-600/20 text-red-500 font-semibold rounded-lg transition border border-red-600/30"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>

          {/* Coming Soon Features */}
          <div className="mt-8 p-6 bg-zinc-900/50 border border-zinc-800 rounded-xl">
            <h4 className="text-lg font-semibold text-white mb-3">Coming Soon</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>• Edit profile information</li>
              <li>• Change password</li>
              <li>• Watchlist & favorites</li>
              <li>• Viewing history</li>
            </ul>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
