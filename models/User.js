import { Schema, model } from 'mongoose'
import { isMainThread } from 'node:worker_threads'

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
    favourites: [
      {
        type: Schema.Types.ObjectId,
        ref: 'deal',
      },
    ],
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
const User = model('user', UserSchema)

if (isMainThread) {
  User.createIndexes()
}

export default User
