import crypto from "crypto";
import config from "../config";

const CLOUDINARY_CONFIG = {
  cloudName: config.CLOUDINARY.cloudName,
  apiKey: config.CLOUDINARY.apiKey,
  apiSecret: config.CLOUDINARY.apiSecret,
};

const MAX_FILE_SIZE = 3000 * 1024 * 1024;

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/gif",
  "image/webp",
  "image/avif",
  "video/mpeg",
  "video/mp4",
  "video/x-matroska",
  "audio/mpeg",
  "application/zip",
  "application/pdf",
  "application/msword",
  "application/octet-stream",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

function validateFile(file: Express.Multer.File) {
  if (!file) {
    throw new Error("No file provided");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File size exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    );
  }

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new Error(`File type not allowed: ${file.mimetype}`);
  }
}

function createCloudinarySignature(params: Record<string, string>) {
  const serializedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return crypto
    .createHash("sha1")
    .update(`${serializedParams}${CLOUDINARY_CONFIG.apiSecret}`)
    .digest("hex");
}

function getResourceType(file: Express.Multer.File) {
  if (file.mimetype.startsWith("image/")) return "image";
  if (file.mimetype.startsWith("video/")) return "video";
  return "auto";
}

/**
 * Uploads a file buffer to Cloudinary and returns the secure file URL.
 * Keeps the same interface used by the existing service/admin upload flows.
 */
export const uploadInSpace = async (
  file: Express.Multer.File,
  folder: string,
): Promise<string> => {
  try {
    validateFile(file);

    if (
      !CLOUDINARY_CONFIG.cloudName ||
      !CLOUDINARY_CONFIG.apiKey ||
      !CLOUDINARY_CONFIG.apiSecret
    ) {
      throw new Error("Cloudinary credentials are not configured");
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const cloudinaryFolder = `uploads/${folder}`;
    const resourceType = getResourceType(file);

    const signature = createCloudinarySignature({
      folder: cloudinaryFolder,
      timestamp,
    });

    const formData = new FormData();
    formData.append(
      "file",
      new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }),
      file.originalname,
    );
    formData.append("api_key", CLOUDINARY_CONFIG.apiKey);
    formData.append("timestamp", timestamp);
    formData.append("signature", signature);
    formData.append("folder", cloudinaryFolder);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/${resourceType}/upload`;

    const response = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Cloudinary upload failed (${response.status}): ${errorBody}`,
      );
    }

    const result = (await response.json()) as { secure_url?: string };

    if (!result.secure_url) {
      throw new Error("Cloudinary did not return a secure URL");
    }

    return result.secure_url;
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Failed to upload file: ${error.message}`
        : "Failed to upload file to Cloudinary",
    );
  }
};

export const uploadMultipleToCloudinary = async (
  files: Express.Multer.File[],
  folder: string,
) => {
  return Promise.all(files.map((file) => uploadInSpace(file, folder)));
};

export const getCloudinaryPublicIdFromUrl = (url: string) => {
  try {
    const pathname = new URL(url).pathname;

    const match = pathname.match(/\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/);

    return match ? match[1] : null;
  } catch {
    return null;
  }
};

export const deleteFromCloudinary = async (fileUrl: string) => {
  const publicId = getCloudinaryPublicIdFromUrl(fileUrl);

  if (!publicId) {
    throw new Error("Could not determine Cloudinary public_id");
  }

  console.log("Deleting publicId:", publicId);

  const timestamp = Math.floor(Date.now() / 1000).toString();

  const signature = crypto
    .createHash("sha1")
    .update(
      `public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_CONFIG.apiSecret}`,
    )
    .digest("hex");

  const formData = new FormData();

  formData.append("public_id", publicId);
  formData.append("api_key", config.CLOUDINARY.apiKey as string);
  formData.append("timestamp", timestamp);
  formData.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/destroy`,
    {
      method: "POST",
      body: formData,
    },
  );

  // console.log("Cloudinary delete response status:", response);

  const result = await response.json();

  console.log("Cloudinary delete response body:", result);

  if (result.result !== "ok") {
    throw new Error("Failed to delete image from Cloudinary");
  }

  return result;
};