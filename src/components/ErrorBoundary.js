import React from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  Chip,
} from "@mui/material";
import { RefreshCw, Home, Bug, AlertTriangle } from "lucide-react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Generate unique error ID for tracking
    const errorId = `error_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    return {
      hasError: true,
      errorId: errorId,
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Log to external service in production
    if (process.env.NODE_ENV === "production") {
      this.logErrorToService(error, errorInfo);
    }

    this.setState({
      error: error,
      errorInfo: errorInfo,
    });

    // Call onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo, this.state.errorId);
    }
  }

  logErrorToService = (error, errorInfo) => {
    // In production, you'd send this to a service like Sentry, LogRocket, etc.
    const errorData = {
      errorId: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.props.userId || "anonymous",
      retryCount: this.state.retryCount,
    };

    console.log("Error logged:", errorData);

    // Example: Send to your error tracking service
    // errorTrackingService.log(errorData);
  };

  handleRetry = () => {
    this.setState((prevState) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
      errorId: null,
    }));
  };

  handleGoHome = () => {
    window.location.href = this.props.fallbackPath || "/billing";
  };

  handleReload = () => {
    window.location.reload();
  };

  handleReportError = () => {
    // Open email client or redirect to support
    const subject = encodeURIComponent(`Error Report - ${this.state.errorId}`);
    const body = encodeURIComponent(`
Error ID: ${this.state.errorId}
Error Message: ${this.state.error?.message || "Unknown error"}
Timestamp: ${new Date().toISOString()}
Page: ${window.location.href}

Please describe what you were doing when this error occurred:
[Your description here]
    `);

    window.open(
      `mailto:support@yourcompany.com?subject=${subject}&body=${body}`
    );
  };

  render() {
    if (this.state.hasError) {
      // If this is a small/component-level error boundary, show minimal UI
      if (this.props.level === "component") {
        return (
          <Card sx={{ m: 2, border: "2px solid", borderColor: "error.light" }}>
            <CardContent sx={{ textAlign: "center", py: 3 }}>
              <AlertTriangle
                size={32}
                color="#ff5722"
                style={{ marginBottom: 16 }}
              />
              <Typography variant="h6" color="error" gutterBottom>
                {this.props.componentName || "Component"} Error
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Something went wrong in this section.
              </Typography>
              <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={this.handleRetry}
                  disabled={this.state.retryCount >= 3}>
                  {this.state.retryCount >= 3 ? "Failed" : "Retry"}
                </Button>
                {this.props.showReportButton && (
                  <Button
                    size="small"
                    variant="text"
                    onClick={this.handleReportError}>
                    Report
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        );
      }

      // Full-page error boundary
      return (
        <Box
          sx={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f5f5f5",
            p: 3,
          }}>
          <Card sx={{ maxWidth: 600, width: "100%" }}>
            <CardContent sx={{ p: 4, textAlign: "center" }}>
              {/* Error Icon */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  mb: 3,
                }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    backgroundColor: "error.light",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                  <Bug size={40} color="#fff" />
                </Box>
              </Box>

              {/* Error Title */}
              <Typography variant="h4" color="error" gutterBottom>
                {this.props.title || "Oops! Something went wrong"}
              </Typography>

              {/* Error Description */}
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                {this.props.message ||
                  "We're sorry, but something unexpected happened. Don't worry, your data is safe."}
              </Typography>

              {/* Error ID for support */}
              {this.state.errorId && (
                <Chip
                  label={`Error ID: ${this.state.errorId}`}
                  size="small"
                  variant="outlined"
                  sx={{ mb: 2 }}
                />
              )}

              {/* Retry Information */}
              {this.state.retryCount > 0 && (
                <Alert severity="info" sx={{ mb: 3 }}>
                  Retry attempt: {this.state.retryCount}
                  {this.state.retryCount >= 3 && " - Maximum retries reached"}
                </Alert>
              )}

              {/* Error Details for Development */}
              {process.env.NODE_ENV === "development" && this.state.error && (
                <Box sx={{ mb: 3 }}>
                  <details>
                    <summary
                      style={{
                        cursor: "pointer",
                        color: "#666",
                        marginBottom: "1rem",
                      }}>
                      <Chip
                        icon={<Bug size={16} />}
                        label="Show Error Details (Development)"
                        variant="outlined"
                        size="small"
                      />
                    </summary>
                    <Alert severity="error" sx={{ textAlign: "left" }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Error: {this.state.error.toString()}
                      </Typography>
                      <Typography
                        variant="body2"
                        component="pre"
                        sx={{
                          fontSize: "0.75rem",
                          whiteSpace: "pre-wrap",
                          maxHeight: "200px",
                          overflow: "auto",
                          backgroundColor: "#f5f5f5",
                          p: 1,
                          borderRadius: 1,
                          mt: 1,
                        }}>
                        {this.state.errorInfo?.componentStack}
                      </Typography>
                    </Alert>
                  </details>
                </Box>
              )}

              {/* Action Buttons */}
              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}>
                <Button
                  variant="contained"
                  startIcon={<RefreshCw size={20} />}
                  onClick={this.handleRetry}
                  disabled={this.state.retryCount >= 3}>
                  {this.state.retryCount >= 3
                    ? "Max Retries Reached"
                    : "Try Again"}
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<Home size={20} />}
                  onClick={this.handleGoHome}>
                  Go to Home
                </Button>

                <Button
                  variant="text"
                  startIcon={<RefreshCw size={20} />}
                  onClick={this.handleReload}
                  color="secondary">
                  Reload Page
                </Button>
              </Box>

              {/* Report Error Button */}
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="text"
                  size="small"
                  onClick={this.handleReportError}
                  sx={{ textDecoration: "underline" }}>
                  Report this error to support
                </Button>
              </Box>

              {/* Help Text */}
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 3, display: "block" }}>
                If this problem persists, please contact support with the error
                ID above.
              </Typography>
            </CardContent>
          </Card>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
