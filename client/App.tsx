import "./global.css";

// Force reload - Fix FullStory namespace conflict early
if (typeof window !== "undefined" && !window["_fs_namespace"]) {
  window["_fs_namespace"] = "FS";
}

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import { MainLayout } from "./components/MainLayout";
import { AuthProvider } from "./contexts/AuthContext";
import { PermissionProvider } from "./contexts/PermissionContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Index from "./pages/Index";
// Modules - Lazy loaded usando o Module Registry
import { lazy, Suspense, useState, useEffect } from "react";
// import { moduleRegistry } from "./lib/moduleRegistry"; // TEMPORARIAMENTE COMENTADO PARA DEBUG

// Debug logging
console.log('🎨 [APP.TSX] App component loading...');

// Dynamic component loader for module registry
// TEMPORARIAMENTE COMENTADO PARA DEBUG - PROBLEMA AQUI!
/*
const DynamicModuleLoader = ({ moduleId }: { moduleId: string }) => {
  return <div>Module {moduleId} desabilitado para debug</div>;
};
*/

// Lazy loaded components with better error handling
const SistemaModule = lazy(() => {
  console.log('🔄 [LAZY] Loading SistemaModule...');
  return import("./pages/SistemaModule").catch(err => {
    console.error('❌ [LAZY] Failed to load SistemaModule:', err);
    throw err;
  });
});

const MarketplaceModule = lazy(() => {
  console.log('🔄 [LAZY] Loading MarketplaceModule...');
  return import("./pages/MarketplaceModule").catch(err => {
    console.error('❌ [LAZY] Failed to load MarketplaceModule:', err);
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

const ModuleFederationDemo = lazy(() => {
  console.log('🔄 [LAZY] Loading ModuleFederationDemo...');
  return import("./components/ModuleFederationDemo").catch(err => {
    console.error('❌ [LAZY] Failed to load ModuleFederationDemo:', err);
    throw err;
  });
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        console.warn(`🔄 Query retry ${failureCount}:`, error);
        return failureCount < 3;
      },
    },
  },
});

console.log('🎯 [APP] All components loaded, creating App...');

const App = () => {
  console.log('🎨 [APP.TSX] App component rendering...');
  
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
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


                  {/* DATABASE - Módulo Base de Dados - Protected & Lazy loaded via Module Registry */}
                  {/* TEMPORARIAMENTE COMENTADO PARA DEBUG 
                  <Route path="/database/*" element={
                    <ProtectedRoute>
                      <DynamicModuleLoader moduleId="database" />
                    </ProtectedRoute>
                  } />
                  */}

                  {/* SISTEMA - Módulo de Sistema - Protected & Lazy loaded */}
                  <Route path="/sistema/*" element={
                    <ProtectedRoute>
                      <Suspense fallback={
                        <div className="flex items-center justify-center h-screen">
                          <div className="flex flex-col items-center space-y-4">
                            <div className="w-8 h-8 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-gray-600">Carregando sistema...</p>
                          </div>
                        </div>
                      }>
                        <SistemaModule />
                      </Suspense>
                    </ProtectedRoute>
                  } />

                  {/* MARKETPLACE - Marketplace de Módulos - Protected & Lazy loaded */}
                  <Route path="/marketplace/*" element={
                    <ProtectedRoute>
                      <Suspense fallback={
                        <div className="flex items-center justify-center h-screen">
                          <div className="flex flex-col items-center space-y-4">
                            <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-gray-600">Carregando marketplace...</p>
                          </div>
                        </div>
                      }>
                        <MarketplaceModule />
                      </Suspense>
                    </ProtectedRoute>
                  } />



                  {/* PERMISSION MANAGEMENT - Admin Only */}
                  <Route path="/admin/permissions" element={
                    <ProtectedRoute>
                      <Suspense fallback={
                        <div className="flex items-center justify-center h-screen">
                          <div className="flex flex-col items-center space-y-4">
                            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-gray-600">Carregando gerenciamento de permissões...</p>
                          </div>
                        </div>
                      }>
                        <PermissionManagement />
                      </Suspense>
                    </ProtectedRoute>
                  } />


                  {/* USER PROFILE - Protected */}
                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <Suspense fallback={
                        <div className="flex items-center justify-center h-screen">
                          <div className="flex flex-col items-center space-y-4">
                            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-gray-600">Carregando perfil...</p>
                          </div>
                        </div>
                      }>
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

                  {/* MODULE FEDERATION DEMO - Protected - For development and testing */}
                  <Route path="/module-federation" element={
                    <ProtectedRoute requiredRole={['admin', 'developer']}>
                      <Suspense fallback={
                        <div className="flex items-center justify-center h-screen">
                          <div className="flex flex-col items-center space-y-4">
                            <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-gray-600">Carregando Module Federation Demo...</p>
                          </div>
                        </div>
                      }>
                        <ModuleFederationDemo />
                      </Suspense>
                    </ProtectedRoute>
                  } />

                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
                </MainLayout>
              </PermissionProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

console.log('✅ [APP] App component created and ready to export');

export default App;