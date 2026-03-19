import { Component, type ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: "monospace" }}>
          <h1 style={{ color: "red" }}>Runtime Error</h1>
          {import.meta.env.DEV ? (
            <pre style={{ whiteSpace: "pre-wrap", background: "#1a1a1a", color: "#ff6b6b", padding: 16, borderRadius: 8 }}>
              {this.state.error.message}
              {"\n\n"}
              {this.state.error.stack}
            </pre>
          ) : (
            <p>Something went wrong. Please reload the page.</p>
          )}
          <button onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            style={{ marginTop: 16, padding: "8px 16px", cursor: "pointer" }}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
