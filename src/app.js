require('dotenv').config({
    path: 'src/config/.env'
});
const localhost = 'http://localhost:3200';
const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const basicAuth = require('express-basic-auth');
const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');
const db = require('./utils/database');
const v1Routes = require('./routes/v1/routes');

/**
 * Asynchronously initializes and configures the Express application. This function
 * sets up middleware, routes, and any other required configurations necessary for
 * the application to run. It's designed to be called at the start of the application
 * lifecycle, ensuring that all application components are properly initialized before
 * the server starts accepting requests.
 *
 * The setup can include, but is not limited to, configuring body parsing middleware,
 * setting up route handlers, configuring security headers, and integrating any external
 * services or databases required by the application. This function ensures that the
 * Express app is fully configured and ready to use upon its return.
 *
 * @async
 * @function createApp
 * @returns {Promise<import('express').Application>} A promise that resolves with the
 *                                                   configured Express application
 *                                                   instance. This allows for asynchronous
 *                                                   operations needed during the app's
 *                                                   setup to be completed before the app
 *                                                   is returned and used.
 */
async function createApp() {

    const app = express();

    // When the Express app is behind a reverse proxy, the X-Forwarded-For header is used to 
    // identify the original IP address of the client connecting to the app through the proxy. 
    // However, for security reasons, Express does not trust this header by default. It is needed 
    // to explicitly enable it by setting trust proxy in the Express configuration. 
    // Failing to do so can prevent middlewares like express-rate-limit from accurately 
    // identifying users, leading to potential issues with rate limiting.    
    app.set('trust proxy', 1);

    // Built-in middleware for parsing JSON and URL-encoded bodies
    app.use(express.json());
    app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
    // Cookie-parser middleware for parsing cookies
    app.use(cookieParser());

    // This will enable CORS for specific routes
    const defaultUrl = process.env.BASE_URL || localhost;
    const allowedUrlsEnv = process.env.CORS_ALLOWED_URLS || '';
    const allowedUrls = allowedUrlsEnv.split(',').map(url => url.trim());
    const allowedOrigins = [defaultUrl, ...allowedUrls];

    const corsOptions = {
        origin: function (origin, callback) {
            if (!origin || allowedOrigins.indexOf(origin) !== -1) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        optionsSuccessStatus: 200
    };
    app.use(cors(corsOptions));

    // Basic Helmet usage
    app.use(helmet()); // It sets up Helmet with its default configuration. Helmet, by default, includes a set of middlewares that set HTTP headers for basic security protections. 

    // Content Security Policy (CSP), which helps prevent attacks like Cross-Site Scripting (XSS) and data injection.
    app.use(
        helmet.contentSecurityPolicy({
            directives: {
                defaultSrc: ["'self'"], // It  restricts all content sources to the same origin by default. This means that by default, your page can only load content (like scripts, images, CSS, etc.) from its own origin.
                scriptSrc: ["'self'"],  // It specifies where scripts can be loaded from. Here, it allows scripts from the same origin.
                objectSrc: ["'none'"],  // It prevents the page from loading plugins (like Flash, Java applets).
                upgradeInsecureRequests: [], // It will upgrade all HTTP requests to HTTPS in browsers that support this directive.
            },
        })
    );
    // X-Content-Type-Options
    app.use(helmet.noSniff()); // It prevents browsers from trying to guess (“sniff”) the MIME type, which can have security implications. It forces the browser to use the type provided in the Content-Type header.
    // X-Frame-Options
    app.use(helmet.frameguard({ action: 'deny' })); // It instructs the browser to prevent any framing of the site, which can help protect against clickjacking attacks.

    // Use routes
    app.use('/v1', v1Routes);

    // Alternatively, consider other truthy values
    const activateSwagger = ['true', '1', 'yes'].includes(process.env.ACTIVATE_SWAGGER ? process.env.ACTIVATE_SWAGGER.toLowerCase() : '');

    // Conditionally include Swagger UI middleware based on environment
    if (process.env.NODE_ENV !== 'production' || activateSwagger ) {

        // Swagger definition
        const swaggerDefinition = {
            openapi: '3.0.0',
            info: {
                title: 'Express File API',
                version: '1.0.0',
                description: 'A CRUD File API',
            },
            servers: [
                {
                    url: (process.env.BASE_URL || localhost),
                    description: 'File Microservice',
                }
            ],
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT',
                    },
                },
            },
            tags: [
                { name: '1st', description: 'S3 Files' },
            ],
        };

        // Options for the swagger docs
        const v1SwaggerOptions = {
            swaggerDefinition,
            // Absolute paths to files containing Swagger annotations
            apis: ['src/routes/v1/*.js', 'src/utils/*.js'],
        };

        // Initialize swagger-jsdoc
        const v1SwaggerSpec = swaggerJSDoc(v1SwaggerOptions);

        if (typeof process.env.DOC_USER === 'undefined' || typeof process.env.DOC_PASS === 'undefined') {
            console.error('Environment variable DOC_USER or DOC_PASS is not defined.');
            process.exit(1); // Exits the application with an error code
        }

        // Basic auth credentials for accessing Swaggar
        const users = {};
        users[process.env.DOC_USER] = process.env.DOC_PASS;


        // Use swaggerUi to serve swagger docs
        app.use('/v1' + process.env.DOC_URL, basicAuth({
            users,
            challenge: true // Causes browsers to show a login dialog
        }), swaggerUi.serve, swaggerUi.setup(v1SwaggerSpec, {
            customSiteTitle: "File API"
        }));
    }
    
    // Serve static files from 'public' directory
    app.use(express.static(path.join(__dirname, 'public')));

    // Catch-all route for undefined routes
    app.get('*', (req, res) => {
        res.status(404).sendFile(path.join(__dirname, 'public', 'error.html'));
    });

    return app;
}

/**
 * Closes all application resources to ensure a clean and graceful shutdown.
 * This function is designed to be called during the application shutdown process,
 * whether it's being terminated normally or due to an error. It ensures that all
 * external connections and resources, such as database connections and any other
 * resources initialized by the application, are properly closed.
 *
 * The function specifically handles closing the Casbin TypeORM adapter's connection
 * to cleanly release the database connection resources. It also ensures that any
 * database pool managed by the application is properly closed, preventing potential
 * leaks and ensuring that the application can be restarted without issues.
 *
 * @async
 * @function closeApp
 * @returns {Promise<void>} A promise that resolves once all the application resources
 *                          have been successfully closed. If an error occurs during
 *                          the resource closure process, it should be caught and
 *                          handled by the caller to avoid unhandled promise rejections.
 */
async function closeApp() {
    await db.closeDBConnections();
}

module.exports = { createApp, closeApp };
