// Error logging service for production use
class ErrorLogger {
  constructor() {
    this.isProduction = process.env.NODE_ENV === "production";
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
  }

  // Log application errors
  async logError(errorData) {
    if (!this.isProduction) {
      console.log("Dev Mode - Error would be logged:", errorData);
      return;
    }

    const enrichedError = {
      ...errorData,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      connection: this.getConnectionInfo(),
    };

    try {
      await this.sendToLoggingService(enrichedError);
    } catch (error) {
      console.error("Failed to log error to service:", error);
      // Fallback: store in localStorage for later retry
      this.storeForRetry(enrichedError);
    }
  }

  // Log user actions for debugging context
  logUserAction(action, details = {}) {
    if (!this.isProduction) return;

    const actionData = {
      type: "user_action",
      action,
      details,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    };

    try {
      this.sendToLoggingService(actionData);
    } catch (error) {
      console.error("Failed to log user action:", error);
    }
  }

  // Log performance metrics
  logPerformance(metricName, value, details = {}) {
    if (!this.isProduction) return;

    const performanceData = {
      type: "performance",
      metric: metricName,
      value,
      details,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    };

    try {
      this.sendToLoggingService(performanceData);
    } catch (error) {
      console.error("Failed to log performance data:", error);
    }
  }

  // Send to your logging service (replace with your actual service)
  async sendToLoggingService(data) {
    // Example endpoints - replace with your actual logging service
    const endpoints = {
      error: "/api/errors",
      user_action: "/api/user-actions",
      performance: "/api/performance",
    };

    const endpoint = endpoints[data.type] || endpoints.error;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        if (response.ok) {
          console.log("Successfully logged to service");
          return;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        console.error(`Logging attempt ${attempt + 1} failed:`, error);

        if (attempt < this.maxRetries - 1) {
          await this.delay(this.retryDelay * Math.pow(2, attempt)); // Exponential backoff
        } else {
          throw error;
        }
      }
    }
  }

  // Store failed logs for retry
  storeForRetry(errorData) {
    try {
      const stored = JSON.parse(
        localStorage.getItem("pending_error_logs") || "[]"
      );
      stored.push(errorData);

      // Keep only last 10 errors to prevent localStorage bloat
      if (stored.length > 10) {
        stored.shift();
      }

      localStorage.setItem("pending_error_logs", JSON.stringify(stored));
    } catch (error) {
      console.error("Failed to store error for retry:", error);
    }
  }

  // Retry pending logs (call this when app comes back online)
  async retryPendingLogs() {
    try {
      const pending = JSON.parse(
        localStorage.getItem("pending_error_logs") || "[]"
      );

      if (pending.length === 0) return;

      console.log(`Retrying ${pending.length} pending error logs...`);

      for (const errorData of pending) {
        try {
          await this.sendToLoggingService(errorData);
        } catch (error) {
          console.error("Failed to retry error log:", error);
          // Keep it for next retry
          continue;
        }
      }

      // Clear successfully sent logs
      localStorage.removeItem("pending_error_logs");
      console.log("Successfully retried pending error logs");
    } catch (error) {
      console.error("Failed to retry pending logs:", error);
    }
  }

  // Get connection information
  getConnectionInfo() {
    if ("connection" in navigator) {
      const conn = navigator.connection;
      return {
        effectiveType: conn.effectiveType,
        downlink: conn.downlink,
        rtt: conn.rtt,
        saveData: conn.saveData,
      };
    }
    return null;
  }

  // Utility delay function
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Get browser and device info
  getBrowserInfo() {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      languages: navigator.languages,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      doNotTrack: navigator.doNotTrack,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: navigator.deviceMemory,
      maxTouchPoints: navigator.maxTouchPoints,
    };
  }

  // Initialize error logger
  init() {
    // Set up global error handlers
    window.addEventListener("error", (event) => {
      this.logError({
        type: "javascript_error",
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        errorId: `js_error_${Date.now()}`,
      });
    });

    window.addEventListener("unhandledrejection", (event) => {
      this.logError({
        type: "unhandled_promise_rejection",
        message: event.reason?.message || "Unhandled promise rejection",
        stack: event.reason?.stack,
        errorId: `promise_error_${Date.now()}`,
      });
    });

    // Retry any pending logs on app start
    this.retryPendingLogs();

    // Set up periodic retry (every 5 minutes)
    setInterval(() => {
      this.retryPendingLogs();
    }, 5 * 60 * 1000);

    console.log("Error logger initialized");
  }
}

// Create singleton instance
const errorLogger = new ErrorLogger();

export default errorLogger;
