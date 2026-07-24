import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getS3Client(): S3Client | null {
  const region = process.env.AWS_REGION || "us-east-1";
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    return null;
  }

  return new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export async function uploadToS3(input: {
  fileName: string;
  fileData: string;
  contentType?: string;
}): Promise<string> {
  const s3 = getS3Client();
  const bucketName = process.env.AWS_S3_BUCKET_NAME || "madbillio-uploads";

  if (!s3) {
    return input.fileData;
  }

  try {
    const key = `uploads/${Date.now()}-${input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const base64Data = input.fileData.replace(/^data:.+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: input.contentType || "application/octet-stream",
    });

    await s3.send(command);

    return `https://${bucketName}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${key}`;
  } catch (err) {
    console.warn("AWS S3 Upload error, returning original file data:", err);
    return input.fileData;
  }
}

/**
 * Generates an AWS S3 Presigned URL for private S3 objects (valid for 1 hour)
 */
export async function getPresignedS3Url(
  fileUrlOrKey: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  const s3 = getS3Client();
  const bucketName = process.env.AWS_S3_BUCKET_NAME || "madbillio-uploads";

  if (!s3 || !fileUrlOrKey || fileUrlOrKey.startsWith("data:")) {
    return fileUrlOrKey;
  }

  try {
    let key = fileUrlOrKey;
    if (fileUrlOrKey.startsWith("http://") || fileUrlOrKey.startsWith("https://")) {
      const urlObj = new URL(fileUrlOrKey);
      key = urlObj.pathname.replace(/^\//, "");
    }

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
    return presignedUrl;
  } catch (err) {
    console.warn("Error generating S3 presigned URL:", err);
    return fileUrlOrKey;
  }
}
