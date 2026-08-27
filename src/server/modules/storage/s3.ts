import { randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Optional, exactly like Paystack/Resend elsewhere in this app: without
 * these env vars, photo uploads are simply unavailable and posts/listings
 * work fine as text-only — never a hard requirement.
 */
export function isStorageConfigured(): boolean {
  return Boolean(process.env.S3_ENDPOINT && process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY);
}

function getClient(): S3Client {
  return new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || "auto",
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
  });
}

const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;

export interface PresignedUpload {
  uploadUrl: string;
  publicUrl: string;
}

/**
 * `keyPrefix` should already be tenant-scoped (see uploadActions.ts) —
 * this module has no notion of estates, it just signs a PUT for whatever
 * key it's given.
 */
export async function createPresignedUploadUrl(keyPrefix: string, filename: string, contentType: string): Promise<PresignedUpload> {
  if (!isStorageConfigured()) {
    throw new Error("Storage is not configured");
  }
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    throw new Error("Unsupported image type");
  }

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const key = `${keyPrefix}/${randomUUID()}-${safeName}`;
  const bucket = process.env.S3_BUCKET!;

  const client = getClient();
  const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });
  const publicUrl = `${process.env.S3_ENDPOINT}/${bucket}/${key}`;

  return { uploadUrl, publicUrl };
}

export const MAX_UPLOAD_SIZE_BYTES = MAX_FILE_SIZE_BYTES;
