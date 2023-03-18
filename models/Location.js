import mongoose from 'mongoose'

const LocationSchema = new mongoose.Schema(
  {
    nickname: {
      type: String,
    },
    cover_photo: {
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
    long_lat: {
      type: Object,
      longitude: {
        type: Number,
      },
      latitude: {
        type: Number,
      },
    },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'restaurant',
    },
  },
  { timestamps: true }
)

LocationSchema.methods.updateRest = async function (data) {
  if (!data) throw new Error('no data passed to setup method')
  const dataArr = Object.entries(data)
  dataArr.forEach(([key, value]) => {
    this[key] = value
  })
  await this.save()
}

LocationSchema.methods.toClient = function () {
  let returnToClient = this.toJSON()
  delete returnToClient._id
  delete returnToClient.__v
  delete returnToClient.createdAt
  delete returnToClient.updatedAt
  return returnToClient
}

// Ensure virtual fields are serialised.
LocationSchema.set('toJSON', {
  virtuals: true,
})

const Location = mongoose.model('location', LocationSchema)

export default Location
