import { Component, type ErrorInfo, type ReactNode } from "react";

interface State {
  error: Error | null;
}

/**
 * Top-level error boundary. Without one, any render-time crash unmounts the
 * whole React tree and the user is left staring at a blank white screen with
 * no idea what happened (and no way to recover but a manual reload). This
 * catches those crashes, shows a readable message with the error text, and
 * offers Reload / Go home — and logs the real error to the console so it can
 * actually be diagnosed.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface the real crash (the network errors users often see are unrelated
    // noise — this is the one that actually blanked the screen).
    console.error("[ErrorBoundary] render crash:", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full bg-bg-card rounded-2xl shadow-card p-6 text-center space-y-4">
          <h1 className="text-lg font-semibold text-fg">Something went wrong</h1>
          <p className="text-sm text-fg-muted">
            This page hit an unexpected error. Reloading usually fixes it — if it keeps happening, let us know.
          </p>
          <pre className="text-[11px] text-danger bg-danger/5 rounded-lg p-3 overflow-auto text-left max-h-40 whitespace-pre-wrap break-words">
            {error.message || String(error)}
          </pre>
          <div className="flex gap-2 justify-center">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="bg-brand hover:bg-[rgb(var(--color-primary-hover))] text-white rounded-xl h-10 px-5 text-sm font-semibold"
            >
              Reload
            </button>
            <button
              type="button"
              onClick={() => { window.location.href = "/"; }}
              className="border border-border text-fg rounded-xl h-10 px-5 text-sm font-medium hover:bg-bg-subtle"
            >
              Go home
            </button>
          </div>
        </div>
      </div>
    );
  }
}
