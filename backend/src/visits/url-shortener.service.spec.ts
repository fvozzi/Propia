import { afterEach, describe, expect, it, vi } from 'vitest';
import { UrlShortenerService } from './url-shortener.service';

describe('UrlShortenerService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses and caches a valid is.gd response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue('https://is.gd/abc123'),
    });
    vi.stubGlobal('fetch', fetchMock);
    const service = new UrlShortenerService();

    await expect(service.shortenOrOriginal('https://example.com/long')).resolves.toBe(
      'https://is.gd/abc123',
    );
    await expect(service.shortenOrOriginal('https://example.com/long')).resolves.toBe(
      'https://is.gd/abc123',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to the original destination when shortening fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const service = new UrlShortenerService();

    await expect(service.shortenOrOriginal('https://example.com/long')).resolves.toBe(
      'https://example.com/long',
    );
  });
});
