import mongoose from 'mongoose'
import CategorySchemaNoIndex from './schemas/CategorySchemaNoIndex.js'

const DietaryRequirement = mongoose.model('dietary', CategorySchemaNoIndex)

export default DietaryRequirement
