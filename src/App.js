import React, { useEffect, useState, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Billing from './pages/Billing';
import Users from './pages/Users';
import Profile from './pages/Profile';
import Login from './components/Login';
import Register from './components/Register';
import ProtectedRoute from './components/ProtectedRoute';
import RoleBasedRoute from './components/RoleBasedRoute';
import ProfileDropdown from './components/ProfileDropdown'; 
import Sidebar from './components/Sidebar';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import { auth, db } from './firebase/firebase';
import { doc, getDoc } from 'firebase/firestore';

function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
      try {
        setError(null);
        
        if (authUser) {
          // Fetch user role from Firestore
          const userDoc = await getDoc(doc(db, 'users', authUser.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({ 
              ...authUser, 
              role: userData.role,
              displayName: userData.displayName || authUser.displayName,
              photoURL: userData.photoURL || authUser.photoURL
            });
          } else {
            // If user document doesn't exist in Firestore, create a basic user object
            console.warn('User document not found in Firestore');
            setUser({ 
              ...authUser, 
              role: 'staff' // Default role
            });
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setError('Failed to load user data. Please try refreshing the page.');
        // Still set the user with basic auth data if Firestore fails
        if (authUser) {
          setUser({ 
            ...authUser, 
            role: 'staff' // Default role on error
          });
        } else {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Memoize the app title based on user role
  const appTitle = useMemo(() => {
    if (!user) return 'Retail Store Manager';
    return `Retail Store Manager - ${user.role?.charAt(0).toUpperCase() + user.role?.slice(1)} Panel`;
  }, [user?.role]);

  // Show loading spinner while checking authentication
  if (loading) {
    return <LoadingSpinner message="Loading application..." />;
  }

  // Show error if there's a critical error
  if (error && !user) {
    return (
      <div className="error-container">
        <div className="error-content">
          <h2>Something went wrong</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <div className="app-container">
          {/* Conditionally render the sidebar only if the user is logged in */}
          {user && <Sidebar user={user} />}
          
          <div className={`main-content ${user ? 'with-sidebar' : 'without-sidebar'}`}>
            {/* Top Navigation Bar - only show when user is logged in */}
            {user && (
              <header className="top-header">
                <div className="header-content">
                  <h1 className="app-title">{appTitle}</h1>
                  {error && (
                    <div className="header-error">
                      <span className="error-icon">⚠️</span>
                      <span className="error-text">Connection issues detected</span>
                    </div>
                  )}
                  <ProfileDropdown user={user} />
                </div>
              </header>
            )}
            
            {/* Main Content */}
            <main className="page-content">
              <Routes>
                {/* Public routes */}
                <Route 
                  path="/login" 
                  element={user ? <Navigate to="/" replace /> : <Login />} 
                />
                <Route 
                  path="/register" 
                  element={
                    user?.role === 'admin' ? <Register /> : 
                    user ? <Navigate to="/" replace /> : 
                    <Login />
                  } 
                />
                
                {/* Protected routes */}
                <Route element={<ProtectedRoute user={user} />}>
                  {/* Admin-only routes */}
                  <Route element={<RoleBasedRoute allowedRoles={['admin']} user={user} />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/inventory" element={<Inventory />} />
                    <Route path="/users" element={<Users />} />
                  </Route>
                  
                  {/* Admin and Staff routes */}
                  <Route element={<RoleBasedRoute allowedRoles={['admin', 'staff']} user={user} />}>
                    <Route path="/billing" element={<Billing />} />
                    <Route path="/profile" element={<Profile />} />
                  </Route>
                  
                  {/* Default route based on user role */}
                  <Route 
                    path="/" 
                    element={
                      <Navigate 
                        to={user?.role === 'admin' ? '/dashboard' : '/billing'} 
                        replace 
                      />
                    } 
                  />
                </Route>
                
                {/* Catch-all route */}
                <Route 
                  path="*" 
                  element={
                    user ? 
                      <Navigate to="/" replace /> : 
                      <Navigate to="/login" replace />
                  } 
                />
              </Routes>
            </main>
          </div>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;