import { BlurViewProps } from 'expo-blur';

export const glass = {
  intensity: 70,
  tint: 'dark' as BlurViewProps['tint'],
  borderColor: 'rgba(215, 128, 30, 0.7)', /** this is where you change the color of padding button   */
  radius: 10,
} as const;
