import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function putPublicObject({
  bucket,
  key,
  contentType,
  body,
}: {
  bucket: string;
  key: string;
  contentType: string;
  body: Uint8Array | Blob | string;
}) {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body as any,
      ContentType: contentType,
    })
  );

  return `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${encodeURIComponent(
    key
  )}`;
}
