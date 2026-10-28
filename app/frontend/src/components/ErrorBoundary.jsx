import React from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0f172a] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-gray-800 p-8 shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
              An unexpected error occurred in this view. Your progress has been safely saved.
            </p>

            <div className="flex gap-3 mb-4">
              <button
                onClick={this.handleReload}
                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </button>
              <button
                onClick={() => (window.location.href = '/dashboard')}
                className="py-3 px-4 bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <Home className="w-4 h-4" />
                Dashboard
              </button>
            </div>

            {this.state.error && (
              <div className="mt-4 text-left">
                <button
                  type="button"
                  onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:underline flex items-center gap-1 mx-auto"
                >
                  {this.state.showDetails ? 'Hide error details' : 'Show error details'}
                  {this.state.showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {this.state.showDetails && (
                  <pre className="mt-2 p-3 bg-gray-100 dark:bg-black/50 rounded-lg text-xs font-mono text-red-600 dark:text-red-400 overflow-x-auto max-h-36">
                    {this.state.error?.toString()}
                    {'\n'}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
