import { Device } from '../types/device';

export const mockDevices: Device[] = [
  {
    id: 'DEV-091',
    name: 'CONTRACTOR',
    os: 'Kali Linux',
    status: 'online',
    lastSeen: 'Just Now',
  },
  {
    id: 'DEV-022',
    name: 'WORK-LAPTOP',
    os: 'Windows 11 Pro',
    status: 'idle',
    lastSeen: '14m ago',
  },
  {
    id: 'DEV-034',
    name: 'HOMELAB',
    os: 'Ubuntu Server',
    status: 'online',
    lastSeen: '2m ago',
  },
  {
    id: 'DEV-015',
    name: 'ORBIT-ONE',
    os: 'Android 14',
    status: 'offline',
    lastSeen: '1d ago',
  },
];
