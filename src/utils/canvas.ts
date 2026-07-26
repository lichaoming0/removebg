/**
 * Composite a foreground image onto a background (solid color or image).
 * Returns a Blob URL of the composited result.
 */

export type BackgroundOption =
  | { type: 'color'; value: string }
  | { type: 'image'; file: File; imageUrl: string }
  | { type: 'transparent' };

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

export async function compositeImage(
  foregroundUrl: string,
  background: BackgroundOption,
): Promise<string> {
  const foreground = await loadImage(foregroundUrl);
  const width = foreground.naturalWidth;
  const height = foreground.naturalHeight;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  if (background.type === 'transparent') {
    // Draw foreground directly, keep transparency
    ctx.drawImage(foreground, 0, 0, width, height);
  } else if (background.type === 'color') {
    // Fill with solid color
    ctx.fillStyle = background.value;
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(foreground, 0, 0, width, height);
  } else if (background.type === 'image') {
    // Draw background image covered, then foreground on top
    const bgImage = await loadImage(background.imageUrl);
    const scale = Math.max(width / bgImage.naturalWidth, height / bgImage.naturalHeight);
    const sw = bgImage.naturalWidth * scale;
    const sh = bgImage.naturalHeight * scale;
    const sx = (width - sw) / 2;
    const sy = (height - sh) / 2;
    ctx.drawImage(bgImage, sx, sy, sw, sh);
    ctx.drawImage(foreground, 0, 0, width, height);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas toBlob failed'));
        return;
      }
      // Revoke old URL? Caller manages cleanup.
      resolve(URL.createObjectURL(blob));
    }, 'image/png');
  });
}

/**
 * Trigger a file download in the browser.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
