import React, { useState, useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { auth, db } from "../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { Loader2, ShieldX } from "lucide-react";

const RoleBasedRoute = ({ allowedRoles = [] }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser(currentUser);
            setUserRole(userData.role);
          } else {
            setError("User profile not found");
          }
        } catch (err) {
          console.error("Error fetching user role:", err);
          setError("Failed to verify user permissions");
        }
      } else {
        setUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Loading state
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "#f9fafb",
        }}>
        <Loader2
          size={40}
          color="#3b82f6"
          style={{
            animation: "spin 1s linear infinite",
          }}
        />
        <p
          style={{
            marginTop: "16px",
            color: "#6b7280",
            fontSize: "16px",
          }}>
          Verifying permissions...
        </p>
        <style>
          {`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "#f9fafb",
          padding: "20px",
        }}>
        <div
          style={{
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "12px",
            padding: "24px",
            textAlign: "center",
            maxWidth: "400px",
          }}>
          <ShieldX size={48} color="#dc2626" style={{ marginBottom: "16px" }} />
          <h2
            style={{
              color: "#dc2626",
              marginBottom: "8px",
              fontSize: "20px",
              fontWeight: "600",
            }}>
            Access Error
          </h2>
          <p style={{ color: "#6b7280", marginBottom: "16px" }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: "#dc2626",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
            }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user role is allowed
  if (!allowedRoles.includes(userRole)) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "#f9fafb",
          padding: "20px",
        }}>
        <div
          style={{
            backgroundColor: "#fffbeb",
            border: "1px solid #fed7aa",
            borderRadius: "12px",
            padding: "24px",
            textAlign: "center",
            maxWidth: "400px",
          }}>
          <ShieldX size={48} color="#f59e0b" style={{ marginBottom: "16px" }} />
          <h2
            style={{
              color: "#92400e",
              marginBottom: "8px",
              fontSize: "20px",
              fontWeight: "600",
            }}>
            Access Denied
          </h2>
          <p style={{ color: "#6b7280", marginBottom: "16px" }}>
            You don't have permission to access this page. Required roles:{" "}
            {allowedRoles.join(", ")}
          </p>
          <p
            style={{
              color: "#6b7280",
              fontSize: "14px",
              marginBottom: "16px",
            }}>
            Your role:{" "}
            <span style={{ fontWeight: "500" }}>{userRole || "Unknown"}</span>
          </p>
          <button
            onClick={() => window.history.back()}
            style={{
              backgroundColor: "#f59e0b",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              marginRight: "8px",
            }}>
            Go Back
          </button>
          <button
            onClick={() => (window.location.href = "/billing")}
            style={{
              backgroundColor: "#6b7280",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
            }}>
            Go to Billing
          </button>
        </div>
      </div>
    );
  }

  // Render protected content
  return <Outlet />;
};

export default RoleBasedRoute;
