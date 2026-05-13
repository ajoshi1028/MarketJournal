import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const globalForS3 = globalThis as unknown as { s3?: S3Client };

function getS3Client(): S3Client {
  if (!globalForS3.s3) {
    globalForS3.s3 = new S3Client({
      region: process.env.AWS_REGION || process.env.S3_REGION || "us-east-1",
    });
  }
  return globalForS3.s3;
}

export async function putPublicObject({
  bucket,
  key,
  contentType,
  body,
}: {
  bucket: string;
  key: string;
  contentType: string;
  body: Buffer | Uint8Array;
}): Promise<string> {
  const region = process.env.AWS_REGION || process.env.S3_REGION || "us-east-1";
  const client = getS3Client();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );

  return `https://${bucket}.s3.${region}.amazonaws.com/${encodeURIComponent(key)}`;
}
