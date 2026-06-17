const SAFE_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:'];

/**
 * Return href only if it is a safe link: an in-page anchor, a root-relative path,
 * or an absolute URL on an allowed protocol. Anything else (javascript:, data:, ...)
 * collapses to '#' so it can never execute script.
 */
export function safeHref(href: string | null | undefined): string {
  if (!href) return '#';
  const value = href.trim();
  if (value.startsWith('#') || value.startsWith('/')) return value;
  try {
    const url = new URL(value);
    return SAFE_PROTOCOLS.includes(url.protocol) ? value : '#';
  } catch {
    return '#';
  }
}
