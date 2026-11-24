import { create } from 'zustand';

export interface UploadItem {
  id: string;
  name: string;
  /** Local file URI, used for the preview thumbnail while uploading. */
  uri?: string;
  size?: number;
  startedAt: number;
  /** Estimated seconds for the countdown; the bar eases toward it. */
  estimatedSeconds: number;
  status: 'uploading' | 'sent' | 'failed';
  error?: string;
}

interface UploadState {
  uploads: UploadItem[];
  start: (input: { name: string; uri?: string; size?: number }) => string;
  markSent: (id: string) => void;
  markFailed: (id: string, error?: string) => void;
  dismiss: (id: string) => void;
}

/** ~350 KB/s over a phone uplink, clamped so the countdown always feels alive. */
function estimateSeconds(size?: number): number {
  const kilobytes = Math.max(0, size ?? 0) / 1024;
  return Math.min(45, Math.max(3, Math.round(kilobytes / 350) + 2));
}

let counter = 0;

export const useUploadStore = create<UploadState>((set) => ({
  uploads: [],
  start: ({ name, uri, size }) => {
    const id = `upload-${Date.now()}-${counter++}`;
    set((state) => ({
      uploads: [
        ...state.uploads,
        {
          id,
          name,
          uri,
          size,
          startedAt: Date.now(),
          estimatedSeconds: estimateSeconds(size),
          status: 'uploading',
        },
      ],
    }));
    return id;
  },
  markSent: (id) =>
    set((state) => ({
      uploads: state.uploads.map((upload) =>
        upload.id === id ? { ...upload, status: 'sent' as const } : upload
      ),
    })),
  markFailed: (id, error) =>
    set((state) => ({
      uploads: state.uploads.map((upload) =>
        upload.id === id ? { ...upload, status: 'failed' as const, error } : upload
      ),
    })),
  dismiss: (id) =>
    set((state) => ({ uploads: state.uploads.filter((upload) => upload.id !== id) })),
}));
