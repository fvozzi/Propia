import { Injectable } from '@nestjs/common';

@Injectable()
export class UrlShortenerService {
  private readonly cache = new Map<string, string>();

  async shortenOrOriginal(targetUrl: string) {
    const cached = this.cache.get(targetUrl);
    if (cached) return cached;

    try {
      const response = await fetch('https://is.gd/create.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          format: 'simple',
          url: targetUrl,
        }),
        signal: AbortSignal.timeout(5000),
      });
      const shortenedUrl = (await response.text()).trim();

      if (!response.ok || !isValidShortUrl(shortenedUrl)) {
        return targetUrl;
      }

      if (this.cache.size >= 1000) {
        const oldestKey = this.cache.keys().next().value;
        if (oldestKey) this.cache.delete(oldestKey);
      }
      this.cache.set(targetUrl, shortenedUrl);
      return shortenedUrl;
    } catch {
      return targetUrl;
    }
  }
}

function isValidShortUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && (url.hostname === 'is.gd' || url.hostname === 'www.is.gd');
  } catch {
    return false;
  }
}
