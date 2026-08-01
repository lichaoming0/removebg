const API_BASE = '/api';

export interface RemoveBgResult {
  blob: Blob;
  url: string;
  credits: number;
}

export async function removeBackground(file: File, googleId?: string): Promise<RemoveBgResult> {
  const formData = new FormData();
  formData.append('image', file);
  if (googleId) formData.append('google_id', googleId);

  const response = await fetch(`${API_BASE}/remove-bg`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const json = await response.json();
      message = json.error || message;
    } catch {}
    const err = new Error(message);
    (err as any).status = response.status;
    (err as any).code = (response.status === 402) ? 'NO_CREDITS' : undefined;
    throw err;
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const creditsHeader = response.headers.get('X-Credits');
  const credits = creditsHeader ? parseInt(creditsHeader, 10) : -1;

  return { blob, url, credits };
}
