import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Error Boundary caught:', error, errorInfo);
        // Here you would typically log to an error reporting service
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                    <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center border border-gray-200">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="w-8 h-8 text-red-500" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                            Something went wrong
                        </h1>
                        <p className="text-gray-600 mb-6">
                            The application encountered an unexpected error. We've logged this issue and are looking into it.
                        </p>

                        {process.env.NODE_ENV !== 'production' && this.state.error && (
                            <div className="mb-6 p-4 bg-gray-100 rounded text-left overflow-auto max-h-40 text-xs font-mono text-gray-700">
                                {this.state.error.toString()}
                            </div>
                        )}

                        <button
                            onClick={() => window.location.reload()}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
