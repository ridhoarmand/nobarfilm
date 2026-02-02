import { useDownloadStore } from '../store/downloadStore';
export async function startDownload(url: string, filename: string, type: 'video' | 'subtitle', onProgress?: (progress: number) => void): Promise<void> {
  const { addTask, updateTask, removeTask } = useDownloadStore.getState();

  console.log(`📥 Starting ${type} download:`, filename);

  try {
    // Fetch the stream
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const contentLength = response.headers.get('content-length');
    const totalSize = contentLength ? parseInt(contentLength) : 0;

    // Add to download manager
    const taskId = addTask({
      filename,
      type,
      url,
      totalSize,
      abortController: new AbortController(),
    });

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let downloadedSize = 0;

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      chunks.push(value);
      downloadedSize += value.length;

      const progress = totalSize > 0 ? Math.round((downloadedSize / totalSize) * 100) : 0;

      updateTask(taskId, {
        progress,
        downloadedSize,
        chunks,
      });

      if (onProgress) {
        onProgress(progress);
      }
    }

    console.log('✅ Download complete, creating blob...');

    // Create blob
    const blob = new Blob(chunks as BlobPart[], {
      type: type === 'video' ? 'video/mp4' : 'text/plain',
    });

    // Trigger download
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);

    console.log('✅ File saved:', filename);

    // Mark as completed
    updateTask(taskId, { status: 'completed', progress: 100 });

    // Auto-remove after 3 seconds
    setTimeout(() => {
      removeTask(taskId);
    }, 3000);
  } catch (error) {
    console.error('❌ Download failed:', error);
    throw error;
  }
}
