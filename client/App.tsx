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
// Modules - Lazy loaded para não quebrar outras rotas
import { lazy, Suspense } from "react";
const DatabaseModule = lazy(() => import("./pages/DatabaseModule"));
const SistemaModule = lazy(() => import("./pages/SistemaModule"));
import PlatformDashboardFixed from "./pages/PlatformDashboardFixed";
import Login from "./pages/Login";
import { AuthCallback } from "./components/auth/AuthCallback";
// Removed imports for unimplemented modules
import BaseModuleTemplate from "./pages/BaseModuleTemplate";
import NotFound from "./pages/NotFound";
const PermissionManagement = lazy(() => import("./pages/PermissionManagement"));
const UserProfile = lazy(() => import("./pages/UserProfile"));

const queryClient = new QueryClient();

const App = () => (
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


                {/* DATABASE - Módulo Base de Dados - Protected & Lazy loaded */}
                <Route path="/database/*" element={
                  <ProtectedRoute>
                    <Suspense fallback={
                      <div className="flex items-center justify-center h-screen">
                        <div className="flex flex-col items-center space-y-4">
                          <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-gray-600">Carregando base de dados...</p>
                        </div>
                      </div>
                    }>
                      <DatabaseModule />
                    </Suspense>
                  </ProtectedRoute>
                } />

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

export default App;
