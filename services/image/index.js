import { S3BaseUrl } from '../aws/index.js'
import WorkerService from '../worker/index.js'
import { mongo } from 'mongoose'

class ImageService {
  #accepted_file_types = ['image/jpeg', 'image/png']

  isAcceptedFileType(check) {
    return this.#accepted_file_types.some((type) => type === check)
  }

  createImageName(uuid, imageType) {
    const type = 'image/jpeg'
    return `${uuid}-${imageType}.${type}`
  }

  createImgUUID() {
    return new mongo.ObjectId().toHexString()
  }

  resizeCoverPhoto(buffer) {
    return WorkerService.call({
      name: 'resizeImg',
      params: [buffer, { width: 1000 }],
    })
  }

  resizeAvatar(buffer) {
    return WorkerService.call({
      name: 'resizeImg',
      params: [buffer, { width: 500 }],
    })
  }

  prefixImageWithBaseUrlRest(imageName) {
    const d = new Date()
    return `${S3BaseUrl}${imageName}?${d.toTimeString().split(' ').join('').split('GMT')[0]}`
  }
}

const IMG = new ImageService()

export default IMG
