import React, { useEffect, useCallback, useRef, useState } from 'react';
import ImagePreview from './ImagePreview';
import BackgroundPicker from './BackgroundPicker';
import Toolbar from './Toolbar';
import ErrorBanner from './ErrorBanner';
import { compositeImage } from '../utils/canvas';
import type { BackgroundOption } from '../utils/canvas';

interface EditorProps {
  original: File;
  originalUrl: string;
  phase: 'uploaded' | 'processing' | 'done' | 'error';
  resultUrl?: string | null;
  error?: string | null;
  onRemoveBg: () => void;
  onReset: () => void;
}

const Editor: React.FC<EditorProps> = ({
  original,
  originalUrl,
  phase,
  resultUrl,
  error,
  onRemoveBg,
  onReset,
}) => {
  const [background, setBackground] = useState<BackgroundOption>({ type: 'transparent' });
  const [compositeUrl, setCompositeUrl] = useState<string | null>(null);
  const [compositing, setCompositing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Track previous composite URL for cleanup
  const prevCompositeRef = useRef<string | null>(null);

  // Re-composite whenever result or background changes
  useEffect(() => {
    let cancelled = false;
    if (!resultUrl) {
      setCompositeUrl(null);
      return;
    }

    setCompositing(true);
    compositeImage(resultUrl, background)
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        if (prevCompositeRef.current) URL.revokeObjectURL(prevCompositeRef.current);
        prevCompositeRef.current = url;
        setCompositeUrl(url);
      })
      .catch(() => {
        if (!cancelled) setCompositeUrl(resultUrl);
      })
      .finally(() => {
        if (!cancelled) setCompositing(false);
      });

    return () => { cancelled = true; };
    // compositeUrl intentionally omitted from deps — we use ref for cleanup
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultUrl, background]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (prevCompositeRef.current) URL.revokeObjectURL(prevCompositeRef.current);
    };
  }, []);

  // Download: always composite fresh from the raw result to avoid stale URLs
  const handleDownload = useCallback(async () => {
    const sourceUrl = resultUrl;
    if (!sourceUrl) return;

    setDownloading(true);
    try {
      const downloadUrl = await compositeImage(sourceUrl, background);
      const originalName = original.name.replace(/\.[^.]+$/, '');
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${originalName}_no_bg.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Delay revoke so browser can start the download
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    } catch {
      // Fallback: download raw result directly
      const originalName = original.name.replace(/\.[^.]+$/, '');
      const a = document.createElement('a');
      a.href = sourceUrl;
      a.download = `${originalName}_no_bg.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setDownloading(false);
    }
  }, [resultUrl, background, original.name]);

  const backgroundStyle: React.CSSProperties | undefined =
    background.type === 'color'
      ? { backgroundColor: background.value }
      : background.type === 'image'
        ? {
            backgroundImage: `url(${background.imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }
        : undefined;

  return (
    <div className="editor">
      <ImagePreview
        originalUrl={originalUrl}
        resultUrl={compositeUrl || resultUrl}
        loading={phase === 'processing' || compositing}
        backgroundStyle={backgroundStyle}
      />

      {phase === 'done' && (
        <BackgroundPicker
          value={background}
          onChange={setBackground}
          disabled={compositing || downloading}
        />
      )}

      <Toolbar
        phase={phase}
        onRemoveBg={onRemoveBg}
        onDownload={handleDownload}
        onReset={onReset}
      />

      {phase === 'error' && error && (
        <ErrorBanner
          message={error}
          onDismiss={() => {}}
          onRetry={onRemoveBg}
        />
      )}
    </div>
  );
};

export default Editor;
