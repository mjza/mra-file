import { Router } from 'express';
const router = Router();
export default router;

import auditLogMiddleware from '../../utils/logger.mjs';
import fileRoutes from './fileRoutes.mjs';

//To automatically apply the auditLogMiddleware to all routes, We must place the middleware function before any route definitions
router.use(auditLogMiddleware);
router.use(fileRoutes);


/**
 * @swagger
 * components:
 *   responses:
 * 
 *     UnauthorizedAccessInvalidTokenProvided:
 *       description: Access unauthorized due to invalid token
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: "Invalid token provided."
 * 
 *     ApiRateLimitExceeded:
 *       description: API rate limit has been exceeded
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: "API rate limit exceeded."
 * 
 *     ServerInternalError:
 *       description: Internal server error.
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: different exception messages in server processing.
 * 
 *     Forbidden:
 *       description: Forbidden
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: User is not authorized.
 *               details:
 *                 type: string
 *                 example: Customer users must set condition to 'check_relationship'.
 *             required:
 *               - message
 * 
 *     ValidationError:
 *         description: Validation error. One or more fields are missing or incorrectly formatted.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                         example: fieldX
 *                       value:
 *                         type: string
 *                         example: abc
 *                       msg:
 *                         type: string
 *                         example: Field is not valid.
 *                       param:
 *                         type: string
 *                         example: fieldX
 *                       path:
 *                         type: string
 *                         example: fieldX
 *                       location:
 *                         type: string
 *                         example: query/body
 */