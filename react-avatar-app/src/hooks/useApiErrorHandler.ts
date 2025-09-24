/**
 * @fileoverview Custom hook for handling API errors with beautiful alerts
 */

import { useErrorHandlers } from '../contexts/ErrorContext';

export const useApiErrorHandler = () => {
  const { showError, showSuccess, showWarning, showInfo } = useErrorHandlers();

  const handleApiError = (error: any, context: string = 'API Request') => {
    console.error(`${context} Error:`, error);

    let title = 'Request Failed';
    let message = 'An unexpected error occurred';
    let details = '';

    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data;

      switch (status) {
        case 400:
          title = 'Bad Request';
          message = data?.message || 'Invalid request parameters';
          break;
        case 401:
          title = 'Unauthorized';
          message = 'Please check your API keys and permissions';
          break;
        case 403:
          title = 'Forbidden';
          message = 'You do not have permission to perform this action';
          break;
        case 404:
          title = 'Not Found';
          message = data?.message || 'The requested resource was not found';
          break;
        case 429:
          title = 'Rate Limited';
          message = 'Too many requests. Please try again later';
          break;
        case 500:
          title = 'Server Error';
          message = 'Internal server error. Please try again later';
          break;
        case 502:
          title = 'Bad Gateway';
          message = 'Service temporarily unavailable';
          break;
        case 503:
          title = 'Service Unavailable';
          message = 'Service is temporarily unavailable';
          break;
        default:
          title = `Error ${status}`;
          message = data?.message || 'An error occurred';
      }

      details = JSON.stringify({
        status,
        statusText: error.response.statusText,
        data: data,
        url: error.config?.url
      }, null, 2);
    } else if (error.request) {
      // Network error
      title = 'Network Error';
      message = 'Unable to connect to the server. Please check your internet connection';
      details = JSON.stringify({
        message: error.message,
        code: error.code,
        config: {
          url: error.config?.url,
          method: error.config?.method
        }
      }, null, 2);
    } else {
      // Other error
      title = 'Request Error';
      message = error.message || 'An unexpected error occurred';
      details = JSON.stringify({
        message: error.message,
        stack: error.stack
      }, null, 2);
    }

    showError(`${context}: ${title}`, message, details);
  };

  const handleSuccess = (message: string, context: string = 'Success') => {
    showSuccess(context, message);
  };

  const handleWarning = (message: string, context: string = 'Warning') => {
    showWarning(context, message);
  };

  const handleInfo = (message: string, context: string = 'Info') => {
    showInfo(context, message);
  };

  return {
    handleApiError,
    handleSuccess,
    handleWarning,
    handleInfo
  };
};
