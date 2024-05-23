const { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");
const { createPresignedPost } = require('@aws-sdk/s3-presigned-post');
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const router = require('express').Router();
const { query, body } = require('express-validator');
const db = require('../../utils/database');
const { apiRequestLimiter } = require('../../utils/rateLimit');
const { updateEventLog } = require('../../utils/logger');
const { authorizeUser, checkRequestValidity } = require('../../utils/validations');
const { generateUUIDWithUTCTimestamp } = require('../../utils/generators');
const { extractFileExtension } = require('../../utils/converters');

// Configure the AWS S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

/**
 * Helper function to extract bucket name, key, domain, and userId from an S3 URL.
 *
 * @param {string} url - The S3 URL to parse.
 * @returns {Object} An object containing the bucket name, key, domain, and userId.
 * @returns {string} return.bucketName - The name of the S3 bucket.
 * @returns {string} return.region - The name of the S3 region.
 * @returns {string} return.key - The key of the object within the S3 bucket.
 * @returns {number} return.domain - The domain extracted from the key.
 * @returns {number} return.userId - The user ID extracted from the key.
 * @throws {Error} If the URL is invalid and does not match the expected S3 URL format, or if domain/userId extraction fails.
 */
function parseS3Url(url) {
  const match = url.match(/^https:\/\/([^.]+)\.s3\.([^.]+)\.amazonaws\.com\/(.+)$/);
  if (!match) {
    throw new Error(`Invalid S3 URL: ${url}`);
  }
  const [, bucketName, region, key] = match;

  // Extract domain and userId from the key
  const keyParts = key.split('/');
  // Find the domain and userId parts based on their positions
  const domainPart = keyParts[2]; // Domain is always the third part
  const userPart = keyParts[3]; // UserId is always the fourth part

  if (!domainPart || !userPart || !domainPart.startsWith('d') || !userPart.startsWith('u')) {
    throw new Error(`Invalid S3 key structure: ${key}`);
  }

  const domain = parseInt(domainPart.substring(1), 10); // Remove the 'd' prefix and convert to integer
  const userId = parseInt(userPart.substring(1), 10); // Remove the 'u' prefix and convert to integer

  if (isNaN(userId)) {
    throw new Error(`Invalid userId extracted from key: ${key}`);
  }

  return { bucketName, region, key, domain, userId };
}

/**
 * Helper function to remove the "-org" suffix and file extension from an S3 object key.
 *
 * @param {string} key - The key of the S3 object.
 * @returns {string} The key with the "-org" suffix and file extension removed.
 */
function getKeyPrefix(key) {
  return key.replace(/-org\.[^.]+$/, '');
}

/**
 * Delays execution for a given number of milliseconds.
 * @param {number} ms - The number of milliseconds to wait.
 * @returns {Promise} - A promise that resolves after the specified time.
 */
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Checks the status of an S3 object by examining its metadata.
 * @param {string} bucketName - The name of the S3 bucket.
 * @param {string} key - The key of the S3 object.
 * @returns {Promise<string>} - The status of the S3 object.
 */
const checkObjectStatus = async (bucketName, key) => {
  const headParams = {
    Bucket: bucketName,
    Key: key
  };
  const headData = await s3Client.send(new HeadObjectCommand(headParams));
  return headData.Metadata.status || 'completed'; // Default to 'completed' if no status found
};

/**
 * @swagger
 * /v1/generate-presigned-put-url:
 *   get:
 *     summary: Generate a presigned URL for S3 uploads
 *     description: Generates a presigned URL to allow clients to upload files directly to a specified S3 bucket under controlled permissions.
 *     tags: [1st]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: countryISOCode
 *         required: true
 *         type: string
 *         example: "ca"
 *         description: CountryISOCode must be a non-empty string with 2 characters.
 *       - in: query
 *         name: fileName
 *         required: true
 *         type: string
 *         example: "pic1.jpeg"
 *         description: The name of the file for which the presigned URL will be generated.
 *       - in: query
 *         name: fileType
 *         required: true
 *         type: string
 *         example: "image/jpeg"
 *         description: The MIME type of the file to be uploaded.
 *       - in: query
 *         name: domain
 *         required: true
 *         type: integer
 *         example: 0
 *         description: Domain identifier to check if the user has the required access rights.
 *       - in: query
 *         name: fileSize
 *         required: true
 *         type: integer
 *         example: 1024
 *         description: FileSize must be a number representing the file size in bytes.
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: Successfully generated presigned URL.
 *         schema:
 *           type: object
 *           properties:
 *             presignedUrl:
 *               type: string
 *               description: The presigned URL to upload the file.
 *             exp:
 *               type: integer
 *               example: 1702233326
 *               description: Expiration Time of the presigned url
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       429:
 *         $ref: '#/components/responses/ApiRateLimitExceeded'
 *       500:
 *         $ref: '#/components/responses/ServerInternalError'
 */
router.get('/generate-presigned-put-url',
  apiRequestLimiter,
  [
    query('countryISOCode', 'CountryISOCode must be a non-empty string with 2 characters.').isString().isLength({ min: 2, max: 2 }),
    query('fileName', 'FileName must be a non-empty string.').isString(),
    query('fileType', 'FileType must be a valid MIME type.')
      .isString()
      .isIn(['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp',]),
    query('domain', 'Domain must be a number.').isNumeric().toInt(),
    query('fileSize', 'FileSize must be a number representing the file size in bytes.').isNumeric().toInt(),
  ],
  checkRequestValidity,
  async (req, res, next) => {
    const { fileType, fileSize, countryISOCode } = req.query;
    let maxSize = 0;
    let fileKind = "unknown file types";

    if (fileType.startsWith('image/')) {
      maxSize = 10 * 1024 * 1024; // 10 MB
      fileKind = "images";
    }

    if (maxSize === 0) {
      return res.status(400).json({ message: `We just accept images right now.` });
    } else if (fileSize > maxSize) {
      return res.status(400).json({ message: `File size exceeds the maximum limit. Maximum allowed size for ${fileKind} is ${maxSize} bytes (${maxSize / 1024 / 1024} MB).` });
    }

    req.storingFolder = `${fileKind}/${countryISOCode.toLowerCase()}`;

    next();
  },
  async (req, res, next) => {
    const customerId = req.query.domain;
    const isPrivateCustomer = await db.isPrivateCustomer(customerId);
    const domain = isPrivateCustomer ? String(customerId) : '0';
    req.bucketName = isPrivateCustomer ? 'mra-private-bucket' : 'mra-public-bucket';
    const middleware = authorizeUser({ dom: domain, obj: 's3_files', act: 'C', attrs: {} });
    middleware(req, res, next);
  },
  async (req, res) => {
    try {
      const { fileName, fileType, domain } = req.query;
      const { userId } = req.user;
      const bucketName = req.bucketName;
      const expiresIn = 900;

      const fileKey = `${req.storingFolder}/d${domain}/u${userId}/${generateUUIDWithUTCTimestamp()}-org${extractFileExtension(fileName)}`;

      const tags = `domain=${domain}&user-id=${userId}`;
      const metadata = {
        'original-name': fileName,
        'domain': String(domain),
        'user-id': String(userId),
        'status': 'processing',
      };

      const urlParams = {
        Bucket: bucketName,
        Key: fileKey,
        ContentType: fileType,
        Metadata: metadata,
        Tagging: tags,
      };

      const headers = {
        'content-type': fileType,
        'x-amz-tagging': tags,
        'x-amz-meta-original-name': metadata['original-name'],
        'x-amz-meta-domain': metadata['domain'],
        'x-amz-meta-user-id': metadata['user-id'],
        'x-amz-meta-status': metadata['status'],
      };

      // Generate the URL      
      const url = await getSignedUrl(s3Client, new PutObjectCommand(urlParams), {
        expiresIn,
        unhoistableHeaders: new Set(Object.keys(headers)),
      });
      const expires = Math.floor(Date.now() / 1000) + expiresIn;
      // Send the presigned URL and its expiration time
      res.json({ presignedUrl: url, exp: expires, headers });
    } catch (err) {
      updateEventLog(req, err);
      return res.status(500).json({ message: err.message });
    }
  }
);

/**
 * @swagger
 * /v1/generate-presigned-post-url:
 *   get:
 *     summary: Generate a presigned URL for S3 uploads
 *     description: Generates a presigned URL to allow clients to upload files directly to a specified S3 bucket under controlled permissions.
 *     tags: [1st]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: countryISOCode
 *         required: true
 *         type: string
 *         example: "ca"
 *         description: CountryISOCode must be a non-empty string with 2 characters.
 *       - in: query
 *         name: fileName
 *         required: true
 *         type: string
 *         example: "pic1.jpeg"
 *         description: The name of the file for which the presigned URL will be generated.
 *       - in: query
 *         name: fileType
 *         required: true
 *         type: string
 *         example: "image/jpeg"
 *         description: The MIME type of the file to be uploaded.
 *       - in: query
 *         name: domain
 *         required: true
 *         type: integer
 *         example: 0
 *         description: Domain identifier to check if the user has the required access rights.
 *       - in: query
 *         name: fileSize
 *         required: true
 *         type: integer
 *         example: 1024
 *         description: FileSize must be a number representing the file size in bytes.
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: Successfully generated presigned URL.
 *         schema:
 *           type: object
 *           properties:
 *             presignedUrl:
 *               type: string
 *               description: The presigned URL to upload the file.
 *             exp:
 *               type: integer
 *               example: 1702233326
 *               description: Expiration Time of the presigned url
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       429:
 *         $ref: '#/components/responses/ApiRateLimitExceeded'
 *       500:
 *         $ref: '#/components/responses/ServerInternalError'
 */
router.get('/generate-presigned-post-url',
  apiRequestLimiter,
  [
    query('countryISOCode', 'CountryISOCode must be a non-empty string with 2 characters.').isString().isLength({ min: 2, max: 2 }),
    query('fileName', 'FileName must be a non-empty string.').isString(),
    query('fileType', 'FileType must be a valid MIME type.')
      .isString()
      .isIn(['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp']),
    query('domain', 'Domain must be a number.').isNumeric().toInt(),
    query('fileSize', 'FileSize must be a number representing the file size in bytes.').isNumeric().toInt(),
  ],
  checkRequestValidity,
  async (req, res, next) => {
    const { fileType, fileSize, countryISOCode } = req.query;
    let maxSize = 0;
    let fileKind = "unknown file types";

    if (fileType.startsWith('image/')) {
      maxSize = 10 * 1024 * 1024; // 10 MB
      fileKind = "images";
    }

    if (maxSize === 0) {
      return res.status(400).json({ message: `We just accept images right now.` });
    } else if (fileSize > maxSize) {
      return res.status(400).json({ message: `File size exceeds the maximum limit. Maximum allowed size for ${fileKind} is ${maxSize} bytes (${maxSize / 1024 / 1024} MB).` });
    }

    req.storingFolder = `${fileKind}/${countryISOCode.toLowerCase()}`;

    next();
  },
  async (req, res, next) => {
    const customerId = req.query.domain;
    const isPrivateCustomer = await db.isPrivateCustomer(customerId);
    const domain = isPrivateCustomer ? String(customerId) : '0';
    req.bucketName = isPrivateCustomer ? 'mra-private-bucket' : 'mra-public-bucket';
    const middleware = authorizeUser({ dom: domain, obj: 's3_files', act: 'C', attrs: {} });
    middleware(req, res, next);
  },
  async (req, res) => {
    try {
      const { fileName, fileType, domain } = req.query;
      const { userId } = req.user;
      const bucketName = req.bucketName;
      const expiresIn = 900;

      const fileKey = `${req.storingFolder}/d${domain}/u${userId}/${generateUUIDWithUTCTimestamp()}-org${extractFileExtension(fileName)}`;

      const tags = `domain=${domain}&user-id=${userId}`;
      const metadata = {
        'original-name': fileName,
        'domain': String(domain),
        'user-id': String(userId),
        'status': 'processing',
      };

      const conditions = [
        ['starts-with', '$key', ''],
        { 'bucket': bucketName },
        { 'content-type': 'multipart/form-data; boundary=----' }, // keep this to trigger post event in S3
        ['eq', '$x-amz-tagging', tags],
        ['eq', '$x-amz-meta-original-name', metadata['original-name']],
        ['eq', '$x-amz-meta-domain', metadata['domain']],
        ['eq', '$x-amz-meta-user-id', metadata['user-id']],
        ['eq', '$x-amz-meta-status', metadata['status']],
      ];

      const fields = {
        'content-type': 'multipart/form-data; boundary=----', // keep this to trigger post event in S3
        'x-amz-tagging': tags,
        'x-amz-meta-original-name': metadata['original-name'],
        'x-amz-meta-domain': metadata['domain'],
        'x-amz-meta-user-id': metadata['user-id'],
        'x-amz-meta-status': metadata['status']
      };

      // Generate the URL      
      const presignedPostData = await createPresignedPost(s3Client, {
        Bucket: bucketName,
        Key: fileKey,
        Expires: expiresIn,
        Conditions: conditions,
        Fields: fields,
      });

      const expires = Math.floor(Date.now() / 1000) + expiresIn;
      // Send the presigned URL and its expiration time
      res.json({ presignedUrl: presignedPostData.url, exp: expires, fields: presignedPostData.fields });
    } catch (err) {
      updateEventLog(req, err);
      return res.status(500).json({ message: err.message });
    }
  }
);

/**
 * @swagger
 * /v1/generate-access-urls:
 *   post:
 *     summary: Generate access URLs for S3 objects
 *     description: Generates pre-signed URLs for accessing S3 objects. This endpoint validates that the input is an array of valid S3 URLs.
 *     tags: [1st]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               domain:
 *                 type: integer
 *                 example: 0
 *                 description: Domain identifier to check if the user has the required access rights.
 *               urls:
 *                 type: array
 *                 items:
 *                   type: string
 *                   example: "https://mra-private-bucket.s3.us-east-2.amazonaws.com/images/ca/d2/u46/240517162934277-9e68-6c16-a4e7-org.jpg"
 *                 description: An array of valid S3 URLs.
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: Successfully generated access URLs.
 *         schema:
 *           type: object
 *           properties:
 *             urls:
 *               type: object
 *               additionalProperties:
 *                 type: array
 *                 items:
 *                   type: string
 *                   description: A pre-signed URL or a public URL for the corresponding S3 object.
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       429:
 *         $ref: '#/components/responses/ApiRateLimitExceeded'
 *       500:
 *         $ref: '#/components/responses/ServerInternalError'
 */
router.post('/generate-access-urls',
  apiRequestLimiter,
  [
    body('domain', 'Domain must be a number.').isNumeric().toInt(),
    body('urls', 'Urls must be an array of valid S3 URLs.')
      .isArray()
      .custom((urls) => {
        const s3UrlPattern = /^https:\/\/([^.]+)\.s3\.([^.]+)\.amazonaws\.com\/(.+)$/;
        return urls.every(url => s3UrlPattern.test(url));
      })
  ],
  checkRequestValidity,
  async (req, res, next) => {
    const customerId = req.body.domain;
    const isPrivateCustomer = await db.isPrivateCustomer(customerId);
    const domain = isPrivateCustomer ? String(customerId) : '0';
    const middleware = authorizeUser({ dom: domain, obj: 's3_files', act: 'R', attrs: {} });
    middleware(req, res, next);
  },
  async (req, res) => {
    try {
      const { domain: customerId, urls } = req.body;
      const expiresIn = 3600;
      const results = {};

      for (const url of urls) {
        const { bucketName, region, key, domain } = parseS3Url(url);
        const isPrivateBucket = bucketName.includes('private');
        if (isPrivateBucket && domain !== customerId) {
          return res.status(403).json({ message: 'The requested file does not belong to the customer that you have been authorized for.' });
        }

        let status = await checkObjectStatus(bucketName, key);
        let waiting = 1000;
        while (status === 'processing') {
          await sleep(waiting);
          status = await checkObjectStatus(bucketName, key);
          waiting += 1000;
        }

        const prefix = getKeyPrefix(key);

        // List objects in the specified S3 bucket and folder
        const listObjectsParams = {
          Bucket: bucketName,
          Prefix: prefix,
        };

        const data = await s3Client.send(new ListObjectsV2Command(listObjectsParams));
        const objects = data.Contents || [];

        // Generate URLs for each object
        const objectUrls = await Promise.all(objects.map(async (obj) => {
          const urlParams = {
            Bucket: bucketName,
            Key: obj.Key,
          };

          if (isPrivateBucket) {
            // Generate pre-signed URL for private bucket
            return await getSignedUrl(s3Client, new GetObjectCommand(urlParams), { expiresIn });
          } else {
            // Return public URL for public bucket
            return `https://${bucketName}.s3.${region}.amazonaws.com/${obj.Key}`;
          }
        }));

        results[url] = objectUrls;
      }
      res.json({ urls: results });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: err.message });
    }
  }
);

module.exports = router;


