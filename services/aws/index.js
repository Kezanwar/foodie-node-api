import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import dotenv from 'dotenv'
dotenv.config()

const bucketName = process.env.BUCKET_NAME
const bucketRegion = process.env.BUCKET_REGION
const S3AccessKey = process.env.S3_ACCESS_KEY
const S3SecretKey = process.env.S3_SECRET_KEY

export const S3BaseUrl = process.env.S3_BUCKET_BASE_URL

const S3 = new S3Client({
  credentials: {
    accessKeyId: S3AccessKey,
    secretAccessKey: S3SecretKey,
  },
  region: bucketRegion,
})

class AWS {
  static saveImage(name, buffer) {
    const pc = new PutObjectCommand({
      Bucket: bucketName,
      Key: name,
      Body: buffer,
      ContentType: 'image/jpeg',
    })
    return S3.send(pc)
  }
}

export default AWS
