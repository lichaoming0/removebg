import React, { useReducer, useCallback, useRef } from 'react';
import { AuthProvider } from '../context/AuthContext';
import Header from './Header';
import UploadZone from './UploadZone';
import NotesCard from './NotesCard';
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

    case 'RESET':
      return { phase: 'idle' };

    default:
      return state;
  }
}

const AppContent: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, { phase: 'idle' });
  const { resultUrl, loading, error, process, reset: resetRemoval } = useBackgroundRemoval();

  const originalUrlRef = useRef<string | null>(null);

  const handleImage = useCallback(
    (file: File) => {
      const url = URL.createObjectURL(file);
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
      await new Promise((r) => setTimeout(r, 0));
      dispatch({ type: 'PROCESS_SUCCESS' });
    } catch {
      // error synced via useEffect below
    }
  }, [state, process]);

  React.useEffect(() => {
    if (error && state.phase === 'processing') {
      dispatch({ type: 'PROCESS_ERROR', error });
    }
  }, [error, state.phase]);

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

  React.useEffect(() => {
    return () => {
      if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current);
    };
  }, []);

  return (
    <div className="app-container">
      <Header />
      <main className="app-main">
        {state.phase === 'idle' && (
          <>
            <UploadZone onImage={handleImage} />
            <NotesCard />
          </>
        )}

        {(state.phase === 'uploaded' ||
          state.phase === 'processing' ||
          state.phase === 'done' ||
          state.phase === 'error') && (
          <Editor
            original={state.original}
            originalUrl={state.originalUrl}
            phase={state.phase}
            resultUrl={resultUrl}
            error={state.phase === 'error' ? state.error : null}
            onRemoveBg={handleRemoveBg}
            onReset={handleReset}
          />
        )}
      </main>
      <footer className="app-footer">
        <span className="app-footer-divider" />
        <p>Powered by remove.bg API · Images processed in browser memory — nothing stored, nothing logged</p>
      </footer>
    </div>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;
