import mongoose from 'mongoose'

const RestaurantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    profile_image: {
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
    long_lat: {
      longitude: {
        type: Number,
      },
      latitude: {
        type: Number,
      },
    },
    address: {
      type: String,
      required: true,
      unique: true,
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
    restaurant_address_use_company: {
      type: Boolean,
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
  },
  { timestamps: true }
)

const Restaurant = mongoose.model('restaurant', RestaurantSchema)

export default Restaurant
