import React, { useState, useCallback, useEffect, useRef } from 'react';

interface UploadZoneProps {
  onImage: (file: File) => void;
  maxSize?: number;
}

const UploadIconSvg = () => (
  <svg
    className="upload-icon-svg"
    viewBox="0 0 96 96"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="upGrad" x1="0" y1="0" x2="96" y2="96">
        <stop offset="0%" stopColor="#7c3aed" />
        <stop offset="100%" stopColor="#3b82f6" />
      </linearGradient>
    </defs>
    {/* Outer ring */}
    <circle cx="48" cy="48" r="44" stroke="url(#upGrad)" strokeWidth="2" opacity="0.12" fill="none" />
    <circle cx="48" cy="48" r="36" fill="url(#upGrad)" opacity="0.06" />
    {/* Arrow up */}
    <path
      d="M48 28v32M36 40l12-12 12 12"
      stroke="url(#upGrad)"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Image frame */}
    <rect x="22" y="44" width="52" height="32" rx="5" stroke="url(#upGrad)" strokeWidth="2.5" fill="#fff" opacity="0.8" />
    {/* Mountain inside image */}
    <path d="M22 66l14-12 7 7 11-16 18 21H22z" fill="url(#upGrad)" opacity="0.15" />
    <circle cx="42" cy="53" r="4" fill="url(#upGrad)" opacity="0.45" />
  </svg>
);

const UploadZone: React.FC<UploadZoneProps> = ({ onImage, maxSize = 10 * 1024 * 1024 }) => {
  const [dragOver, setDragOver] = useState(false);
  const [sizeError, setSizeError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndAccept = useCallback(
    (file: File) => {
      setSizeError(null);
      if (!file.type.startsWith('image/')) {
        setSizeError('Please upload an image file.');
        return;
      }
      if (file.size > maxSize) {
        setSizeError(`File is too large. Maximum size is ${maxSize / (1024 * 1024)} MB.`);
        return;
      }
      onImage(file);
    },
    [onImage, maxSize],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      const items = e.dataTransfer.items;
      if (items) {
        const imageItem = Array.from(items).find((item) => item.type.startsWith('image/'));
        if (imageItem) {
          const file = imageItem.getAsFile();
          if (file) validateAndAccept(file);
        }
      } else if (e.dataTransfer.files.length > 0) {
        validateAndAccept(e.dataTransfer.files[0]);
      }
    },
    [validateAndAccept],
  );

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageItem = Array.from(items).find((item) => item.type.startsWith('image/'));
      if (imageItem) {
        e.preventDefault();
        const file = imageItem.getAsFile();
        if (file) validateAndAccept(file);
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [validateAndAccept]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) validateAndAccept(file);
      e.target.value = '';
    },
    [validateAndAccept],
  );

  return (
    <div className="upload-zone">
      <div
        className={`upload-drop-area ${dragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <UploadIconSvg />
        <h2 className="upload-title">Upload an image</h2>
        <p className="upload-subtitle">Drag &amp; drop, paste from clipboard, or click to browse</p>
        <button
          className="upload-btn"
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current?.click();
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Choose Image
        </button>
        <p className="upload-hint">
          Or press <kbd>Ctrl</kbd> + <kbd>V</kbd> to paste from clipboard
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>
      {sizeError && (
        <p style={{ color: 'var(--color-error)', fontSize: 14, marginTop: 12, textAlign: 'center' }}>
          {sizeError}
        </p>
      )}
    </div>
  );
};

export default UploadZone;
