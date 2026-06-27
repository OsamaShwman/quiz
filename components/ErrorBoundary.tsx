import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Top-level error boundary. Catches any uncaught render errors so the app
 * never white-screens. Shows a friendly error message with a reload button.
 *
 * Critical for resilience: if a Steamhub API returns malformed data and a
 * component throws while rendering it, the student should still see something
 * useful instead of a blank page.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', info.componentStack);
  }

  handleReload = () => {
    // Clear any local quiz cache that might be causing the crash, then reload.
    // localStorage may throw in cross-origin iframes — swallow safely.
    try {
      localStorage.removeItem('quiz_state_v1');
    } catch {
      /* ignore storage errors */
    }
    try {
      window.location.reload();
    } catch {
      /* ignore */
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 space-y-4">
          <div className="text-[#ef4444] text-5xl">⚠️</div>
          <h2 className="text-[1.25rem] font-bold text-[#091e42]">Something went wrong</h2>
          <p className="text-[0.95rem] text-[#6882a9] max-w-sm">
            The page hit an unexpected error. Try reloading.
          </p>
          {this.state.error?.message && (
            <p className="text-[0.75rem] text-[#94a3b8] max-w-md font-mono break-all">
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={this.handleReload}
            className="px-5 py-2.5 bg-[#08b8fb] text-white rounded-xl font-semibold hover:bg-[#07a2dd] transition-colors"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
