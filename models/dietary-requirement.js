import mongoose from 'mongoose'
import CategorySchemaNoIndex from './schemas/category-no-index.js'

const DietaryRequirement = mongoose.model('dietary', CategorySchemaNoIndex)

export default DietaryRequirement
