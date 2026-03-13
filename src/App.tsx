import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { ErrorBoundary } from './ErrorBoundary';
import { Header } from './components/Header';
import { CustomerDashboard } from './components/CustomerDashboard';
import { ShopDashboard } from './components/ShopDashboard';
import { ShopRegistration } from './components/ShopRegistration';
import CustomerRequests from './components/CustomerRequests';
import { BottomNav } from './components/BottomNav';
import { Footer } from './components/Footer';

function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode, requiredRole?: string }) {
  const { user, dbUser, loading, signIn } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-brand-bg px-4">
        <div className="max-w-md w-full text-center">
          <h2 className="text-3xl font-extrabold text-brand-dark mb-4">مرحباً بك في SpareHub</h2>
          <p className="text-brand-secondary mb-8">يرجى تسجيل الدخول للوصول إلى المنصة.</p>
          <button
            onClick={signIn}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary"
          >
            تسجيل الدخول باستخدام جوجل
          </button>
        </div>
      </div>
    );
  }

  if (requiredRole && dbUser?.role !== requiredRole) {
    if (requiredRole === 'shop_owner' && dbUser?.role === 'customer') {
      return <Navigate to="/register-shop" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppContent() {
  const { user, dbUser, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-brand-bg font-sans text-brand-dark pb-16 md:pb-0">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<CustomerDashboard />} />
          <Route 
            path="/my-requests" 
            element={
              <ProtectedRoute>
                <CustomerRequests />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/shop" 
            element={
              <ProtectedRoute requiredRole="shop_owner">
                <ShopDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/register-shop" 
            element={
              <ProtectedRoute>
                <ShopRegistration />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}
