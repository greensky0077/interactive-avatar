import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { ThemeProvider } from './components/ThemeProvider.tsx'
import { ErrorProvider } from './contexts/ErrorContext.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorProvider>
      <ThemeProvider defaultTheme="light">
        <App />
      </ThemeProvider>
    </ErrorProvider>
  </React.StrictMode>,
)
