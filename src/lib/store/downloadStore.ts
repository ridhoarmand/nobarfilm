'use client';
import { create } from 'zustand';

export interface DownloadTask {
  id: string;
  filename: string;
  type: 'video' | 'subtitle';
  url: string;
  progress: number;
  status: 'downloading' | 'paused' | 'completed' | 'failed';
  totalSize: number;
  downloadedSize: number;
  abortController?: AbortController;
  chunks?: Uint8Array[];
}

interface DownloadStore {
  tasks: DownloadTask[];
  addTask: (task: Omit<DownloadTask, 'id' | 'progress' | 'status' | 'downloadedSize' | 'chunks'>) => string;
  updateTask: (id: string, updates: Partial<DownloadTask>) => void;
  removeTask: (id: string) => void;
  pauseTask: (id: string) => void;
  resumeTask: (id: string) => void;
}

export const useDownloadStore = create<DownloadStore>((set, get) => ({
  tasks: [],

  addTask: (task) => {
    const id = `download-${Date.now()}-${Math.random()}`;
    const newTask: DownloadTask = {
      ...task,
      id,
      progress: 0,
      status: 'downloading',
      downloadedSize: 0,
      chunks: [],
    };
    set((state) => ({ tasks: [...state.tasks, newTask] }));
    return id;
  },

  updateTask: (id, updates) => {
    set((state) => ({
      tasks: state.tasks.map((task) => (task.id === id ? { ...task, ...updates } : task)),
    }));
  },

  removeTask: (id) => {
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== id),
    }));
  },

  pauseTask: (id) => {
    const task = get().tasks.find((t) => t.id === id);
    if (task?.abortController) {
      task.abortController.abort();
    }
    get().updateTask(id, { status: 'paused' });
  },

  resumeTask: (id) => {
    get().updateTask(id, {
      status: 'downloading',
      abortController: new AbortController(),
    });
  },
}));
