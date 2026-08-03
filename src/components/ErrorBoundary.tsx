import { Component, type ReactNode } from "react";

/**
 * The crash barrier. Without it, one render error anywhere blanks the entire
 * admin — the worst possible failure for a tool holding the company's books.
 * With it, the broken section says so, and everything else keeps working.
 */
export default class ErrorBoundary extends Component<
  { children: ReactNode; onError?: (error: Error) => void },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("Section crashed:", error);
    // Reported to the audit log so "Download bug report" carries it.
    this.props.onError?.(error);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div role="alert" className="surface p-8 text-center">
        <p className="text-base font-medium text-foreground">
          This section hit an error.
        </p>
        <p className="mx-auto mt-2 max-w-md break-words text-xs text-muted-foreground">
          {this.state.error.message}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Your data is safe — this is a display error, nothing was written.
        </p>
        <button
          type="button"
          onClick={() => this.setState({ error: null })}
          className="mt-5 rounded-full border border-border px-5 py-2 text-sm text-foreground transition-colors hover:border-accent hover:text-accent"
        >
          Try again
        </button>
      </div>
    );
  }
}
