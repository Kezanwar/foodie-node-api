import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import dotenv from 'dotenv'
dotenv.config()

export const bucketName = process.env.BUCKET_NAME
const bucketRegion = process.env.BUCKET_REGION
const S3AccessKey = process.env.S3_ACCESS_KEY
const S3SecretKey = process.env.S3_SECRET_KEY

export const mldS3Client = new S3Client({
  credentials: {
    accessKeyId: S3AccessKey,
    secretAccessKey: S3SecretKey,
  },
  region: bucketRegion,
})

export function s3PutCommand(params) {
  return new PutObjectCommand(params)
}
