export interface ParsedActivityPreviewMetadata {
  imageUrl: string | null;
  title: string | null;
  description: string | null;
  domain: string | null;
}

export function parseActivityPreviewMetadata(html: string, pageUrl: string): ParsedActivityPreviewMetadata {
  const metaTags = extractMetaTags(html);
  const imageUrl = resolveUrl(
    firstNonEmpty(
      metaTags['og:image'],
      metaTags['og:image:url'],
      metaTags['twitter:image'],
      metaTags['twitter:image:src'],
    ),
    pageUrl,
  );
  const title = firstNonEmpty(metaTags['og:title'], metaTags['twitter:title'], extractTitleTag(html));
  const description = firstNonEmpty(
    metaTags['og:description'],
    metaTags.description,
    metaTags['twitter:description'],
  );

  return {
    imageUrl,
    title,
    description,
    domain: extractDomain(pageUrl),
  };
}

export function extractDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./i, '');
  } catch {
    return null;
  }
}

function extractMetaTags(html: string) {
  const values: Record<string, string> = {};
  const metaRegex = /<meta\b[^>]*>/gi;

  for (const match of html.matchAll(metaRegex)) {
    const tag = match[0];
    const attrs = extractAttributes(tag);
    const key = (attrs.property || attrs.name || '').trim().toLowerCase();
    const content = cleanValue(attrs.content || '');

    if (key && content && !(key in values)) {
      values[key] = content;
    }
  }

  return values;
}

function extractAttributes(tag: string) {
  const values: Record<string, string> = {};
  const attrRegex = /([a-zA-Z:_-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g;

  for (const match of tag.matchAll(attrRegex)) {
    const key = match[1].toLowerCase();
    const value = match[3] ?? match[4] ?? match[5] ?? '';
    values[key] = value;
  }

  return values;
}

function extractTitleTag(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return cleanValue(match?.[1] ?? '');
}

function firstNonEmpty(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const cleaned = cleanValue(value ?? '');
    if (cleaned) {
      return cleaned;
    }
  }

  return null;
}

function cleanValue(value: string) {
  if (!value) {
    return null;
  }

  const normalized = decodeHtmlEntities(value)
    .replace(/\s+/g, ' ')
    .trim();
  return normalized.length > 0 ? normalized : null;
}

function resolveUrl(value: string | null, pageUrl: string) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value, pageUrl).href;
  } catch {
    return null;
  }
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCharCode(Number.parseInt(code, 16)));
}
