import mongoose from 'mongoose'

const CategorySchemaNoIndex = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    slug: {
      type: String,
    },
  },
  { timestamps: true }
)

CategorySchemaNoIndex.methods.toClient = function () {
  let returnToClient = this.toJSON()
  delete returnToClient._id
  delete returnToClient.__v
  delete returnToClient.createdAt
  delete returnToClient.updatedAt
  return returnToClient
}

// Ensure virtual fields are serialised.
CategorySchemaNoIndex.set('toJSON', {
  virtuals: true,
})

export default CategorySchemaNoIndex
