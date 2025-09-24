/**
 * @fileoverview Beautiful error alert component with modern design
 */

import React from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

export interface ErrorAlertProps {
  type: 'error' | 'success' | 'warning' | 'info';
  title: string;
  message: string;
  details?: string;
  onClose?: () => void;
  show?: boolean;
  duration?: number;
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({
  type,
  title,
  message,
  details,
  onClose,
  show = true,
  duration = 5000
}) => {
  const [isVisible, setIsVisible] = React.useState(show);

  React.useEffect(() => {
    setIsVisible(show);
  }, [show]);

  React.useEffect(() => {
    if (duration > 0 && isVisible) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, isVisible, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case 'error':
        return <AlertCircle className="w-6 h-6 text-red-500" />;
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
      case 'info':
        return <Info className="w-6 h-6 text-blue-500" />;
      default:
        return <AlertCircle className="w-6 h-6 text-red-500" />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-red-50 border-red-200 text-red-800';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md w-full mx-4">
      <div className={`rounded-lg border shadow-lg p-4 ${getStyles()} animate-in slide-in-from-right-5 duration-300`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-semibold mb-1">
              {title}
            </h3>
            <p className="text-sm mb-2">
              {message}
            </p>
            {details && (
              <details className="text-xs opacity-75">
                <summary className="cursor-pointer hover:opacity-100 transition-opacity">
                  View Details
                </summary>
                <pre className="mt-2 p-2 bg-black/10 rounded text-xs overflow-auto max-h-32">
                  {details}
                </pre>
              </details>
            )}
          </div>
          {onClose && (
            <button
              onClick={handleClose}
              className="ml-3 flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorAlert;
