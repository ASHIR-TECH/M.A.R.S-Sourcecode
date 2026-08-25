import { BlurViewProps } from 'expo-blur';

export const glass = {
  intensity: 70,
  tint: 'dark' as BlurViewProps['tint'],
  borderColor: 'rgba(232,163,77,0.4)',
  radius: 10,
} as const;
