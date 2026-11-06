import { displayDeviceName } from './deviceName';

describe('displayDeviceName', () => {
  it('prettifies an adtp-prefixed hostname', () => {
    expect(displayDeviceName('adtp-kali')).toBe('Kali');
    expect(displayDeviceName('ADTP-Kali')).toBe('Kali');
    expect(displayDeviceName('adtp_my-rig')).toBe('My Rig');
  });

  it('leaves user names alone', () => {
    expect(displayDeviceName('Studio Rig')).toBe('Studio Rig');
    expect(displayDeviceName('ZEUS')).toBe('ZEUS');
  });

  it('falls back for empty names', () => {
    expect(displayDeviceName('')).toBe('Device');
    expect(displayDeviceName(undefined)).toBe('Device');
  });
});
