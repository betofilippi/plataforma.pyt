import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'sonner';

import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

import './styles/globals.css';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

// DISABLED: This was conflicting with main app mounting
// Module registry should export components, not mount its own React app
// const root = ReactDOM.createRoot(
//   document.getElementById('root') as HTMLElement
// );

// root.render(
//   <React.StrictMode>
//     <BrowserRouter>
//       <QueryClientProvider client={queryClient}>
//         <ThemeProvider>
//           <AuthProvider>
//             <App />
//             <Toaster richColors position="top-right" />
//             {process.env.NODE_ENV === 'development' && (
//               <ReactQueryDevtools initialIsOpen={false} />
//             )}
//           </AuthProvider>
//         </ThemeProvider>
//       </QueryClientProvider>
//     </BrowserRouter>
//   </React.StrictMode>
// );

// Export components for use by main app if needed
export { App, AuthProvider, ThemeProvider, queryClient };