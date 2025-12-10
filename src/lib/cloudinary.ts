import { v2 as cloudinary } from "cloudinary"

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export interface UploadResult {
  public_id: string
  secure_url: string
  format: string
  bytes: number
  original_filename: string
}

export async function uploadToCloudinary(
  file: Buffer,
  options: {
    folder?: string
    filename?: string
    resource_type?: "image" | "raw" | "auto"
  } = {}
): Promise<UploadResult> {
  const { folder = "pdis-tickets", filename, resource_type = "auto" } = options

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: filename,
        resource_type,
        allowed_formats: ["jpg", "jpeg", "png", "gif", "pdf", "doc", "docx", "txt", "zip"],
        max_bytes: 10 * 1024 * 1024, // 10MB
      },
      (error, result) => {
        if (error) {
          reject(error)
        } else if (result) {
          resolve({
            public_id: result.public_id,
            secure_url: result.secure_url,
            format: result.format,
            bytes: result.bytes,
            original_filename: result.original_filename,
          })
        } else {
          reject(new Error("Upload failed"))
        }
      }
    )

    uploadStream.end(file)
  })
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId)
}

export function getCloudinaryUrl(publicId: string, options: object = {}): string {
  return cloudinary.url(publicId, {
    secure: true,
    ...options,
  })
}

export { cloudinary }

