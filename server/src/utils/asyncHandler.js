// Express 4 does not catch rejected promises from async route handlers —
// an error thrown inside one crashes the request with a raw, non-JSON 500
// instead of reaching our error-handling middleware. Wrap every handler so
// failures (e.g. a transient database hiccup) always produce a clean
// JSON error response instead of an opaque platform-level crash.
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
