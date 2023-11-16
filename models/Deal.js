import mongoose from 'mongoose'
import CategorySchemaWithIndex from './schemas/CategorySchemaWithIndex.js'
import GeoSchema from './schemas/GeoSchema.js'
import { isMainThread } from 'node:worker_threads'
import { FavouriteSchemaDeal } from './schemas/FavouriteSchema.js'

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
    views: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
      },
    ],
    favourites: [FavouriteSchemaDeal],
    cuisines: [CategorySchemaWithIndex],
    dietary_requirements: [CategorySchemaWithIndex],
    locations: [
      {
        location_id: {
          type: mongoose.Schema.Types.ObjectId,
        },
        nickname: String,
        geometry: GeoSchema,
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

if (isMainThread) {
  Deal.createIndexes()
}

export default Deal
