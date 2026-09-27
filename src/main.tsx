import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

declare global {
  interface Window {
    __FORMA3D_BOOTED__?: boolean;
  }
}

window.__FORMA3D_BOOTED__ = true;

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            backgroundColor: '#0B0D11',
            color: '#F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
          }}
        >
          <div
            style={{
              maxWidth: '460px',
              width: '100%',
              backgroundColor: '#12151C',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              padding: '24px',
              textAlign: 'center',
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
              Sahne Başlatılırken Bir Sorun Oluştu
            </h2>
            <p
              style={{
                fontSize: '13px',
                color: '#94A3B8',
                marginBottom: '16px',
                wordBreak: 'break-word',
              }}
            >
              {this.state.errorMessage || 'Beklenmeyen çalışma zamanı hatası.'}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: '#F59E0B',
                color: '#0B0D11',
                fontWeight: 600,
                fontSize: '13px',
                padding: '10px 18px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Uygulamayı Yeniden Yükle
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
    </StrictMode>
  );
}
