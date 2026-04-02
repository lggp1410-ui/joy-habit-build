/**
 * Converts an image URL to a Base64 data URI.
 * Uses a canvas to draw the image and export as PNG.
 * Falls back to the original URL if conversion fails.
 */
export async function urlToBase64(url: string): Promise<string> {
  // Already a data URI — return as-is
  if (url.startsWith('data:')) return url;

  // Skip non-http URLs
  if (!url.startsWith('http')) return url;

  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const loaded = await new Promise<HTMLImageElement>((resolve, reject) => {
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = url;
    });

    const canvas = document.createElement('canvas');
    // Cap at 64x64 to keep Base64 strings small
    const maxSize = 128;
    const scale = Math.min(maxSize / loaded.naturalWidth, maxSize / loaded.naturalHeight, 1);
    canvas.width = Math.round(loaded.naturalWidth * scale);
    canvas.height = Math.round(loaded.naturalHeight * scale);

    const ctx = canvas.getContext('2d');
    if (!ctx) return url;

    ctx.drawImage(loaded, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } catch {
    console.warn('Base64 conversion failed for:', url);
    return url;
  }
}

/** Check if a string is already a base64 data URI */
export function isBase64Icon(icon: string): boolean {
  return icon.startsWith('data:');
}
