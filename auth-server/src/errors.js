/** Errors safe to surface to the client (message is user-facing, code is stable). */
export class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (message, code = 'invalid_request') => new AppError(400, code, message);
export const unauthorized = (message = 'Authentication required.', code = 'invalid_token') =>
  new AppError(401, code, message);
export const misconfigured = (message) => new AppError(500, 'provider_misconfigured', message);
export const upstream = (message = 'The identity provider could not be reached.') =>
  new AppError(502, 'provider_unavailable', message);
