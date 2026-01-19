import mongoose from 'mongoose'
import CategorySchemaNoIndex from './schemas/category-no-index.js'

const Cuisine = mongoose.model('cuisine', CategorySchemaNoIndex)

export default Cuisine
