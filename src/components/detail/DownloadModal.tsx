'use client';import { useState } from 'react';
import { X, Download as DownloadIcon, Film, FileText } from 'lucide-react';
import { useSources, useDetail } from '@/lib/hooks/useMovieBox';
import toast from 'react-hot-toast';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectId: string;
  title: string;
  seasonNumber?: number;
  episodeNumber?: number;
}

export function DownloadModal({ isOpen, onClose, subjectId, title, seasonNumber, episodeNumber }: DownloadModalProps) {
  const [selectedQuality, setSelectedQuality] = useState(0);
  const [selectedSubtitle, setSelectedSubtitle] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: sourcesData, isLoading } = useSources(subjectId, seasonNumber || 0, episodeNumber || 0);
  const { data: detailData } = useDetail(subjectId);

  if (!isOpen) return null;

  const downloads = sourcesData?.downloads || [];
  const captions = sourcesData?.captions || [];
  const subject = detailData?.subject;
  const isSeries = subject?.subjectType === 2;

  // Generate smart filename
  const generateFilename = (type: 'video' | 'subtitle', subtitleLang?: string) => {
    const cleanTitle = title.replace(/[<>:"/\\|?*]/g, ''); // Remove invalid chars
    const year = subject?.releaseDate ? new Date(subject.releaseDate).getFullYear() : '';
    const quality = downloads[selectedQuality]?.resolution || 720;

    if (isSeries && seasonNumber !== undefined && episodeNumber !== undefined) {
      // Series format: "Series Title - S01E05 - 720p.mp4"
      const season = String(seasonNumber).padStart(2, '0');
      const episode = String(episodeNumber).padStart(2, '0');
      const base = `${cleanTitle} - S${season}E${episode}`;

      if (type === 'video') {
        return `${base} - ${quality}p.mp4`;
      } else {
        return `${base} - ${subtitleLang || 'Subtitle'}.srt`;
      }
    } else {
      // Movie format: "Movie Title (2024) - 720p.mp4"
      const base = year ? `${cleanTitle} (${year})` : cleanTitle;

      if (type === 'video') {
        return `${base} - ${quality}p.mp4`;
      } else {
        return `${base} - ${subtitleLang || 'Subtitle'}.srt`;
      }
    }
  };

  const handleDownloadVideo = async () => {
    const source = downloads[selectedQuality];
    if (!source) return;

    setIsDownloading(true);

    try {
      const filename = generateFilename('video');
      const streamUrl = `https://api.sansekai.my.id/api/moviebox/direct-stream?url=${encodeURIComponent(source.url)}`;

      // Import download helper dynamically
      const { startDownload } = await import('@/lib/utils/downloadHelper');

      // Start download (will run in background via Download Manager)
      startDownload(streamUrl, filename, 'video');

      // Close modal immediately (download continues in background)
      toast.success(`Download started: ${filename}`, { duration: 4000 });
      onClose();
    } catch (error) {
      console.error('❌ Download failed:', error);
      toast.error(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadSubtitle = async () => {
    if (selectedSubtitle === null) return;

    const subtitle = captions[selectedSubtitle];
    if (!subtitle) return;

    setIsDownloading(true);

    try {
      const filename = generateFilename('subtitle', subtitle.lanName);

      // Import download helper dynamically
      const { startDownload } = await import('@/lib/utils/downloadHelper');

      // Start subtitle download
      startDownload(subtitle.url, filename, 'subtitle');

      // Close modal
      toast.success(`Subtitle download started: ${filename}`, { duration: 4000 });
      onClose();
    } catch (error) {
      console.error('❌ Subtitle download failed:', error);
      toast.error(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg max-w-md w-full p-6 relative">
        {/* Close Button */}
        <button onClick={onClose} disabled={isDownloading} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition disabled:opacity-50">
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <h2 className="text-2xl font-bold text-white mb-2">Download Options</h2>
        <p className="text-gray-400 text-sm mb-6">{title}</p>

        {isLoading ? (
          <div className="text-center py-8 text-gray-400">Loading download options...</div>
        ) : (
          <div className="space-y-6">
            {/* Video Quality Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Film className="w-4 h-4 inline mr-2" />
                Video Quality
              </label>
              <select
                value={selectedQuality}
                onChange={(e) => setSelectedQuality(parseInt(e.target.value))}
                disabled={isDownloading}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-600 disabled:opacity-50"
              >
                {downloads.map((download, index) => (
                  <option key={index} value={index}>
                    {download.resolution}p - {(parseInt(download.size) / 1024 / 1024).toFixed(2)} MB
                  </option>
                ))}
              </select>
              {downloads.length === 0 && <p className="text-gray-500 text-sm mt-2">No download options available</p>}
              {/* Preview filename */}
              {downloads.length > 0 && <p className="text-xs text-gray-500 mt-2">📝 File: {generateFilename('video')}</p>}
            </div>

            {/* Subtitle Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <FileText className="w-4 h-4 inline mr-2" />
                Subtitle (Optional)
              </label>
              <select
                value={selectedSubtitle ?? ''}
                onChange={(e) => setSelectedSubtitle(e.target.value ? parseInt(e.target.value) : null)}
                disabled={isDownloading}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-600 disabled:opacity-50"
              >
                <option value="">No Subtitle</option>
                {captions.map((caption, index) => (
                  <option key={index} value={index}>
                    {caption.lanName}
                  </option>
                ))}
              </select>
              {/* Preview subtitle filename */}
              {selectedSubtitle !== null && <p className="text-xs text-gray-500 mt-2">📝 File: {generateFilename('subtitle', captions[selectedSubtitle]?.lanName)}</p>}
            </div>

            {/* Download Buttons */}
            <div className="space-y-3 pt-4">
              <button
                onClick={handleDownloadVideo}
                disabled={downloads.length === 0 || isDownloading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition"
              >
                <DownloadIcon className="w-5 h-5" />
                Download Video
              </button>

              {selectedSubtitle !== null && (
                <button
                  onClick={handleDownloadSubtitle}
                  disabled={isDownloading}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white font-semibold rounded-lg transition"
                >
                  <FileText className="w-5 h-5" />
                  Download Subtitle
                </button>
              )}
            </div>

            {/* Info */}
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 text-xs text-gray-400">
              <p className="mb-2">
                💡 <strong>Tips:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Downloads will continue in the background</li>
                <li>Check Download Manager (bottom-right) for progress</li>
                <li>Filenames are auto-generated for easy organization</li>
                <li>Video and subtitle will have matching names</li>
                <li>Most players (VLC, MX Player) auto-load matching subtitles</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
