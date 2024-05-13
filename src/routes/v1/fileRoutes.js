const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const router = require('express').Router();
const { query } = require('express-validator');
const db = require('../../utils/database');
const { apiRequestLimiter } = require('../../utils/rateLimit');
const { updateEventLog } = require('../../utils/logger');
const { authorizeUser, checkRequestValidity } = require('../../utils/validations');

// Configure the AWS S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

/**
 * @swagger
 * /v1/generate-presigned-url:
 *   get:
 *     summary: Generate a presigned URL for S3 uploads
 *     description: Generates a presigned URL to allow clients to upload files directly to a specified S3 bucket under controlled permissions.
 *     tags: [1st]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *       429:
 *         $ref: '#/components/responses/ApiRateLimitExceeded'
 *       500:
 *         $ref: '#/components/responses/ServerInternalError'
 */
router.get('/generate-presigned-url',
  apiRequestLimiter,
  [
    query('fileName', 'FileName must be a non-empty string.').isString(),
    query('fileType', 'FileType must be a valid MIME type.')
      .isString()
      .isIn(['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/heic', 'image/heif', 'video/mp4', 'video/quicktime', 'video/x-msvideo', 'audio/mpeg', 'audio/wav', 'audio/ogg']), // Add other MIME types as needed
    query('domain', 'Domain must be a number.').isNumeric().toInt(),
    query('fileSize', 'FileSize must be a number representing the file size in bytes.').isNumeric().toInt(),
  ],
  checkRequestValidity,
  async (req, res, next) => {
    const { fileType, fileSize } = req.query;
    let maxSize = 0;

    switch(fileType) {
      case 'image/jpeg':
      case 'image/jpg':
      case 'image/png':
      case 'image/gif':
      case 'image/bmp':
      case 'image/heic':
      case 'image/heif':
        maxSize = 10 * 1024 * 1024; // 10 MB
        break;
      case 'audio/mpeg':
      case 'audio/wav':
      case 'audio/ogg':
        maxSize = 25 * 1024 * 1024; // 25 MB
        break;
      case 'video/mp4':
      case 'video/quicktime':
      case 'video/x-msvideo':
        maxSize = 100 * 1024 * 1024; // 100 MB
        break;
    }

    if (fileSize > maxSize) {
      return res.status(400).json({ message: `File size exceeds the maximum limit. Maximum allowed size for this file type is ${maxSize} bytes (${maxSize / 1024 / 1024} MB).` });
    }

    next();
  },
  async (req, res, next) => {
    const customerId = req.query.domain;
    const isPrivateCustomer = await db.isPrivateCustomer(customerId);
    const domain = isPrivateCustomer ? String(customerId) : '0';
    const middleware = authorizeUser({ dom: domain, obj: 's3_files', act: 'C', attrs: {} });
    middleware(req, res, next);
  },
  async (req, res) => {
    const { fileName, fileType } = req.query;
    const expiresIn = 3600;
    // Set parameters for the URL
    const urlParams = {
      Bucket: 'mra-public-bucket',
      Key: fileName,
      ContentType: fileType,
      ACL: 'public-read',
      Metadata: {
        originalName: fileName,
        domain:req.query.domain,
        userId:req.user?.userId
      },
      ContentDisposition: "inline",
      Tagging: `domain=${req.query.domain}&userId=${req.user?.userId}`,
    };
    try {
      // Generate the URL      
      const url = await getSignedUrl(s3Client, new PutObjectCommand(urlParams), {
        expiresIn
      });
      const expires = Math.floor(Date.now() / 1000) + expiresIn;
      // Send the presigned URL and its expiration time
      res.json({ presignedUrl: url, exp: expires });
    } catch (err) {
      updateEventLog(req, err);
      return res.status(500).json({ message: err.message });
    }
  }
);

module.exports = router;