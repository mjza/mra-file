import rateLimit from 'express-rate-limit';

/**
 * @swagger
 * components:
 *   responses:
 *     ApiRateLimitExceeded:
 *       description: Too many requests
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: Too many requests from this IP, please try again after 15 minutes.
 *       headers:
 *         Retry-After:
 *           description: Indicates how long the user should wait before making a new request.
 *           schema:
 *             type: integer
 *             format: int32
 */
/**
 * Rate limit configuration for the general API usage.
 * Limits the number of requests an IP can make in a set time window.
 * 
 * @const
 * @type {rateLimit}
 * @property {number} windowMs - The time frame for calculating the number of requests in milliseconds (15 minutes).
 * @property {number} max - The maximum number of requests allowed per IP in the specified window (100 requests per 15 minutes).
 * @property {string} message - The message returned when the rate limit is exceeded.
 */
const apiRequestLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute in milliseconds
    max: 60, // Limit each IP to 30 requests per `window` (here, per 15 minutes)
    message: { message: 'Too many requests from this IP, please try again after 15 minutes.' },
    skip: (req, _) => {
        const developmentToken = req.headers['x-development-token'];
        if (developmentToken) {
            return developmentToken === process.env.X_DEVELOPMENT_TOKEN;
        }
        // Do not skip in production
        return false; 
    }
});

export { apiRequestLimiter };