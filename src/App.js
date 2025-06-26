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
import Users from "./pages/Users";
import Profile from "./pages/Profile";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleBasedRoute from "./components/RoleBasedRoute";
import { auth, db } from "./firebase/firebase";
import { doc, getDoc } from "firebase/firestore";
import AppLayout from "./components/AppLayout";

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const docSnap = await getDoc(doc(db, "users", firebaseUser.uid));
        const role = docSnap.exists() ? docSnap.data().role : "staff";
        setUser({ ...firebaseUser, role });
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<ProtectedRoute />}>
          <Route
            element={
              <AppLayout user={user}>{/* Nested routes below */}</AppLayout>
            }>
            <Route element={<RoleBasedRoute allowedRoles={["admin"]} />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/users" element={<Users />} />
            </Route>
            <Route
              element={<RoleBasedRoute allowedRoles={["admin", "staff"]} />}>
              <Route path="/billing" element={<Billing />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
            <Route path="/" element={<Navigate to="/billing" />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
