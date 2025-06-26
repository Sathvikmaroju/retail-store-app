import { useEffect, useRef, useCallback } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebase";

const useIdleLogout = (timeoutMinutes = 15) => {
  const timeoutRef = useRef(null);
  const warningTimeoutRef = useRef(null);
  const isLoggedIn = useRef(!!auth.currentUser);

  // Convert minutes to milliseconds
  const timeoutMs = timeoutMinutes * 60 * 1000;
  const warningMs = timeoutMs - 2 * 60 * 1000; // Show warning 2 minutes before logout

  // Reset the idle timer
  const resetTimer = useCallback(() => {
    // Only reset timer if user is logged in
    if (!auth.currentUser) return;

    // Clear existing timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }

    // Set warning timer (2 minutes before logout)
    warningTimeoutRef.current = setTimeout(() => {
      if (auth.currentUser) {
        const shouldStay = window.confirm(
          "You have been inactive for 13 minutes. You will be automatically logged out in 2 minutes. Click OK to stay logged in."
        );

        if (shouldStay) {
          resetTimer(); // Reset the timer if user wants to stay
        }
      }
    }, warningMs);

    // Set logout timer
    timeoutRef.current = setTimeout(async () => {
      if (auth.currentUser) {
        try {
          await signOut(auth);
          alert("You have been automatically logged out due to inactivity.");
          // Redirect to login page
          window.location.href = "/login";
        } catch (error) {
          console.error("Auto logout error:", error);
        }
      }
    }, timeoutMs);
  }, [timeoutMs, warningMs]);

  // Clean up timers
  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
  }, []);

  // Handle user activity
  const handleActivity = useCallback(() => {
    if (auth.currentUser) {
      resetTimer();
    }
  }, [resetTimer]);

  useEffect(() => {
    // Events to track for user activity
    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
      "keydown",
    ];

    // Track authentication state changes
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        isLoggedIn.current = true;
        resetTimer(); // Start timer when user logs in
      } else {
        isLoggedIn.current = false;
        cleanup(); // Clean up timers when user logs out
      }
    });

    // Add event listeners for user activity
    events.forEach((event) => {
      document.addEventListener(event, handleActivity, true);
    });

    // Cleanup function
    return () => {
      // Remove event listeners
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity, true);
      });

      // Clean up timers
      cleanup();

      // Unsubscribe from auth state changes
      unsubscribe();
    };
  }, [handleActivity, resetTimer, cleanup]);

  // Return method to manually reset timer (useful for specific actions)
  return { resetTimer, cleanup };
};

export default useIdleLogout;
