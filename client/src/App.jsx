import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Layouts
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Pages
import HomePage from './pages/HomePage';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Budget from './pages/Budget';
import Loans from './pages/Loans';
import Subscriptions from './pages/Subscriptions';
import ExpenseAnalyticsPage from './pages/ExpenseAnalyticsPage';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
    
    setLoading(false);
  }, []);

  // Protected route component
  const ProtectedRoute = ({ children }) => {
    if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
    
    if (!user) {
      return <Navigate to="/login" />;
    }
    
    return children;
  };

  // Determine what to render on the home page based on authentication status
  const HomePageWrapper = () => {
    if (loading) {
      return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }
    
    if (user) {
      return <Navigate to="/app/dashboard" replace />;
    }
    
    return <HomePage />;
  };

  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        {/* Home Page - conditionally redirects to dashboard if authenticated */}
        <Route path="/" element={<HomePageWrapper />} />
        
        {/* Auth routes */}
        <Route path="/" element={<AuthLayout />}>
          <Route path="login" element={<Login setUser={setUser} />} />
          <Route path="register" element={<Register setUser={setUser} />} />
        </Route>
        
        {/* App routes - all protected */}
        <Route path="/app" element={
          <ProtectedRoute>
            <MainLayout user={user} setUser={setUser} />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="budget" element={<Budget />} />
          <Route path="loans" element={<Loans />} />
          <Route path="subscriptions" element={<Subscriptions />} />
          <Route path="analytics" element={<ExpenseAnalyticsPage />} />
        </Route>
        
        {/* 404 route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
