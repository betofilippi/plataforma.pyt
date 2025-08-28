import "./global.css";

// Force reload - Fix FullStory namespace conflict early
if (typeof window !== "undefined" && !window["_fs_namespace"]) {
  window["_fs_namespace"] = "FS";
}

// Temporarily removed - causing issues
// import { Toaster } from "@/components/ui/toaster";
// import { Toaster as Sonner } from "@/components/ui/sonner";
// import { TooltipProvider } from "@/components/ui/tooltip";
// TEMPORARILY REMOVED - Causing useEffect null error
// import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import { MainLayout } from "./components/MainLayout";
import { AuthProvider } from "./contexts/AuthContext";
import { PermissionProvider } from "./contexts/PermissionContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Index from "./pages/Index";
// Modules - Lazy loaded usando o Module Registry
import { lazy, Suspense, useState, useEffect } from "react";
import { moduleRegistry } from "./lib/moduleRegistry";

// Performance monitoring - COMMENTED OUT FOR STABILITY
// import PerformanceDashboard from "./components/ui/PerformanceDashboard";
// import { usePerformanceTracking } from "./lib/performance-utils";

// Debug logging
console.log('🎨 [APP.TSX] App component loading...');

// Dynamic component loader for module registry
const DynamicModuleLoader = ({ moduleId }: { moduleId: string }) => {
  const [Component, setComponent] = useState<React.ComponentType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadModule = async () => {
      try {
        const module = moduleRegistry.find(m => m.id === moduleId);
        if (!module) {
          setError(`Module ${moduleId} not found`);
          return;
        }
        
        // Module loading would happen here
        setLoading(false);
      } catch (err) {
        console.error(`Failed to load module ${moduleId}:`, err);
        setError(err.toString());
        setLoading(false);
      }
    };
    
    loadModule();
  }, [moduleId]);

  if (loading) return null;
  if (error) return <div>Error loading module: {error}</div>;
  if (!Component) return <div>Module not found</div>;
  
  return <Component />;
};

// Lazy loaded components with better error handling
const SistemaModule = lazy(() => {
  console.log('🔄 [LAZY] Loading SistemaModule...');
  return import("./pages/SistemaModule").catch(err => {
    console.error('❌ [LAZY] Failed to load SistemaModule:', err);
    throw err;
  });
});


// Regular imports
import PlatformDashboardFixed from "./pages/PlatformDashboardFixed";
import Login from "./pages/Login";
import { AuthCallback } from "./components/auth/AuthCallback";
import BaseModuleTemplate from "./pages/BaseModuleTemplate";
import NotFound from "./pages/NotFound";

// More lazy components with error handling
const PermissionManagement = lazy(() => {
  console.log('🔄 [LAZY] Loading PermissionManagement...');
  return import("./pages/PermissionManagement").catch(err => {
    console.error('❌ [LAZY] Failed to load PermissionManagement:', err);
    throw err;
  });
});

const UserProfile = lazy(() => {
  console.log('🔄 [LAZY] Loading UserProfile...');
  return import("./pages/UserProfile").catch(err => {
    console.error('❌ [LAZY] Failed to load UserProfile:', err);
    throw err;
  });
});

// Demos removed - keeping only real functionality

// TEMPORARILY REMOVED - QueryClient causing issues
// const queryClient = new QueryClient({
//   defaultOptions: {
//     queries: {
//       retry: (failureCount, error) => {
//         console.warn(`🔄 Query retry ${failureCount}:`, error);
//         return failureCount < 3;
//       },
//     },
//   },
// });

console.log('🎯 [APP] All components loaded, creating App...');

const App = () => {
  console.log('🎨 [APP.TSX] App component rendering...');
  // usePerformanceTracking('App'); // Commented out for stability
  
  // const [showPerformanceDashboard, setShowPerformanceDashboard] = useState(
  //   process.env.NODE_ENV === 'development'
  // ); // Commented out for stability
  
  return (
    <ErrorBoundary>
      {/* QueryClientProvider temporarily removed */}
        {/* TooltipProvider temporarily removed */}
          {/* Toaster temporarily removed */}
          {/* Sonner temporarily removed */}
          <BrowserRouter>
            <AuthProvider>
              <PermissionProvider>
                <MainLayout>
                <Routes>
                  {/* PUBLIC ROUTES */}
                  <Route path="/" element={<Index />} />
                  
                  {/* LOGIN ROUTE - Without GuestOnly wrapper */}
                  <Route path="/login" element={<Login />} />
                  
                  {/* AUTH CALLBACK - Public route for OAuth */}
                  <Route path="/auth/callback" element={<AuthCallback />} />

                  {/* PROTECTED ROUTES (require authentication) */}
                  <Route path="/platform" element={
                    <ProtectedRoute>
                      <PlatformDashboardFixed />
                    </ProtectedRoute>
                  } />



                  {/* SISTEMA - Módulo de Sistema - Protected & Lazy loaded */}
                  <Route path="/sistema/*" element={
                    <ProtectedRoute>
                      <Suspense fallback={null}>
                        <SistemaModule />
                      </Suspense>
                    </ProtectedRoute>
                  } />




                  {/* PERMISSION MANAGEMENT - Admin Only */}
                  <Route path="/admin/permissions" element={
                    <ProtectedRoute>
                      <Suspense fallback={null}>
                        <PermissionManagement />
                      </Suspense>
                    </ProtectedRoute>
                  } />


                  {/* USER PROFILE - Protected */}
                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <Suspense fallback={null}>
                        <UserProfile />
                      </Suspense>
                    </ProtectedRoute>
                  } />

                  {/* TEMPLATE BASE - Protected - Para criação de novos módulos */}
                  <Route path="/template" element={
                    <ProtectedRoute requiredRole={['admin', 'developer']}>
                      <BaseModuleTemplate />
                    </ProtectedRoute>
                  } />

                  {/* Demos removed - no fake functionality */}

                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
                </MainLayout>
              </PermissionProvider>
            </AuthProvider>
          </BrowserRouter>
          
          {/* Performance Dashboard - COMMENTED OUT FOR STABILITY */}
          {/* {process.env.NODE_ENV === 'development' && (
            <PerformanceDashboard 
              isExpanded={showPerformanceDashboard}
              onToggle={setShowPerformanceDashboard}
            />
          )} */}
        {/* TooltipProvider closing tag removed */}
      {/* QueryClientProvider closing tag removed */}
    </ErrorBoundary>
  );
};

console.log('✅ [APP] App component created and ready to export');

export default App;