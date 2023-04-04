import mongoose from 'mongoose'

const CategorySchemaWithIndex = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    slug: {
      type: String,
      index: true,
    },
  },
  { timestamps: true }
)

CategorySchemaWithIndex.methods.toClient = function () {
  let returnToClient = this.toJSON()
  delete returnToClient._id
  delete returnToClient.__v
  delete returnToClient.createdAt
  delete returnToClient.updatedAt
  return returnToClient
}

// Ensure virtual fields are serialised.
CategorySchemaWithIndex.set('toJSON', {
  virtuals: true,
})

export default CategorySchemaWithIndex
