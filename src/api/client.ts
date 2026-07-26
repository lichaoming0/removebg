const API_BASE = '/api';

export interface RemoveBgResult {
  blob: Blob;
  url: string;
}

export interface RemoveBgError {
  error: string;
}

export async function removeBackground(file: File): Promise<RemoveBgResult> {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`${API_BASE}/remove-bg`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    // Try to parse JSON error
    let message = `Request failed (${response.status})`;
    try {
      const json = await response.json();
      message = json.error || message;
    } catch {
      // response body is not JSON; use default message
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);

  return { blob, url };
}
