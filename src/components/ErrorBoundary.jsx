import React from "react";

/**
 * Catches an error thrown while a part of the workshop renders, so the page shows the
 * error instead of going blank. Close the workshop (or reload) to get back to the page.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Workshop error:", error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="workshop-error" role="alert" style={{ padding: 16, background: "#fff", color: "#900", maxWidth: 560 }}>
        <strong>Something went wrong and the page stopped.</strong>
        <p>Your saved files are unchanged. Reload the page to try again. Please send this message.</p>
        <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>{String(error?.stack || error?.message || error)}</pre>
        {this.props.onClose && <button onClick={this.props.onClose}>Close workshop</button>}
      </div>
    );
  }
}
