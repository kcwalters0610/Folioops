import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout/Layout';
import Login from './components/Auth/Login';
import ProfileSetup from './components/Auth/ProfileSetup';
import Dashboard from './components/Dashboard/Dashboard';
import InteractiveDashboard from './components/Dashboard/InteractiveDashboard';
import CustomerList from './components/Customers/CustomerList';
import VendorList from './components/Vendors/VendorList';
import WorkOrderList from './components/WorkOrders/WorkOrderList';
import PurchaseOrderList from './components/PurchaseOrders/PurchaseOrderList';
import InvoiceList from './components/Invoices/InvoiceList';
import EstimateList from './components/Estimates/EstimateList';
import Reports from './components/Reports/Reports';
import EmployeeList from './components/Employees/EmployeeList';
import Settings from './components/Settings/Settings';
import TechJobList from './components/TechJobs/TechJobList';
import CRMDashboard from './components/CRM/CRMDashboard';
import LeadList from './components/CRM/LeadList';
import OpportunityList from './components/CRM/OpportunityList';
import CommunicationHistory from './components/CRM/CommunicationHistory';

// Loading Component
const LoadingSpinner: React.FC = () => (
  <div className="min-h-screen gradient-primary flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4"></div>
      <p className="text-white text-lg font-medium">Loading Folioops...</p>
      <p className="text-white/70 text-sm mt-2">Initializing your workspace</p>
      
      {/* Add a fallback button after some time */}
      <div className="mt-6">
        <button
          onClick={() => window.location.href = '/login'}
          className="text-white/80 hover:text-white text-sm underline"
        >
          Having trouble? Click here to go to login
        </button>
      </div>
    </div>
  </div>
);

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-gray-600 mb-4">
              The application encountered an error and couldn't load properly.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
            >
              Reload Page
            </button>
            {this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500">Error Details</summary>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, loading } = useAuth();

  console.log('🛡️ ProtectedRoute Check:', { loading, hasUser: !!user, hasProfile: !!profile });

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    console.log('🚫 No user, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (!profile) {
    console.log('⚠️ User exists but no profile found, showing profile setup');
    return <ProfileSetup user={user} onComplete={() => window.location.reload()} />;
  }

  console.log('✅ User and profile found, rendering protected content');
  return (
    <ThemeProvider>
      <Layout>{children}</Layout>
    </ThemeProvider>
  );
};

// Public Route Component
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  console.log('🌐 PublicRoute Check:', { loading, hasUser: !!user });

  if (loading) {
    return <LoadingSpinner />;
  }

  if (user) {
    console.log('👤 User found, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  console.log('🌐 No user, showing public content');
  return <>{children}</>;
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router future={{ v7_relativeSplatPath: true }}>
          <Routes>
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/interactive-dashboard"
              element={
                <ProtectedRoute>
                  <InteractiveDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-jobs"
              element={
                <ProtectedRoute>
                  <TechJobList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/crm"
              element={
                <ProtectedRoute>
                  <CRMDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/crm/leads"
              element={
                <ProtectedRoute>
                  <LeadList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/crm/opportunities"
              element={
                <ProtectedRoute>
                  <OpportunityList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/crm/communications"
              element={
                <ProtectedRoute>
                  <CommunicationHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customers"
              element={
                <ProtectedRoute>
                  <CustomerList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vendors"
              element={
                <ProtectedRoute>
                  <VendorList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/work-orders"
              element={
                <ProtectedRoute>
                  <WorkOrderList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/purchase-orders"
              element={
                <ProtectedRoute>
                  <PurchaseOrderList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/invoices"
              element={
                <ProtectedRoute>
                  <InvoiceList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/estimates"
              element={
                <ProtectedRoute>
                  <EstimateList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <Reports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employees"
              element={
                <ProtectedRoute>
                  <EmployeeList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;