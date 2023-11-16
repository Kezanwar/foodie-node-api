import mongoose from 'mongoose'

const GeoSchema = new mongoose.Schema({
  type: {
    default: 'Point',
    type: String,
    required: true,
  },
  coordinates: {
    type: [Number],
    required: true,
    index: '2dsphere',
  },
})

export default GeoSchema
