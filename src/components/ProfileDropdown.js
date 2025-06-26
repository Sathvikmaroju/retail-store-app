import React, { useState, useRef, useEffect } from "react";
import { auth } from "../firebase/firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { User, Settings, LogOut, ChevronDown } from "lucide-react";

function ProfileDropdown({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Logout failed. Please try again.");
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  const handleProfileClick = () => {
    navigate("/profile");
    setIsOpen(false);
  };

  const getUserInitials = (email) => {
    if (!email) return "U";
    return email.charAt(0).toUpperCase();
  };

  const getRoleColor = (role) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return "#dc2626";
      case "staff":
        return "#059669";
      default:
        return "#6b7280";
    }
  };

  const dropdownStyle = {
    position: "relative",
    display: "inline-block",
  };

  const triggerStyle = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 12px",
    backgroundColor: isOpen ? "#f3f4f6" : "transparent",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s",
    outline: "none",
  };

  const avatarStyle = {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    backgroundColor: "#3b82f6",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    fontWeight: "600",
  };

  const menuStyle = {
    position: "absolute",
    top: "100%",
    right: "0",
    marginTop: "4px",
    backgroundColor: "#ffffff",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
    minWidth: "220px",
    zIndex: 1000,
    opacity: isOpen ? 1 : 0,
    visibility: isOpen ? "visible" : "hidden",
    transform: isOpen ? "translateY(0)" : "translateY(-8px)",
    transition: "all 0.2s",
  };

  const headerStyle = {
    padding: "16px",
    borderBottom: "1px solid #e5e7eb",
  };

  const menuItemStyle = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    width: "100%",
    padding: "12px 16px",
    backgroundColor: "transparent",
    border: "none",
    textAlign: "left",
    cursor: "pointer",
    fontSize: "14px",
    color: "#374151",
    transition: "background-color 0.2s",
  };

  const logoutItemStyle = {
    ...menuItemStyle,
    color: "#dc2626",
    borderTop: "1px solid #e5e7eb",
  };

  return (
    <div style={dropdownStyle} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={triggerStyle}
        onMouseEnter={(e) => {
          if (!isOpen) e.target.style.backgroundColor = "#f9fafb";
        }}
        onMouseLeave={(e) => {
          if (!isOpen) e.target.style.backgroundColor = "transparent";
        }}>
        <div style={avatarStyle}>{getUserInitials(user?.email)}</div>
        <div style={{ textAlign: "left" }}>
          <div
            style={{ fontSize: "14px", fontWeight: "500", color: "#1f2937" }}>
            {user?.email?.split("@")[0] || "User"}
          </div>
          <div
            style={{
              fontSize: "12px",
              color: getRoleColor(user?.role),
              textTransform: "capitalize",
              fontWeight: "500",
            }}>
            {user?.role || "User"}
          </div>
        </div>
        <ChevronDown
          size={16}
          style={{
            color: "#6b7280",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        />
      </button>

      <div style={menuStyle}>
        <div style={headerStyle}>
          <div
            style={{ fontSize: "14px", fontWeight: "600", color: "#1f2937" }}>
            {user?.email}
          </div>
          <div
            style={{
              fontSize: "12px",
              color: "#6b7280",
              marginTop: "4px",
            }}>
            Signed in as {user?.role || "User"}
          </div>
        </div>

        <div style={{ padding: "8px 0" }}>
          <button
            onClick={handleProfileClick}
            style={menuItemStyle}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "#f9fafb")}
            onMouseLeave={(e) =>
              (e.target.style.backgroundColor = "transparent")
            }>
            <User size={16} />
            Profile Settings
          </button>
        </div>

        <button
          onClick={handleLogout}
          disabled={isLoading}
          style={logoutItemStyle}
          onMouseEnter={(e) => (e.target.style.backgroundColor = "#fef2f2")}
          onMouseLeave={(e) =>
            (e.target.style.backgroundColor = "transparent")
          }>
          <LogOut size={16} />
          {isLoading ? "Signing out..." : "Sign out"}
        </button>
      </div>
    </div>
  );
}

export default ProfileDropdown;
