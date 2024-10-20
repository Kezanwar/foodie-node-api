import sharp from 'sharp'

import { mongo } from 'mongoose'
import { S3BaseUrl } from '#app/config/config.js'

export const RESTAURANT_IMAGES = {
  avatar: 'avatar',
  cover_photo: 'cover_photo',
  deal_cover_image: 'deal_cover_image',
}
class IMG {
  static #accepted_file_types = ['image/jpeg', 'image/png']

  static #resizeImg(buffer, { height, width }) {
    return sharp(buffer)
      .jpeg()
      .resize({ height: height, width: width, fit: 'contain', withoutEnlargement: false })
      .toBuffer()
  }

  static isAcceptedFileType(check) {
    return this.#accepted_file_types.some((type) => type === check)
  }

  static createImageName(uuid, imageType) {
    const type = 'jpeg'
    return `${uuid}-${imageType}.${type}`
  }

  static appendLastUpdated(imgName) {
    return `${imgName}?lu=${new Date().getTime()}`
  }

  static resizeCoverPhoto(buffer) {
    return this.#resizeImg(buffer, { width: 1000 })
  }

  static resizeAvatar(buffer) {
    return this.#resizeImg(buffer, { width: 500 })
  }

  static createImgUUID() {
    return new mongo.ObjectId().toHexString()
  }

  static prefixImageWithBaseUrlRest(imageName) {
    return `${S3BaseUrl}${imageName}`
  }
}

export default IMG
