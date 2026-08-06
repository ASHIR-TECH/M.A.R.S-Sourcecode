import { apiFetch, AppError, setUnauthorizedHandler } from '@/api/client';
import * as storage from '@/api/storage';

jest.mock('@/api/storage', () => ({
  loadApiUrl: jest.fn(),
  loadToken: jest.fn(),
  saveCredentials: jest.fn(),
  clearCredentials: jest.fn(),
  invalidateCredentialsCache: jest.fn(),
  API_URL_KEY: 'adtp_api_url',
  TOKEN_KEY: 'adtp_api_token',
}));

const mockFetch = jest.fn();

describe('apiFetch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = mockFetch;
  });

  it('injects the Bearer token and returns JSON', async () => {
    (storage.loadApiUrl as jest.Mock).mockResolvedValue('http://host:40003');
    (storage.loadToken as jest.Mock).mockResolvedValue('secret');
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ status: 'ok' }),
    });

    const result = await apiFetch<{ status: string }>('/api/v1/health');
    expect(result).toEqual({ status: 'ok' });

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('http://host:40003/api/v1/health');
    expect(init.headers.Authorization).toBe('Bearer secret');
  });

  it('strips trailing slashes from the base URL', async () => {
    (storage.loadApiUrl as jest.Mock).mockResolvedValue('http://host:40003/');
    (storage.loadToken as jest.Mock).mockResolvedValue(null);
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ status: 'ok' }),
    });

    await apiFetch('/api/v1/health');
    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe('http://host:40003/api/v1/health');
  });

  it('maps a network failure to a typed NetworkError (code NETWORK)', async () => {
    (storage.loadApiUrl as jest.Mock).mockResolvedValue('http://host:40003');
    (storage.loadToken as jest.Mock).mockResolvedValue('secret');
    mockFetch.mockRejectedValue(new TypeError('Network request failed'));

    await expect(apiFetch('/api/v1/health')).rejects.toMatchObject({
      code: 'NETWORK',
    });
  });

  it('throws AppError with the HTTP status for non-2xx responses', async () => {
    (storage.loadApiUrl as jest.Mock).mockResolvedValue('http://host:40003');
    (storage.loadToken as jest.Mock).mockResolvedValue('secret');
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      headers: { get: () => 'application/json' },
    });

    await expect(apiFetch('/api/v1/transfers')).rejects.toMatchObject({
      code: 'HTTP',
      status: 500,
    });
  });

  it('triggers the unauthorized handler and clears the session on 401', async () => {
    (storage.loadApiUrl as jest.Mock).mockResolvedValue('http://host:40003');
    (storage.loadToken as jest.Mock).mockResolvedValue('secret');
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      headers: { get: () => 'application/json' },
    });

    const handler = jest.fn();
    setUnauthorizedHandler(handler);

    await expect(apiFetch('/api/v1/transfers')).rejects.toMatchObject({
      code: 'AUTH',
      status: 401,
    });
    expect(handler).toHaveBeenCalledWith('401');

    setUnauthorizedHandler(null);
  });

  it('throws AUTH when no desktop peer is configured', async () => {
    (storage.loadApiUrl as jest.Mock).mockResolvedValue(null);
    (storage.loadToken as jest.Mock).mockResolvedValue(null);

    await expect(apiFetch('/api/v1/transfers')).rejects.toMatchObject({
      code: 'AUTH',
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('AppError', () => {
  it('carries code and status', () => {
    const err = new AppError('HTTP', 'boom', 500);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('AppError');
    expect(err.code).toBe('HTTP');
    expect(err.status).toBe(500);
  });
});
