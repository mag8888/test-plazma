
import React from 'react';

interface ErrorBoundaryProps {
    children: React.ReactNode;
    name: string;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: any;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: any) {
        return { hasError: true, error };
    }

    componentDidCatch(error: any, errorInfo: any) {
        console.error(`[ErrorBoundary] Error in ${this.props.name}:`, error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-4 bg-red-900/50 border border-red-500/50 rounded-xl text-white">
                    <h3 className="font-bold mb-2">Error in {this.props.name}</h3>
                    <pre className="text-[10px] overflow-auto max-h-[100px]">
                        {this.state.error?.toString()}
                    </pre>
                </div>
            );
        }

        return this.props.children;
    }
}
