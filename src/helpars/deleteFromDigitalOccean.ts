import {
  DeleteObjectCommand,
  S3Client,
  S3ClientConfig,
} from "@aws-sdk/client-s3";
import { MINIO_CONFIG } from "./uploadToDigitalOcean";
const DO_CONFIG = MINIO_CONFIG

const s3Config: S3ClientConfig = {
  endpoint: DO_CONFIG.endpoint,
  region: DO_CONFIG.region,
  credentials: DO_CONFIG.credentials,
  forcePathStyle: true,
};
const s3 = new S3Client(s3Config);
export const deleteFromDigitalOcean = async (
  fileUrl: string
): Promise<any> => {
  try {
    const url = new URL(fileUrl);

    const key = decodeURIComponent(
      url.pathname.replace(`/${DO_CONFIG.bucketName}/`, "")
    );

    console.log("Deleting key:", key);

    const command = new DeleteObjectCommand({
      Bucket: DO_CONFIG.bucketName,
      Key: key,
    });

    return await s3.send(command);
  } catch (error) {
    console.error("Failed to delete file:", error);
    throw error;
  }
};