import React, { useState, useCallback, useEffect, useRef } from 'react';

interface UploadZoneProps {
  onImage: (file: File) => void;
  maxSize?: number; // bytes
}

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

  // ---- Drag & Drop handlers ----
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

  // ---- Paste handler ----
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

  // ---- File input handler ----
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) validateAndAccept(file);
      // Reset so re-selecting the same file triggers onChange
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
        <span className="upload-icon">🖼️</span>
        <h2 className="upload-title">Upload an image</h2>
        <p className="upload-subtitle">Drag &amp; drop, paste from clipboard, or click to browse</p>
        <button
          className="upload-btn"
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current?.click();
          }}
        >
          Choose Image
        </button>
        <p className="upload-hint">
          Or press <kbd>Ctrl</kbd> + <kbd>V</kbd> to paste
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
