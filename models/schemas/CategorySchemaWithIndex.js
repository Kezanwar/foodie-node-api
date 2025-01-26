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
  {
    _id: false,
  }
)

export default CategorySchemaWithIndex
