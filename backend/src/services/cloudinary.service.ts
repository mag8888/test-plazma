import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

export class CloudinaryService {
    constructor() {
        if (!process.env.CLOUDINARY_CLOUD_NAME) {
            console.warn("⚠️ CLOUDINARY_CLOUD_NAME is missing. Uploads will fail.");
        }
    }

    /**
     * Uploads an image from a remote URL to Cloudinary
     * @param url Remote URL of the image
     * @returns Secure URL of the uploaded image
     */
    async uploadImage(url: string, folder: string = 'moneo_uploads'): Promise<string> {
        try {
            const result = await cloudinary.uploader.upload(url, {
                folder: folder,
                resource_type: 'image'
            });
            return result.secure_url;
        } catch (error: any) {
            console.error("Cloudinary Upload Error:", error);
            throw new Error(`Upload failed: ${error.message}`);
        }
    }
}
