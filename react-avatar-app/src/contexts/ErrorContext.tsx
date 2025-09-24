/**
 * @fileoverview Global error context for managing application errors
 */

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import ErrorAlert, { ErrorAlertProps } from '../components/ui/error-alert';

interface ErrorState {
  alerts: ErrorAlertProps[];
}

type ErrorAction = 
  | { type: 'ADD_ERROR'; payload: Omit<ErrorAlertProps, 'show' | 'onClose'> }
  | { type: 'REMOVE_ERROR'; payload: number }
  | { type: 'CLEAR_ALL' };

const ErrorContext = createContext<{
  state: ErrorState;
  dispatch: React.Dispatch<ErrorAction>;
} | null>(null);

const errorReducer = (state: ErrorState, action: ErrorAction): ErrorState => {
  switch (action.type) {
    case 'ADD_ERROR':
      return {
        ...state,
        alerts: [
          ...state.alerts,
          {
            ...action.payload,
            show: true,
            onClose: () => dispatch({ type: 'REMOVE_ERROR', payload: state.alerts.length })
          }
        ]
      };
    case 'REMOVE_ERROR':
      return {
        ...state,
        alerts: state.alerts.filter((_, index) => index !== action.payload)
      };
    case 'CLEAR_ALL':
      return {
        ...state,
        alerts: []
      };
    default:
      return state;
  }
};

export const ErrorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(errorReducer, { alerts: [] });

  return (
    <ErrorContext.Provider value={{ state, dispatch }}>
      {children}
      {state.alerts.map((alert, index) => (
        <ErrorAlert
          key={index}
          {...alert}
          onClose={() => dispatch({ type: 'REMOVE_ERROR', payload: index })}
        />
      ))}
    </ErrorContext.Provider>
  );
};

export const useError = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
};

// Helper functions for different error types
export const useErrorHandlers = () => {
  const { dispatch } = useError();

  const showError = (title: string, message: string, details?: string) => {
    dispatch({
      type: 'ADD_ERROR',
      payload: {
        type: 'error',
        title,
        message,
        details,
        duration: 8000
      }
    });
  };

  const showSuccess = (title: string, message: string) => {
    dispatch({
      type: 'ADD_ERROR',
      payload: {
        type: 'success',
        title,
        message,
        duration: 4000
      }
    });
  };

  const showWarning = (title: string, message: string) => {
    dispatch({
      type: 'ADD_ERROR',
      payload: {
        type: 'warning',
        title,
        message,
        duration: 6000
      }
    });
  };

  const showInfo = (title: string, message: string) => {
    dispatch({
      type: 'ADD_ERROR',
      payload: {
        type: 'info',
        title,
        message,
        duration: 4000
      }
    });
  };

  const clearAll = () => {
    dispatch({ type: 'CLEAR_ALL' });
  };

  return {
    showError,
    showSuccess,
    showWarning,
    showInfo,
    clearAll
  };
};
