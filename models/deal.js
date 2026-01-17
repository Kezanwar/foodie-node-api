import mongoose from 'mongoose'
import CategorySchemaWithIndex from './schemas/category-with-index.js'
import GeoSchema from './schemas/geo.js'

const DealStatTrackSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
    },
    restaurant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'restaurant',
    },
    location_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'location',
    },
    deal_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'deal',
    },
    user_geo: [{ type: Number }], //! [long, lat]
    //? not using 2dSphere data type here as we will never query the DB using this geometry.
    //? will be used purely for restaurant stat insights.
  },
  { timestamps: true }
)

export const DealFavourites = mongoose.model('deal_favourites', DealStatTrackSchema)

export const DealViews = mongoose.model('deal_views', DealStatTrackSchema)

const DealSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    description: {
      type: String,
    },
    start_date: {
      type: Date,
    },
    end_date: {
      type: Date,
    },
    is_expired: {
      type: Boolean,
      index: true,
    },
    // views: [DealStatSchema],
    // favourites: [DealStatSchema],
    cuisines: [CategorySchemaWithIndex],
    dietary_requirements: [CategorySchemaWithIndex],
    locations: [
      {
        location_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'location',
        },
        nickname: String,
        geometry: GeoSchema,
        _id: false,
      },
    ],
    restaurant: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'restaurant',
        index: true,
      },
      name: {
        type: String,
      },
      avatar: {
        type: String,
      },
      cover_photo: {
        type: String,
      },
    },
    deleted: {
      default: false,
      type: Boolean,
      index: true,
    },
  },
  { timestamps: true }
)

DealSchema.methods.updateDeal = async function (data) {
  if (!data) throw new Error('no data passed to setup method')
  const dataArr = Object.entries(data)
  dataArr.forEach(([key, value]) => {
    this[key] = value
  })
  await this.save()
}

DealSchema.methods.toClient = function () {
  let returnToClient = this.toJSON()
  delete returnToClient._id
  delete returnToClient.__v
  delete returnToClient.createdAt
  delete returnToClient.updatedAt
  return returnToClient
}

// Ensure virtual fields are serialised.
DealSchema.set('toJSON', {
  virtuals: true,
})

const Deal = mongoose.model('deal', DealSchema)

export default Deal
