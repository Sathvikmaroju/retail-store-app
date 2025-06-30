import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import ErrorBoundary from "./components/ErrorBoundary";
import errorLogger from "./services/errorLogger";

// Initialize error logging
errorLogger.init();

// ✅ Minimalist, elegant theme configuration
const theme = createTheme({
  palette: {
    mode: "light",
    background: {
      default: "#f9fafb", // light gray background
      paper: "#ffffff", // white for cards/panels
    },
    primary: {
      main: "#3b82f6", // soft blue
    },
    secondary: {
      main: "#10b981", // soft green (optional)
    },
    text: {
      primary: "#1f2937", // dark gray
      secondary: "#6b7280", // mid-gray
    },
  },
  typography: {
    fontFamily: "Inter, Roboto, sans-serif",
    fontSize: 14,
  },
  shape: {
    borderRadius: 8,
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));

// Global error handler for the entire app
const handleGlobalError = (error, errorInfo, errorId) => {
  console.error("Global error handler:", { error, errorInfo, errorId });

  // Log to error service
  errorLogger.logError({
    type: "react_error_boundary",
    message: error.message,
    stack: error.stack,
    componentStack: errorInfo?.componentStack,
    errorId,
    location: "global_app_level",
  });
};

root.render(
  <React.StrictMode>
    <ErrorBoundary
      title="Application Startup Error"
      message="The application failed to start properly. Please refresh the page or try again later."
      onError={handleGlobalError}
      fallbackPath="/login">
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ErrorBoundary
          title="Theme or Material-UI Error"
          message="There was an error with the application's styling system."
          onError={handleGlobalError}
          componentName="ThemeProvider">
          <App />
        </ErrorBoundary>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

// Performance monitoring
reportWebVitals((metric) => {
  // Log performance metrics
  errorLogger.logPerformance(metric.name, metric.value, {
    id: metric.id,
    rating: metric.rating,
  });

  // Console log in development
  if (process.env.NODE_ENV === "development") {
    console.log("Performance metric:", metric);
  }
});
