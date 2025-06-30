import React, { useEffect, useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  BrowserRouter as Router,
} from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Billing from "./pages/Billing";
import Sales from "./pages/Sales";
import Users from "./pages/Users";
import Profile from "./pages/Profile";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleBasedRoute from "./components/RoleBasedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import { auth, db } from "./firebase/firebase";
import { doc, getDoc } from "firebase/firestore";
import AppLayout from "./components/AppLayout";
import useIdleLogout from "./hooks/useIdleLogout";

function App() {
  const [user, setUser] = useState(null);
  const [appError, setAppError] = useState(null);

  // Initialize idle logout hook (15 minutes timeout)
  useIdleLogout(15);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const docSnap = await getDoc(doc(db, "users", firebaseUser.uid));
          const role = docSnap.exists() ? docSnap.data().role : "staff";
          setUser({ ...firebaseUser, role });
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setAppError(error);
      }
    });

    return () => unsubscribe();
  }, []);

  // Global error handler for the app
  const handleAppError = (error, errorInfo, errorId) => {
    console.error("App-level error:", { error, errorInfo, errorId });
    setAppError(error);

    // You could also log this to an external service
    // errorTrackingService.logAppError({ error, errorInfo, errorId, user });
  };

  // If there's an app-level error, show error boundary
  if (appError) {
    return (
      <ErrorBoundary
        hasError={true}
        error={appError}
        title="Application Error"
        message="The application encountered an unexpected error. Please try refreshing the page."
        fallbackPath="/login"
        userId={user?.uid}
        onError={handleAppError}
      />
    );
  }

  return (
    <ErrorBoundary
      title="Application Error"
      message="Something went wrong with the application. Please try refreshing the page."
      fallbackPath="/login"
      userId={user?.uid}
      onError={handleAppError}>
      <Router>
        <ErrorBoundary
          title="Navigation Error"
          message="There was an error with page navigation. Please try going back or refreshing."
          fallbackPath="/billing"
          userId={user?.uid}
          componentName="Router">
          <Routes>
            {/* Public Routes */}
            <Route
              path="/login"
              element={
                <ErrorBoundary
                  level="component"
                  componentName="Login"
                  showReportButton={true}>
                  <Login />
                </ErrorBoundary>
              }
            />
            <Route
              path="/register"
              element={
                <ErrorBoundary
                  level="component"
                  componentName="Register"
                  showReportButton={true}>
                  <Register />
                </ErrorBoundary>
              }
            />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route
                element={
                  <ErrorBoundary
                    title="Dashboard Error"
                    message="There was an error loading the dashboard. Your data is safe."
                    fallbackPath="/billing"
                    userId={user?.uid}
                    componentName="AppLayout">
                    <AppLayout user={user}>
                      {/* Nested routes below */}
                    </AppLayout>
                  </ErrorBoundary>
                }>
                {/* Admin Only Routes */}
                <Route element={<RoleBasedRoute allowedRoles={["admin"]} />}>
                  <Route
                    path="/dashboard"
                    element={
                      <ErrorBoundary
                        level="component"
                        componentName="Dashboard"
                        showReportButton={true}>
                        <Dashboard />
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/inventory"
                    element={
                      <ErrorBoundary
                        level="component"
                        componentName="Inventory"
                        showReportButton={true}>
                        <Inventory />
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/users"
                    element={
                      <ErrorBoundary
                        level="component"
                        componentName="Users"
                        showReportButton={true}>
                        <Users />
                      </ErrorBoundary>
                    }
                  />
                </Route>

                {/* Admin & Staff Routes */}
                <Route
                  element={
                    <RoleBasedRoute allowedRoles={["admin", "staff"]} />
                  }>
                  <Route
                    path="/billing"
                    element={
                      <ErrorBoundary
                        level="component"
                        componentName="Billing"
                        showReportButton={true}>
                        <Billing />
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/sales"
                    element={
                      <ErrorBoundary
                        level="component"
                        componentName="Sales"
                        showReportButton={true}>
                        <Sales userRole={user?.role} currentUser={user} />
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <ErrorBoundary
                        level="component"
                        componentName="Profile"
                        showReportButton={true}>
                        <Profile />
                      </ErrorBoundary>
                    }
                  />
                </Route>

                {/* Default redirect */}
                <Route path="/" element={<Navigate to="/billing" />} />
              </Route>
            </Route>
          </Routes>
        </ErrorBoundary>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
