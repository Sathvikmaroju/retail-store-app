import { useCallback, useState } from "react";
import errorLogger from "../services/errorLogger";

/**
 * Custom hook for handling errors in functional components
 * Provides consistent error handling and logging across the app
 */
const useErrorHandler = (componentName = "Unknown Component") => {
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Handle async operations with error catching
  const handleAsync = useCallback(
    async (asyncOperation, options = {}) => {
      const {
        loadingState = true,
        errorMessage = "An error occurred",
        onSuccess,
        onError,
        retries = 0,
      } = options;

      if (loadingState) setIsLoading(true);
      setError(null);

      let lastError;

      // Retry logic
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const result = await asyncOperation();

          if (loadingState) setIsLoading(false);

          // Call success callback if provided
          if (onSuccess) {
            onSuccess(result);
          }

          return result;
        } catch (err) {
          lastError = err;
          console.error(
            `${componentName} - Attempt ${attempt + 1} failed:`,
            err
          );

          // If this isn't the last attempt, wait before retrying
          if (attempt < retries) {
            await new Promise((resolve) =>
              setTimeout(resolve, 1000 * Math.pow(2, attempt))
            );
          }
        }
      }

      // All attempts failed
      if (loadingState) setIsLoading(false);

      const errorObj = {
        message: errorMessage,
        originalError: lastError,
        component: componentName,
        timestamp: new Date().toISOString(),
      };

      setError(errorObj);

      // Log the error
      errorLogger.logError({
        type: "component_async_error",
        message: lastError?.message || errorMessage,
        stack: lastError?.stack,
        component: componentName,
        errorId: `async_error_${Date.now()}`,
        retries,
      });

      // Call error callback if provided
      if (onError) {
        onError(lastError);
      }

      throw lastError;
    },
    [componentName]
  );

  // Handle Firebase operations specifically
  const handleFirebaseOperation = useCallback(
    async (operation, options = {}) => {
      return handleAsync(operation, {
        errorMessage: "Database operation failed",
        ...options,
      });
    },
    [handleAsync]
  );

  // Handle form submissions
  const handleFormSubmit = useCallback(
    async (submitFunction, options = {}) => {
      return handleAsync(submitFunction, {
        errorMessage: "Form submission failed",
        loadingState: true,
        ...options,
      });
    },
    [handleAsync]
  );

  // Report error manually
  const reportError = useCallback(
    (error, context = {}) => {
      const errorObj = {
        message: error.message || "Manual error report",
        originalError: error,
        component: componentName,
        context,
        timestamp: new Date().toISOString(),
      };

      setError(errorObj);

      errorLogger.logError({
        type: "manual_error_report",
        message: error.message,
        stack: error.stack,
        component: componentName,
        context,
        errorId: `manual_error_${Date.now()}`,
      });
    },
    [componentName]
  );

  // Show user-friendly error message
  const getErrorMessage = useCallback(() => {
    if (!error) return null;

    // Check for specific error types and return user-friendly messages
    if (error.originalError?.code) {
      switch (error.originalError.code) {
        case "permission-denied":
          return "You do not have permission to perform this action.";
        case "network-request-failed":
          return "Network error. Please check your internet connection.";
        case "unavailable":
          return "Service is temporarily unavailable. Please try again later.";
        default:
          return error.message;
      }
    }

    return error.message;
  }, [error]);

  return {
    error,
    isLoading,
    clearError,
    handleAsync,
    handleFirebaseOperation,
    handleFormSubmit,
    reportError,
    getErrorMessage,
    hasError: !!error,
  };
};

export default useErrorHandler;
