'use client';
import { useDownloadStore } from '@/lib/store/downloadStore';
import { X, Download, Pause, Play, Trash2 } from 'lucide-react';
import { useState } from 'react';

export function DownloadManager() {
  const [isOpen, setIsOpen] = useState(false);
  const { tasks, removeTask, pauseTask, resumeTask } = useDownloadStore();

  const activeTasks = tasks.filter((t) => t.status !== 'completed');

  if (activeTasks.length === 0 && !isOpen) return null;

  return (
    <>
      {/* Floating Download Button */}
      {activeTasks.length > 0 && !isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg transition-all hover:scale-105"
        >
          <Download className="w-5 h-5 animate-bounce" />
          <span className="font-semibold">{activeTasks.length} downloading</span>
        </button>
      )}

      {/* Download Manager Panel */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 z-50 w-full md:w-96 bg-zinc-900 border-t md:border-l border-zinc-700 shadow-2xl max-h-[70vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-700">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Download className="w-5 h-5" />
              Downloads ({tasks.length})
            </h3>
            <button onClick={() => setIsOpen(false)} className="p-2 text-gray-400 hover:text-white transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tasks List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Download className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No downloads</p>
              </div>
            ) : (
              tasks.map((task) => (
                <div key={task.id} className="bg-zinc-800 rounded-lg p-3 space-y-2">
                  {/* Filename */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{task.filename}</p>
                      <p className="text-xs text-gray-400">
                        {task.status === 'completed'
                          ? 'Completed'
                          : task.status === 'failed'
                            ? 'Failed'
                            : task.status === 'paused'
                              ? 'Paused'
                              : `${task.progress}% • ${(task.downloadedSize / 1024 / 1024).toFixed(1)}MB / ${(task.totalSize / 1024 / 1024).toFixed(1)}MB`}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1">
                      {task.status === 'downloading' && (
                        <button onClick={() => pauseTask(task.id)} className="p-1.5 text-gray-400 hover:text-white transition" title="Pause">
                          <Pause className="w-4 h-4" />
                        </button>
                      )}
                      {task.status === 'paused' && (
                        <button onClick={() => resumeTask(task.id)} className="p-1.5 text-gray-400 hover:text-white transition" title="Resume">
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => removeTask(task.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition" title="Remove">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {task.status !== 'completed' && (
                    <div className="w-full bg-zinc-700 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${task.status === 'failed' ? 'bg-red-500' : task.status === 'paused' ? 'bg-yellow-500' : 'bg-red-600'}`}
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
