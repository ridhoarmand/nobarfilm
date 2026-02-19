import { AlertCircle, RefreshCw, Copy } from 'lucide-react';interface UnifiedErrorDisplayProps {
  message?: string;
  onRetry?: () => void;
  title?: string;
  retryLabel?: string;
}

export function UnifiedErrorDisplay({ message = 'Terjadi kesalahan saat memuat data.', title = 'Gagal Memuat', onRetry, retryLabel = 'Coba Lagi' }: UnifiedErrorDisplayProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 md:p-12 text-center space-y-6 bg-[#1a1625] rounded-2xl border border-white/5 mx-auto max-w-4xl w-full">
      <div className="rounded-full bg-red-500/10 p-4 ring-1 ring-red-500/20">
        <AlertCircle className="w-8 h-8 text-red-500" />
      </div>
      <div className="space-y-2">
        <h3 className="font-display font-bold text-lg md:text-xl text-white">{title}</h3>
        <p className="text-sm text-white/60 max-w-sm mx-auto">{message}</p>
      </div>
      {onRetry && (
        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-zinc-800 text-red-500 text-sm font-medium hover:bg-zinc-700 transition-colors border border-zinc-700"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{retryLabel}</span>
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(message);
              alert('Error copied to clipboard');
            }}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-zinc-800 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors border border-zinc-700 border-l-0"
            title="Copy error message"
          >
            <Copy className="w-4 h-4" />
            <span>Copy Error</span>
          </button>
        </div>
      )}
    </div>
  );
}
