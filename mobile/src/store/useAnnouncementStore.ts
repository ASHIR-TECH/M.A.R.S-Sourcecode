import { create } from 'zustand';

export interface Announcement {
  title: string;
  message: string;
}

interface AnnouncementState {
  /** Null until a real announcement arrives — Home must not render a placeholder
   * banner, because the fake card pushed the whole page down for nothing. */
  announcement: Announcement | null;
  setAnnouncement: (announcement: Announcement | null) => void;
}

export const useAnnouncementStore = create<AnnouncementState>((set) => ({
  announcement: null,
  setAnnouncement: (announcement) => set({ announcement }),
}));
