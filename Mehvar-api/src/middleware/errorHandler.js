const { ApiError, errorBody, requestPath } = require("../utils/errors");

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const path = requestPath(req);

  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json(
      errorBody("INVALID_JSON", "Request body must be valid JSON.", path),
    );
  }

  if (err instanceof ApiError) {
    return res.status(err.status).json(errorBody(err.errorCode, err.message, path));
  }

  console.error("[mehvar] unexpected error:", err && err.message ? err.message : err);

  return res.status(500).json(
    errorBody("INTERNAL_SERVER_ERROR", "An unexpected error occurred.", path),
  );
}

module.exports = errorHandler;
