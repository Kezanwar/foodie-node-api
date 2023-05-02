import mongoose from 'mongoose'
import CategorySchemaWithIndex from './schemas/CategorySchemaWithIndex.js'
import GeoSchema from './schemas/GeoSchema.js'

const VoucherSchema = new mongoose.Schema(
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
    redeems: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
      },
    ],
    downloads: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
      },
    ],
    cuisines: [CategorySchemaWithIndex],
    dietary_requirements: [CategorySchemaWithIndex],
    locations: [
      {
        name: String,
        geometry: GeoSchema,
      },
    ],
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'restaurant',
    },
  },
  { timestamps: true }
)

VoucherSchema.methods.updateVoucher = async function (data) {
  if (!data) throw new Error('no data passed to setup method')
  const dataArr = Object.entries(data)
  dataArr.forEach(([key, value]) => {
    this[key] = value
  })
  await this.save()
}

VoucherSchema.methods.toClient = function () {
  let returnToClient = this.toJSON()
  delete returnToClient._id
  delete returnToClient.__v
  delete returnToClient.createdAt
  delete returnToClient.updatedAt
  return returnToClient
}

// Ensure virtual fields are serialised.
VoucherSchema.set('toJSON', {
  virtuals: true,
})

const Voucher = mongoose.model('voucher', VoucherSchema)

Voucher.createIndexes()

export default Voucher
