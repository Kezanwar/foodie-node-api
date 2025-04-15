import { APP_ENV, bucketName, bucketRegion, S3AccessKey, S3BaseUrl, S3SecretKey } from '#app/config/config.js'
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
      Key: `${APP_ENV}/${name}`,
      Body: buffer,
      ContentType: 'image/jpeg',
    })
    return S3.send(pc)
  }

  static USER_IMAGE_PREFIX = `${S3BaseUrl}/${APP_ENV}/`

  static ASSET_IMAGE_PREFIX = `${S3BaseUrl}/assets`

  static saveDBBackup() {}

  // static async moveFileToDev(fileName) {
  //   try {
  //     const file_name = fileName.split('?')[0]

  //     const destinationKey = `development/${file_name}`
  //     await S3.send(
  //       new CopyObjectCommand({
  //         Bucket: bucketName,
  //         CopySource: `${bucketName}/${file_name}`, // must be URI-encoded if it contains special characters
  //         Key: destinationKey,
  //       })
  //     )

  //     // 2. Delete the original object
  //     await S3.send(
  //       new DeleteObjectCommand({
  //         Bucket: bucketName,
  //         Key: file_name,
  //       })
  //     )

  //     console.log(`Moved ${file_name} to ${destinationKey}`)
  //   } catch (error) {
  //     console.error('Error moving file:', error)
  //   }
  // }
}

export default AWS
