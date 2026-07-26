import React, { useReducer, useCallback, useRef } from 'react';
import Header from './Header';
import UploadZone from './UploadZone';
import Editor from './Editor';
import { useBackgroundRemoval } from '../hooks/useBackgroundRemoval';

// ---- State machine ----
type AppState =
  | { phase: 'idle' }
  | { phase: 'uploaded'; original: File; originalUrl: string }
  | { phase: 'processing'; original: File; originalUrl: string }
  | { phase: 'done'; original: File; originalUrl: string }
  | { phase: 'error'; original: File; originalUrl: string; error: string };

type AppAction =
  | { type: 'UPLOAD'; file: File; url: string }
  | { type: 'START_PROCESSING' }
  | { type: 'PROCESS_SUCCESS' }
  | { type: 'PROCESS_ERROR'; error: string }
  | { type: 'RESET' };

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'UPLOAD':
      // Clean up old blob URL if any
      if (state.phase !== 'idle') {
        URL.revokeObjectURL(state.originalUrl);
      }
      return { phase: 'uploaded', original: action.file, originalUrl: action.url };

    case 'START_PROCESSING':
      if (state.phase !== 'uploaded' && state.phase !== 'done' && state.phase !== 'error') return state;
      return { phase: 'processing', original: state.original, originalUrl: state.originalUrl };

    case 'PROCESS_SUCCESS':
      if (state.phase !== 'processing') return state;
      return { phase: 'done', original: state.original, originalUrl: state.originalUrl };

    case 'PROCESS_ERROR':
      if (state.phase !== 'processing') return state;
      return {
        phase: 'error',
        original: state.original,
        originalUrl: state.originalUrl,
        error: action.error,
      };

    case 'RESET': {
      // Cleanup will be handled in the component using the url ref
      return { phase: 'idle' };
    }

    default:
      return state;
  }
}

const App: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, { phase: 'idle' });
  const { resultBlob, resultUrl, loading, error, process, reset: resetRemoval } = useBackgroundRemoval();

  // Track current original URL for cleanup
  const originalUrlRef = useRef<string | null>(null);

  const handleImage = useCallback(
    (file: File) => {
      const url = URL.createObjectURL(file);
      // Clean up previous original URL
      if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current);
      originalUrlRef.current = url;
      resetRemoval();
      dispatch({ type: 'UPLOAD', file, url });
    },
    [resetRemoval],
  );

  const handleRemoveBg = useCallback(async () => {
    if (state.phase !== 'uploaded' && state.phase !== 'done' && state.phase !== 'error') return;
    const { original } = state;
    dispatch({ type: 'START_PROCESSING' });
    try {
      await process(original);
      // Check that the hook's state updated — process is async.
      // We need to wait a tick for React state to settle.
      // Use a microtask:
      await new Promise((r) => setTimeout(r, 0));
      dispatch({ type: 'PROCESS_SUCCESS' });
    } catch {
      // error is already set in the hook; read it below
    }
  }, [state, process]);

  // Sync hook error back to AppState
  React.useEffect(() => {
    if (error && state.phase === 'processing') {
      dispatch({ type: 'PROCESS_ERROR', error });
    }
  }, [error, state.phase]);

  // Sync hook success back to AppState
  React.useEffect(() => {
    if (resultUrl && state.phase === 'processing' && !loading && !error) {
      dispatch({ type: 'PROCESS_SUCCESS' });
    }
  }, [resultUrl, state.phase, loading, error]);

  const handleReset = useCallback(() => {
    resetRemoval();
    if (originalUrlRef.current) {
      URL.revokeObjectURL(originalUrlRef.current);
      originalUrlRef.current = null;
    }
    dispatch({ type: 'RESET' });
  }, [resetRemoval]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current);
    };
  }, []);

  return (
    <div className="app-container">
      <Header />
      <main className="app-main">
        {state.phase === 'idle' && <UploadZone onImage={handleImage} />}

        {(state.phase === 'uploaded' ||
          state.phase === 'processing' ||
          state.phase === 'done' ||
          state.phase === 'error') && (
          <Editor
            original={state.original}
            originalUrl={state.originalUrl}
            phase={state.phase}
            resultUrl={resultUrl}
            resultBlob={resultBlob}
            error={state.phase === 'error' ? state.error : null}
            onRemoveBg={handleRemoveBg}
            onReset={handleReset}
          />
        )}
      </main>
      <footer className="app-footer">
        Remove backgrounds from your images — powered by remove.bg API
      </footer>
    </div>
  );
};

export default App;
