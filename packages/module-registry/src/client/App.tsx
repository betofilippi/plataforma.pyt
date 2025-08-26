import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';

import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import PackageDetailPage from './pages/PackageDetailPage';
import PublishPage from './pages/PublishPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import ErrorFallback from './components/ErrorFallback';
import LoadingSpinner from './components/LoadingSpinner';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Layout>
        <React.Suspense fallback={<LoadingSpinner />}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/package/:name" element={<PackageDetailPage />} />
            <Route path="/package/:name/:version" element={<PackageDetailPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/profile/:username" element={<ProfilePage />} />

            {/* Protected routes */}
            <Route
              path="/publish"
              element={
                <ProtectedRoute>
                  <PublishPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminPage />
                </ProtectedRoute>
              }
            />

            {/* Redirect unknown routes */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </React.Suspense>
      </Layout>
    </ErrorBoundary>
  );
}

export default App;