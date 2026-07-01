/**
 * App-wide error boundary. A render-time throw anywhere in the tree (for
 * example a metadata lookup on an unexpected backend value) would otherwise
 * unmount everything and leave a blank white screen. This catches it and shows
 * a recoverable, legible message instead — using inline styles so the fallback
 * renders even if the stylesheet failed to load.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';

/** Standalone fatal-error panel, also used for bootstrap failures. */
export function FatalError({
  error,
  onReload,
}: {
  error: unknown;
  onReload?: () => void;
}) {
  const message =
    error instanceof Error ? error.message : String(error ?? 'Unknown error');
  return (
    <div
      role="alert"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily:
          'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        background: '#f9fafb',
        color: '#111827',
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: '100%',
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: '24px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        }}
      >
        <h1 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 16px' }}>
          The app hit an unexpected error and couldn&rsquo;t finish loading.
        </p>
        <pre
          style={{
            fontSize: 12,
            background: '#f3f4f6',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: '12px',
            margin: '0 0 16px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            color: '#b91c1c',
          }}
        >
          {message}
        </pre>
        <button
          type="button"
          onClick={onReload ?? (() => window.location.reload())}
          style={{
            appearance: 'none',
            border: 'none',
            borderRadius: 8,
            background: '#4f46e5',
            color: '#fff',
            fontSize: 14,
            fontWeight: 500,
            padding: '8px 16px',
            cursor: 'pointer',
          }}
        >
          Reload
        </button>
      </div>
    </div>
  );
}

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error:', error, info.componentStack);
  }

  private handleReload = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return <FatalError error={this.state.error} onReload={this.handleReload} />;
    }
    return this.props.children;
  }
}
