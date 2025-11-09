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
  {
    timestamps: false,
  }
)

CategorySchemaNoIndex.methods.toClient = function () {
  let returnToClient = this.toJSON()
  delete returnToClient.__v
  return returnToClient
}

// Ensure virtual fields are serialised.
CategorySchemaNoIndex.set('toJSON', {
  virtuals: true,
})

export default CategorySchemaNoIndex
