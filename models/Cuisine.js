import mongoose from 'mongoose'
import CategorySchemaNoIndex from './schemas/CategorySchemaNoIndex.js'

const Cuisine = mongoose.model('cuisine', CategorySchemaNoIndex)

Cuisine.createIndexes()

export default Cuisine
