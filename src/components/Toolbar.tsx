import React from 'react';

interface ToolbarProps {
  phase: 'uploaded' | 'processing' | 'done' | 'error';
  onRemoveBg: () => void;
  onDownload: () => void;
  onReset: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ phase, onRemoveBg, onDownload, onReset }) => (
  <div className="toolbar">
    {phase === 'uploaded' && (
      <button className="toolbar-btn primary" onClick={onRemoveBg}>
        ✨ Remove Background
      </button>
    )}

    {phase === 'processing' && (
      <button className="toolbar-btn primary" disabled>
        <span className="spinner" />
        Processing...
      </button>
    )}

    {phase === 'done' && (
      <>
        <button className="toolbar-btn primary" onClick={onDownload}>
          ⬇ Download Result
        </button>
        <button className="toolbar-btn secondary" onClick={onRemoveBg}>
          🔄 Process Again
        </button>
      </>
    )}

    {phase === 'error' && (
      <button className="toolbar-btn primary" onClick={onRemoveBg}>
        🔄 Retry
      </button>
    )}

    {(phase === 'uploaded' || phase === 'done' || phase === 'error') && (
      <button className="toolbar-btn secondary" onClick={onReset}>
        ✕ New Image
      </button>
    )}
  </div>
);

export default Toolbar;
