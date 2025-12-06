import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

// DigitalOcean Spaces configuration
const spacesEndpoint = process.env.SPACES_ENDPOINT || 'https://fra1.digitaloceanspaces.com';
const spacesRegion = process.env.SPACES_REGION || 'fra1';
const spacesBucket = process.env.SPACES_BUCKET_NAME;
const spacesAccessKeyId = process.env.SPACES_ACCESS_KEY_ID;
const spacesSecretAccessKey = process.env.SPACES_SECRET_ACCESS_KEY;
const spacesCdnUrl = process.env.SPACES_CDN_URL; // Your CDN URL (e.g., https://your-space.nyc3.cdn.digitaloceanspaces.com)

// Initialize S3 client (DigitalOcean Spaces is S3-compatible)
const s3Client = new S3Client({
  endpoint: spacesEndpoint,
  region: spacesRegion,
  credentials: {
    accessKeyId: spacesAccessKeyId || '',
    secretAccessKey: spacesSecretAccessKey || '',
  },
  forcePathStyle: false, // DigitalOcean Spaces uses virtual-hosted-style
});

/**
 * Upload a file to DigitalOcean Spaces
 * @param filePath Local file path to upload
 * @param spacesPath Path in Spaces (e.g., 'uploads/edited/video.mp4')
 * @param contentType MIME type of the file
 * @returns Public URL of the uploaded file
 */
export async function uploadToSpaces(
  filePath: string,
  spacesPath: string,
  contentType?: string
): Promise<string> {
  if (!spacesBucket || !spacesAccessKeyId || !spacesSecretAccessKey) {
    throw new Error('DigitalOcean Spaces configuration is missing. Check environment variables.');
  }

  // Read file from local filesystem
  const fileContent = fs.readFileSync(filePath);

  // Determine content type if not provided
  if (!contentType) {
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.mp4': 'video/mp4',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    contentType = contentTypes[ext] || 'application/octet-stream';
  }

  // Upload to Spaces
  const command = new PutObjectCommand({
    Bucket: spacesBucket,
    Key: spacesPath,
    Body: fileContent,
    ContentType: contentType,
    ACL: 'public-read', // Make file publicly accessible
  });

  await s3Client.send(command);

  // Return CDN URL or Spaces URL
  if (spacesCdnUrl) {
    // Remove trailing slash if present
    const baseUrl = spacesCdnUrl.endsWith('/') ? spacesCdnUrl.slice(0, -1) : spacesCdnUrl;
    return `${baseUrl}/${spacesPath}`;
  } else {
    // Fallback to Spaces endpoint URL
    const endpointBase = spacesEndpoint.replace('https://', '').replace('http://', '');
    return `https://${spacesBucket}.${endpointBase}/${spacesPath}`;
  }
}

/**
 * Delete a file from DigitalOcean Spaces
 * @param spacesPath Path in Spaces (e.g., 'uploads/edited/video.mp4')
 */
export async function deleteFromSpaces(spacesPath: string): Promise<void> {
  if (!spacesBucket || !spacesAccessKeyId || !spacesSecretAccessKey) {
    throw new Error('DigitalOcean Spaces configuration is missing. Check environment variables.');
  }

  const command = new DeleteObjectCommand({
    Bucket: spacesBucket,
    Key: spacesPath,
  });

  await s3Client.send(command);
}

/**
 * Check if Spaces is configured
 */
export function isSpacesConfigured(): boolean {
  return !!(
    spacesBucket &&
    spacesAccessKeyId &&
    spacesSecretAccessKey
  );
}

