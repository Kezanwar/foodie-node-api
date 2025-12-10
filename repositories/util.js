import { isValidObjectId, Types } from 'mongoose'

class RepoUtil {
  static makeMongoIDs(...args) {
    if (args.length === 1) return new Types.ObjectId(args[0])
    else return args.map((i) => new Types.ObjectId(i))
  }
  static getID(doc) {
    if (doc._id) return doc._id.toHexString()
    if (doc.id) return doc?.id?.toHexString ? doc?.id?.toHexString() : doc.id
  }
  static isValidID(str) {
    return isValidObjectId(str)
  }
}

export default RepoUtil
