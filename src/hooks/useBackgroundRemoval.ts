import { useState, useCallback } from 'react';
import { removeBackground } from '../api/client';

export function useBackgroundRemoval() {
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const process = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setResultBlob(null);
    setResultUrl(null);

    try {
      const result = await removeBackground(file);
      setResultBlob(result.blob);
      setResultUrl(result.url);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultBlob(null);
    setResultUrl(null);
    setLoading(false);
    setError(null);
  }, [resultUrl]);

  return { resultBlob, resultUrl, loading, error, process, reset };
}
