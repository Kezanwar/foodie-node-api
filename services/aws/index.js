import { bucketName, bucketRegion, S3AccessKey, S3SecretKey } from '#app/config/config.js'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

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
  static saveDBBackup() {}
}

export default AWS
