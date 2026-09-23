const { ApiError } = require("../utils/errors");

function notFound(req, res, next) {
  next(
    new ApiError(
      404,
      "ROUTE_NOT_FOUND",
      `No route matches ${req.method} ${req.path}.`,
    ),
  );
}

module.exports = notFound;
