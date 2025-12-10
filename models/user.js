import mongoose, { Schema, model } from 'mongoose'
import CategorySchemaWithIndex from './schemas/category-with-index.js'
import { FavouriteSchemaUser } from './schemas/favourite.js'
import GeoSchema from './schemas/geo.js'
import Permissions from '#app/services/permissions/index.js'

const SubscriptionSchema = new mongoose.Schema(
  {
    stripe_customer_id: {
      type: String,
    },
    stripe_subscription_id: {
      type: String,
    },
    stripe_price_id: {
      type: String,
    },
    subscription_tier: {
      type: Number,
      default: Permissions.NOT_SUBSCRIBED,
    },
    subscribed: {
      type: Boolean,
    },
    has_cancelled: {
      type: Boolean,
    },
    cancelled_period_end: {
      type: Date,
    },
    had_free_trial: {
      type: Boolean,
    },
  },
  { timestamps: true, _id: false }
)

const UserSchema = new Schema(
  {
    first_name: {
      type: String,
      default: '',
    },
    last_name: {
      type: String,
      default: '',
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    email_private: {
      type: Boolean,
    },
    email_confirmed: {
      type: Boolean,
      default: false,
      required: true,
    },
    password: {
      type: String,
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
        ref: 'location',
      },
    ],
    push_tokens: [
      {
        type: String,
      },
    ],
    geometry: GeoSchema,
    restaurant: {
      id: {
        type: Schema.Types.ObjectId,
        ref: 'restaurant',
      },
      role: {
        type: Number,
      },
    },
    subscription: SubscriptionSchema,
    past_subscriptions: [
      {
        type: String,
      },
    ],
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
  delete returnToClient.password
  return returnToClient
}
const User = model('user', UserSchema)

export default User
