import { useState, useCallback } from 'react';
import { removeBackground } from '../api/client';

export function useBackgroundRemoval() {
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const process = useCallback(async (file: File, googleId?: string) => {
    setLoading(true);
    setError(null);
    setErrorCode(null);
    setResultBlob(null);
    setResultUrl(null);

    try {
      const result = await removeBackground(file, googleId);
      setResultBlob(result.blob);
      setResultUrl(result.url);
      return result.credits;
    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setErrorCode(err.code || null);
      throw err;
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
    setErrorCode(null);
  }, [resultUrl]);

  return { resultBlob, resultUrl, loading, error, errorCode, process, reset };
}
