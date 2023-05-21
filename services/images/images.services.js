import { mongo } from 'mongoose'
import sharp from 'sharp'

export async function resizeImg(buffer, { height, width }) {
  try {
    const resizedBuffer = await sharp(buffer)
      .jpeg()
      .resize({ height: height, width: width, fit: 'contain', withoutEnlargement: true })
      .toBuffer()
    return resizedBuffer
  } catch (error) {
    console.error(error)
    throw new Error(error)
  }
}

export function createImageName(obj, item) {
  // const type = image.mimetype.split('/')[1]
  const type = 'image/jpeg'
  return `${obj.image_uuid}-${item}.${type}`
}

export const prefixImageWithBaseUrl = (imageName) => {
  const d = new Date()
  return `${process.env.S3_BUCKET_BASE_URL}${imageName}?${d.toTimeString().split(' ').join('').split('GMT')[0]}`
}

export const createImgUUID = () => {
  return new mongo.ObjectId().toHexString()
}
