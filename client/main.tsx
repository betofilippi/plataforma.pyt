import React, { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { startPerformanceProfiler } from './lib/performance-utils'

// Debug: Log when main.tsx starts
console.log('🚀 [MAIN.TSX] Starting application...');
console.log('📦 [MAIN.TSX] React imported:', React);
console.log('📦 [MAIN.TSX] ReactDOM imported:', ReactDOM);
console.log('📦 [MAIN.TSX] ReactDOM.createRoot available?', typeof ReactDOM?.createRoot);

// Make React available globally for debugging
if (typeof window !== 'undefined') {
  window.React = React;
  console.log('✅ [MAIN.TSX] React available globally for debugging');
}

// Debug: Check if root element exists
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('❌ [MAIN.TSX] Root element not found!');
  document.body.innerHTML = '<h1 style="color: red;">Error: Root element not found</h1>';
} else {
  console.log('✅ [MAIN.TSX] Root element found');
  
  try {
    console.log('📦 [MAIN.TSX] Creating React root...');
    console.log('📦 [MAIN.TSX] rootElement:', rootElement);
    console.log('📦 [MAIN.TSX] ReactDOM:', ReactDOM);
    console.log('📦 [MAIN.TSX] ReactDOM.createRoot:', ReactDOM.createRoot);
    
    if (!ReactDOM.createRoot) {
      throw new Error('ReactDOM.createRoot is not available!');
    }
    
    const root = ReactDOM.createRoot(rootElement);
    console.log('📦 [MAIN.TSX] Root created:', root);
    
    console.log('🎨 [MAIN.TSX] Rendering App component...');
    
    // Start performance profiler in development
    if (process.env.NODE_ENV === 'development') {
      startPerformanceProfiler();
    }
    
    // Enable StrictMode for better error detection
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
    
    console.log('✅ [MAIN.TSX] App rendered successfully!');
  } catch (error) {
    console.error('❌ [MAIN.TSX] Error rendering app:', error);
    rootElement.innerHTML = `
      <div style="padding: 20px; color: red; font-family: monospace;">
        <h1>Error Loading Application</h1>
        <pre>${error}</pre>
      </div>
    `;
  }
}