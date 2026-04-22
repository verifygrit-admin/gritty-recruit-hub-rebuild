/**
 * ErrorBoundary — generic reusable React error boundary.
 * Sprint 004 Phase 1 F3.
 *
 * Wraps potentially-fragile subtrees (slide-outs, modals, anything that may
 * throw at render time) so a single bad component does not collapse the page
 * into a blank white screen. Provides a contained fallback UI with a Retry
 * button that clears the error state and re-mounts the children.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <SomeRiskyComponent />
 *   </ErrorBoundary>
 *
 *   <ErrorBoundary fallback={({ reset }) => <MyFallback onReset={reset} />}>
 *     <SomeRiskyComponent />
 *   </ErrorBoundary>
 */

import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log for dev visibility; production monitoring can hook here later.
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleReset() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (this.state.hasError) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback({ error: this.state.error, reset: this.handleReset });
      }
      return (
        <div
          data-testid="error-boundary-fallback"
          role="alert"
          style={{
            padding: '24px',
            margin: '16px 0',
            backgroundColor: '#FFF3E0',
            border: '1px solid #FF9800',
            borderRadius: 6,
            textAlign: 'center',
          }}
        >
          <h3 style={{ margin: '0 0 8px', color: '#8B3A3A', fontSize: '1.125rem' }}>
            Something went wrong loading this section
          </h3>
          <p style={{ margin: '0 0 16px', color: '#6B6B6B', fontSize: '0.875rem' }}>
            We've been notified and are looking into it. You can try again below.
          </p>
          <button
            data-testid="error-boundary-retry"
            onClick={this.handleReset}
            style={{
              padding: '8px 20px',
              backgroundColor: '#8B3A3A',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 4,
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
