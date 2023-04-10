import mongoose from 'mongoose'
import { prefixImageWithBaseUrl } from '../routes/utilities/utilities.js'
import CategorySchemaWithIndex from './schemas/CategorySchemaWithIndex.js'
import User from './User.js'

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
    locations: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'location',
      },
    ],
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
    is_subscribed: {
      type: Boolean,
    },
    registration_step: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
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

RestaurantSchema.methods.updateRegStep = async function (step) {
  if (!step) throw new Error('no step passed to update step method')
  this.registration_step = step
  const sAdmin = await User.findById(this.super_admin)
  sAdmin.restaurant
  await this.save()
}

RestaurantSchema.methods.getLocations = async function () {
  if (!this.locations?.length) return []
  const p = await this.populate('locations')
  return p.locations
}

RestaurantSchema.methods.toClient = function () {
  let returnToClient = this.toJSON()
  delete returnToClient._id
  delete returnToClient.__v
  delete returnToClient.super_admin
  delete returnToClient.createdAt
  delete returnToClient.updatedAt
  delete returnToClient.locations
  if (returnToClient.avatar) returnToClient.avatar = prefixImageWithBaseUrl(returnToClient.avatar)
  if (returnToClient.cover_photo) returnToClient.cover_photo = prefixImageWithBaseUrl(returnToClient.cover_photo)
  return returnToClient
}

// Ensure virtual fields are serialised.
RestaurantSchema.set('toJSON', {
  virtuals: true,
})

const Restaurant = mongoose.model('restaurant', RestaurantSchema)

Restaurant.createIndexes()

export default Restaurant
