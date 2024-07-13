import mongoose from 'mongoose'
import { isMainThread } from 'node:worker_threads'

import CategorySchemaWithIndex from './schemas/CategorySchemaWithIndex.js'

import IMG from '#app/services/image/index.js'
import Permissions from '#app/services/permissions/index.js'

const RestaurantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    bio: {
      type: String,
    },
    avatar: {
      type: String,
    },
    image_uuid: {
      type: String,
    },
    cover_photo: {
      type: String,
    },
    company_info: {
      type: Object,
      // select: false,
      company_name: {
        type: String,
      },
      company_number: {
        type: String,
        unique: true,
      },
      company_address: {
        type: Object,
        // select: false,
        address_line_1: {
          type: String,
        },
        address_line_2: {
          type: String,
        },
        postcode: {
          type: String,
        },
        city: {
          type: String,
        },
        country: {
          type: String,
        },
      },
    },
    contact_details: {
      // select: false,
      email: {
        type: String,
      },
      contact_number: {
        type: String,
      },
    },
    super_admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      required: true,
      select: false,
    },
    social_media: {
      facebook: {
        type: String,
      },
      instagram: {
        type: String,
      },
      tiktok: {
        type: String,
      },
      linkedin: {
        type: String,
      },
    },
    cuisines: [CategorySchemaWithIndex],
    dietary_requirements: [CategorySchemaWithIndex],
    reviews: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'review',
      },
    ],
    payment_details: {
      type: Object,
      // need to add to this
      select: false,
    },
    booking_link: {
      type: String,
    },
    is_subscribed: {
      type: Number,
      default: Permissions.NOT_SUBSCRIBED,
    },
    plan: {
      type: Number,
      default: 0,
    },
    subscription: {
      session_id: {
        type: String,
      },
    },
    registration_step: {
      type: Number,
      default: Permissions.REG_STEP_1_COMPLETE,
    },
    status: {
      type: Number,
      default: Permissions.STATUS_APPLICATION_PENDING,
    },

    terms_and_conditions: {
      type: Boolean,
    },
    privacy_policy: {
      type: Boolean,
    },
  },

  { timestamps: true }
)

RestaurantSchema.methods.updateRest = async function (data) {
  if (!data) throw new Error('no data passed to setup method')
  const dataArr = Object.entries(data)
  dataArr.forEach(([key, value]) => {
    this[key] = value
  })
  await this.save()
}

RestaurantSchema.methods.toClient = function () {
  let returnToClient = this.toJSON()
  delete returnToClient._id
  delete returnToClient.__v
  delete returnToClient.reviews
  delete returnToClient.super_admin
  delete returnToClient.createdAt
  delete returnToClient.updatedAt
  delete returnToClient.image_uuid
  delete returnToClient.booking_clicks
  delete returnToClient.followers
  delete returnToClient.payment_details
  if (returnToClient.avatar) returnToClient.avatar = IMG.prefixImageWithBaseUrlRest(returnToClient.avatar)
  if (returnToClient.cover_photo)
    returnToClient.cover_photo = IMG.prefixImageWithBaseUrlRest(returnToClient.cover_photo)
  return returnToClient
}

// Ensure virtual fields are serialised.
RestaurantSchema.set('toJSON', {
  virtuals: true,
})

const Restaurant = mongoose.model('restaurant', RestaurantSchema)

if (isMainThread) {
  Restaurant.createIndexes()
}

export default Restaurant
