import React from 'react';

interface ImagePreviewProps {
  originalUrl: string;
  resultUrl?: string | null;
  loading?: boolean;
  backgroundStyle?: React.CSSProperties;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({
  originalUrl,
  resultUrl,
  loading = false,
  backgroundStyle,
}) => (
  <div className="preview-container">
    {/* Original */}
    <div className="preview-pane">
      <p className="preview-label">Original</p>
      <div className="preview-image-wrap">
        <img className="preview-image" src={originalUrl} alt="Original" />
      </div>
    </div>

    {/* Result */}
    <div className="preview-pane">
      <p className="preview-label">Result</p>
      <div
        className={`preview-image-wrap ${loading ? 'processing' : ''} ${resultUrl && backgroundStyle ? 'with-bg' : ''}`}
        style={resultUrl && backgroundStyle ? { background: undefined, ...backgroundStyle } : undefined}
      >
        {loading && <span className="spinner dark" />}
        {resultUrl ? (
          <img className="preview-image" src={resultUrl} alt="Result" />
        ) : (
          !loading && <span className="preview-placeholder">Processing result will appear here</span>
        )}
      </div>
    </div>
  </div>
);

export default ImagePreview;
