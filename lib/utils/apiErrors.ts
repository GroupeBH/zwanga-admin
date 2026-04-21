type ApiError = {
  status?: number | string;
  error?: string;
  data?: {
    message?: string | string[];
    error?: string;
  };
};

export const getApiErrorStatus = (error: unknown): number | string | undefined => {
  if (!error || typeof error !== "object" || !("status" in error)) {
    return undefined;
  }

  return (error as ApiError).status;
};

export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (!error || typeof error !== "object") {
    return fallback;
  }

  const apiError = error as ApiError;
  const backendMessage = apiError.data?.message;

  if (Array.isArray(backendMessage) && backendMessage.length > 0) {
    return backendMessage.join(", ");
  }

  if (typeof backendMessage === "string" && backendMessage.trim().length > 0) {
    return backendMessage;
  }

  if (typeof apiError.data?.error === "string" && apiError.data.error.trim().length > 0) {
    return apiError.data.error;
  }

  if (typeof apiError.error === "string" && apiError.error.trim().length > 0) {
    return apiError.error;
  }

  return fallback;
};
