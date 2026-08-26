import { renderHook, act } from '@testing-library/react-hooks';
import { useDeviceStore } from '../../store/useDeviceStore';

describe('useDeviceStore.filteredDevices', () => {
  beforeEach(() => {
    useDeviceStore.setState({ searchQuery: '' });
  });

  it('returns all devices when search query is empty', () => {
    const { result } = renderHook(() => useDeviceStore());
    expect(result.current.filteredDevices()).toHaveLength(result.current.devices.length);
  });

  it('filters devices by name, case-insensitive', () => {
    const { result } = renderHook(() => useDeviceStore());
    act(() => result.current.setSearchQuery('contractor'));
    expect(result.current.filteredDevices()).toHaveLength(1);
    expect(result.current.filteredDevices()[0].name).toBe('CONTRACTOR');
  });

  it('filters devices by id', () => {
    const { result } = renderHook(() => useDeviceStore());
    act(() => result.current.setSearchQuery('dev-022'));
    expect(result.current.filteredDevices()[0].id).toBe('DEV-022');
  });

  it('returns empty array when nothing matches', () => {
    const { result } = renderHook(() => useDeviceStore());
    act(() => result.current.setSearchQuery('nonexistent'));
    expect(result.current.filteredDevices()).toHaveLength(0);
  });
});
