import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { config } from 'dotenv';
import crypto from 'crypto';

config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a file to Cloudinary
 * @param buffer - File buffer or NodeJS.ReadableStream
 * @param options - Cloudinary upload options
 * @returns Cloudinary upload response
 */
export async function uploadToCloudinary(
  buffer: Buffer | NodeJS.ReadableStream,
  options: {
    folder: string;
    public_id: string;
    resource_type: string;
  }
): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      options as any,
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve(result);
        } else {
          reject(new Error('Upload failed: no result returned'));
        }
      }
    );

    if (Buffer.isBuffer(buffer)) {
      stream.end(buffer);
    } else {
      (buffer as NodeJS.ReadableStream).pipe(stream);
    }
  });
}

/**
 * Delete a file from Cloudinary
 * @param publicIdOrFilename - Cloudinary public ID or filename
 * @param resourceType - Resource type (image, video, raw, auto)
 */
export async function deleteFromCloudinary(
  publicIdOrFilename: string,
  resourceType: string = 'image'
): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicIdOrFilename, {
      resource_type: resourceType as any,
    });
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
}

/**
 * Extract public ID from Cloudinary URL
 * @param url - Cloudinary URL
 * @returns Public ID
 */
export function extractPublicId(url: string): string {
  // Example URL: https://res.cloudinary.com/ddi83fky2/image/upload/v1234567890/udesign/website/filename.png
  // Public ID: udesign/website/filename
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
  return match ? match[1] : '';
}

export default cloudinary;
