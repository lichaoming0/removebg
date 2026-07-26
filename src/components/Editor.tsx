import React, { useEffect } from 'react';
import ImagePreview from './ImagePreview';
import BackgroundPicker from './BackgroundPicker';
import Toolbar from './Toolbar';
import ErrorBanner from './ErrorBanner';
import { compositeImage, downloadBlob } from '../utils/canvas';
import type { BackgroundOption } from '../utils/canvas';

interface EditorProps {
  original: File;
  originalUrl: string;
  phase: 'uploaded' | 'processing' | 'done' | 'error';
  resultUrl?: string | null;
  resultBlob?: Blob | null;
  error?: string | null;
  onRemoveBg: () => void;
  onReset: () => void;
}

const Editor: React.FC<EditorProps> = ({
  original,
  originalUrl,
  phase,
  resultUrl,
  resultBlob,
  error,
  onRemoveBg,
  onReset,
}) => {
  // Background state
  const [background, setBackground] = React.useState<BackgroundOption>({ type: 'transparent' });
  const [compositeUrl, setCompositeUrl] = React.useState<string | null>(null);
  const [compositing, setCompositing] = React.useState(false);

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
        if (!cancelled) {
          // Revoke previous composite URL
          if (compositeUrl) URL.revokeObjectURL(compositeUrl);
          setCompositeUrl(url);
        }
      })
      .catch(() => {
        if (!cancelled) setCompositeUrl(resultUrl); // fallback to raw result
      })
      .finally(() => {
        if (!cancelled) setCompositing(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultUrl, background]);

  // Cleanup composite URL on unmount
  useEffect(() => {
    return () => {
      if (compositeUrl) URL.revokeObjectURL(compositeUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDownload = async () => {
    if (!compositeUrl) return;
    try {
      const response = await fetch(compositeUrl);
      const blob = await response.blob();
      const originalName = original.name.replace(/\.[^.]+$/, '');
      downloadBlob(blob, `${originalName}_no_bg.png`);
    } catch {
      // Fallback: try direct blob if available
      if (resultBlob) {
        const originalName = original.name.replace(/\.[^.]+$/, '');
        downloadBlob(resultBlob, `${originalName}_no_bg.png`);
      }
    }
  };

  // Compute background style for the preview pane
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
          disabled={compositing}
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
