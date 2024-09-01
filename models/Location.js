import mongoose from 'mongoose'

import { isMainThread } from 'node:worker_threads'

import CategorySchemaWithIndex from './schemas/CategorySchemaWithIndex.js'
import GeoSchema from './schemas/GeoSchema.js'

const LocationStatSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
    },
    user_geo: [{ type: Number }], //! [long, lat]
    //? not using 2dSphere data type here as we will never query the DB using this geometry.
    //? will be used purely for restaurant stat insights.
  },
  { timestamps: true }
)

const LocationSchema = new mongoose.Schema(
  {
    nickname: {
      type: String,
    },
    address: {
      type: Object,
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
    timezone: {
      type: String,
    },
    phone_number: {
      type: String,
    },
    email: {
      type: String,
    },
    opening_times: {
      type: Object,
      mon: {
        type: Object,
        is_open: { type: Boolean },
        open: { type: String },
        close: { type: String },
      },
      tue: {
        type: Object,
        is_open: { type: Boolean },
        open: { type: String },
        close: { type: String },
      },
      wed: {
        type: Object,
        is_open: { type: Boolean },
        open: { type: String },
        close: { type: String },
      },
      thu: {
        type: Object,
        is_open: { type: Boolean },
        open: { type: String },
        close: { type: String },
      },
      fri: {
        type: Object,
        is_open: { type: Boolean },
        open: { type: String },
        close: { type: String },
      },
      sat: {
        type: Object,
        is_open: { type: Boolean },
        open: { type: String },
        close: { type: String },
      },
      sun: {
        type: Object,
        is_open: { type: Boolean },
        open: { type: String },
        close: { type: String },
      },
    },
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
      },
    ],
    booking_clicks: [LocationStatSchema],
    views: [LocationStatSchema],
    geometry: GeoSchema,
    restaurant: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'restaurant',
        index: true,
      },
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
      is_subscribed: {
        type: Number,
      },
    },
    cuisines: [CategorySchemaWithIndex],
    dietary_requirements: [CategorySchemaWithIndex],
    active_deals: [
      {
        deal_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'deal',
        },
        name: {
          type: String,
        },
        description: {
          type: String,
        },
      },
    ],
  },
  { timestamps: true }
)

// Ensure virtual fields are serialised.
LocationSchema.set('toJSON', {
  virtuals: true,
})

const Location = mongoose.model('location', LocationSchema)

if (isMainThread) {
  Location.createIndexes()
}

export default Location
