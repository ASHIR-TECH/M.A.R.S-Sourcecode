import { aiFunctionUrl, disposeAiClient, initAiClient, isAiLinkReady } from './aiClient';

const originalUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

describe('aiClient', () => {
  afterEach(() => {
    if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    else process.env.EXPO_PUBLIC_SUPABASE_URL = originalUrl;
    disposeAiClient();
    jest.clearAllMocks();
  });

  it('reports no link when the Supabase URL is absent', () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    expect(aiFunctionUrl()).toBe('');
    expect(isAiLinkReady()).toBe(false);
  });

  it('points at the deployed qwen-chat function', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://yiaknrtvtgtmbgzhdlru.supabase.co/';
    expect(aiFunctionUrl()).toBe(
      'https://yiaknrtvtgtmbgzhdlru.supabase.co/functions/v1/qwen-chat'
    );
  });

  it('never links while Supabase itself is unconfigured', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    expect(isAiLinkReady()).toBe(false);
  });

  it('is safe to initialise and tear down repeatedly', () => {
    expect(() => {
      initAiClient();
      disposeAiClient();
      initAiClient();
      disposeAiClient();
    }).not.toThrow();
  });
});
