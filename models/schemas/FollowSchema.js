import mongoose from 'mongoose'

export const FollowSchemaRestaurant = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
  },
  location_id: {
    type: mongoose.Schema.Types.ObjectId,
  },
})

export const FollowSchemaUser = new mongoose.Schema({
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'deal',
  },
  location_id: {
    type: mongoose.Schema.Types.ObjectId,
  },
})
