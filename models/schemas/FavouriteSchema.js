import mongoose from 'mongoose'

export const FavouriteSchemaDeal = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
    },
    location_id: {
      type: mongoose.Schema.Types.ObjectId,
    },
  },
  { _id: false }
)

export const FavouriteSchemaUser = new mongoose.Schema(
  {
    deal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'deal',
    },
    location_id: {
      type: mongoose.Schema.Types.ObjectId,
    },
  },
  { _id: false }
)
