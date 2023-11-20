import { Schema, model } from 'mongoose'
import { isMainThread } from 'node:worker_threads'
import CategorySchemaWithIndex from './schemas/CategorySchemaWithIndex.js'
import { FavouriteSchemaUser } from './schemas/FavouriteSchema.js'

const UserSchema = Schema(
  {
    first_name: {
      type: String,
      required: true,
    },
    last_name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    email_confirmed: {
      type: Boolean,
      default: false,
      required: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    auth_method: {
      type: String,
    },
    auth_otp: {
      type: String,
    },
    avatar: {
      type: String,
    },
    preferences: {
      cuisines: [CategorySchemaWithIndex],
      dietary_requirements: [CategorySchemaWithIndex],
    },
    favourites: [FavouriteSchemaUser],
    following: [
      {
        type: Schema.Types.ObjectId,
        ref: 'restaurant',
      },
    ],
    restaurant: {
      id: {
        type: Schema.Types.ObjectId,
        ref: 'restaurant',
      },
      role: {
        type: String,
      },
    },
  },
  { timestamps: true }
)

UserSchema.methods.toClient = function () {
  let returnToClient = this.toJSON()
  delete returnToClient._id
  delete returnToClient.__v
  delete returnToClient.createdAt
  delete returnToClient.updatedAt
  delete returnToClient.favourites
  delete returnToClient.following
  delete returnToClient.preferences
  delete returnToClient.auth_otp
  delete returnToClient.auth_method
  delete returnToClient.password
  return returnToClient
}
const User = model('user', UserSchema)

if (isMainThread) {
  User.createIndexes()
}

export default User
