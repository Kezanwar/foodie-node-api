import mongoose from 'mongoose'

const CategorySchemaWithIndex = new mongoose.Schema({
  name: {
    type: String,
  },
  slug: {
    type: String,
    index: true,
  },
})

export default CategorySchemaWithIndex
