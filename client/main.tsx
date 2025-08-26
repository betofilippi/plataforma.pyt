import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

// Debug: Log when main.tsx starts
console.log('🚀 [MAIN.TSX] Starting application...');

// Debug: Check if root element exists
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('❌ [MAIN.TSX] Root element not found!');
  document.body.innerHTML = '<h1 style="color: red;">Error: Root element not found</h1>';
} else {
  console.log('✅ [MAIN.TSX] Root element found');
  
  try {
    console.log('📦 [MAIN.TSX] Creating React root...');
    const root = createRoot(rootElement);
    
    console.log('🎨 [MAIN.TSX] Rendering App component...');
    
    // Temporarily disable StrictMode for debugging
    root.render(
      // <StrictMode>
        <App />
      // </StrictMode>
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