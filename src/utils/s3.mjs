import { S3Client } from '@aws-sdk/client-s3';
import { HeadObjectCommand } from "@aws-sdk/client-s3";

let s3ClientInstance = null;

const getS3Client = () => {
    if (!s3ClientInstance) {
        s3ClientInstance = new S3Client({
            region: process.env.AWS_REGION,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            }
        });
    }
    return s3ClientInstance;
}

export default getS3Client;

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
const parseS3Url = (url) => {
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
};

export { parseS3Url };

/**
 * Helper function to remove the "-org" suffix and file extension from an S3 object key.
 *
 * @param {string} key - The key of the S3 object.
 * @returns {string} The key with the "-org" suffix and file extension removed.
 */
const getKeyPrefix = (key) => {
    return key.replace(/-org\.[^.]+$/, '');
}

export { getKeyPrefix };

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
    const s3Client = getS3Client();
    const headData = await s3Client.send(new HeadObjectCommand(headParams));
    return headData.Metadata.status || 'completed'; // Default to 'completed' if no status found
};

export { checkObjectStatus };
