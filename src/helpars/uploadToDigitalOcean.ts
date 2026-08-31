import { S3Client, S3ClientConfig, ObjectCannedACL } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import path from "path";
import fs from "fs";
import ApiError from "../errors/ApiErrors";
 
// MinIO config
export const MINIO_CONFIG = {
  endpoint: "https://s3.zenex.cloud", // add the correct API port
  region: "s3v4",
  credentials: {
    accessKeyId: "6Q2Clv1Pih3UMBMIF1Ot",
    secretAccessKey: "nYF3ScyoiVnXzzfgK66m0SpUqwCdUIl1N6zhj71j",
  },
  bucketName: "emdadullah",
  apiVersion: "s3v4",
};
 
 
const s3Config: S3ClientConfig = {
  endpoint: MINIO_CONFIG.endpoint || "https://s3.zenex.cloud",
  region: MINIO_CONFIG.region || "s3v4",
  credentials: MINIO_CONFIG.credentials || {
    accessKeyId: "6Q2Clv1Pih3UMBMIF1Ot",
    secretAccessKey: "nYF3ScyoiVnXzzfgK66m0SpUqwCdUIl1N6zhj71j",
  },
  forcePathStyle: true, // must be true for MinIO
};
 
const s3 = new S3Client(s3Config);
const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB
 
const uploadToDigitalOcean = async (file: Express.Multer.File): Promise<string> => {
  try {
    if (!file) throw new ApiError(400, "No file provided");
 
    if (file.size > MAX_FILE_SIZE) {
      throw new ApiError(
        400,
        `File size exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`
      );
    }
 
    const mimeType = file.mimetype || "application/octet-stream";
    const fileExtension = path.extname(file.originalname) || "";
    const fileName = `uploads/${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 15)}${fileExtension}`;
 
    const uploadParams = {
      Bucket: MINIO_CONFIG.bucketName,
      Key: fileName,
      Body: fs.createReadStream(file.path),
      ACL: "public-read" as ObjectCannedACL, // optional
      ContentType: mimeType,
    };
 
    const upload = new Upload({ client: s3, params: uploadParams });
    const data = await upload.done();
 
    // Delete temp file after upload
    fs.unlink(file.path, (err) => {
      if (err) console.error("Failed to delete temp file:", err);
    });
 
    const fileUrlRaw =
      data.Location || `${MINIO_CONFIG.endpoint}/${MINIO_CONFIG.bucketName}/${fileName}`;
    return fileUrlRaw.startsWith("http") ? fileUrlRaw : `https://${fileUrlRaw}`;
  } catch (error) {
    console.log(error, "check error");
    throw new ApiError(
      500,
      error instanceof Error
        ? `Failed to upload file: ${error.message}`
        : "Failed to upload file to MinIO"
    );
  }
};
 
export default uploadToDigitalOcean;
 
 