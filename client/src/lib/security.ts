const SAFE_IMAGE_DATA_URL_RE = /^data:image\/(?:png|jpe?g|gif|webp);base64,[a-z0-9+/=\s]+$/i;

export function isAllowedImageMimeType(mimeType: string): boolean {
  const normalized = mimeType.toLowerCase();
  return (
    normalized === 'image/png' ||
    normalized === 'image/jpeg' ||
    normalized === 'image/jpg' ||
    normalized === 'image/gif' ||
    normalized === 'image/webp'
  );
}

export function isSafeImageDataUrl(value: string): boolean {
  return SAFE_IMAGE_DATA_URL_RE.test(value.trim());
}

export function sanitizeCustomCss(value: string): string {
  return value
    .replace(/@import[^;]*;/gi, '')
    .replace(/expression\s*\([^)]*\)/gi, '')
    .replace(/url\(\s*['"]?\s*javascript:[^)]+?\)/gi, 'url()');
}
