class ApiError extends Error {
  constructor(status, errorCode, message) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errorCode = errorCode;
  }
}

function errorBody(errorCode, message, path) {
  return {
    error_code: errorCode,
    message,
    timestamp: new Date().toISOString(),
    path,
  };
}

function requestPath(req) {
  const raw = req.originalUrl || req.url || "/";
  return raw.split("?")[0];
}

module.exports = {
  ApiError,
  errorBody,
  requestPath,
};
