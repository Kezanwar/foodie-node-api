import sharp from 'sharp'
import { S3BaseUrl } from '../aws/index.js'
import { mongo } from 'mongoose'

export const RESTAURANT_IMAGES = {
  avatar: 'avatar',
  cover_photo: 'cover_photo',
  deal_cover_image: 'deal_cover_image',
}
class ImageService {
  #accepted_file_types = ['image/jpeg', 'image/png']

  #resizeImg(buffer, { height, width }) {
    return sharp(buffer)
      .jpeg()
      .resize({ height: height, width: width, fit: 'contain', withoutEnlargement: false })
      .toBuffer()
  }

  isAcceptedFileType(check) {
    return this.#accepted_file_types.some((type) => type === check)
  }

  createImageName(uuid, imageType) {
    const type = 'image/jpeg'
    return `${uuid}-${imageType}.${type}`
  }

  resizeCoverPhoto(buffer) {
    return this.#resizeImg(buffer, { width: 1000 })
  }

  resizeAvatar(buffer) {
    return this.#resizeImg(buffer, { width: 500 })
  }

  createImgUUID() {
    return new mongo.ObjectId().toHexString()
  }

  prefixImageWithBaseUrlRest(imageName) {
    const d = new Date()
    return `${S3BaseUrl}${imageName}?${d.toTimeString().split(' ').join('').split('GMT')[0]}`
  }
}

const IMG = new ImageService()

export default IMG
