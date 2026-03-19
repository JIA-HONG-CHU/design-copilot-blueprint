import { Component, type ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { error: Error | null; errorId: string | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, errorId: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, errorId: crypto.randomUUID() };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary] id=${this.state.errorId}`, error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ error: null, errorId: null });
  };

  render() {
    const { error, errorId } = this.state;

    if (error) {
      return (
        <div className="p-8 font-mono">
          <h1 className="text-red-500 text-2xl font-bold mb-4">Runtime Error</h1>

          {import.meta.env.DEV ? (
            <pre className="whitespace-pre-wrap bg-[#1a1a1a] text-[#ff6b6b] p-4 rounded-lg overflow-auto max-h-[60vh]">
              {error.message}
              {"\n\n"}
              {error.stack}
            </pre>
          ) : (
            <p className="text-gray-700 dark:text-gray-300">
              Something went wrong. Please try again or report this error.
            </p>
          )}

          <p className="mt-4 text-sm text-gray-500">
            Error ID: <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{errorId}</code>
          </p>

          <button
            onClick={this.handleRetry}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
