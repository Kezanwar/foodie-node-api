require('dotenv').config()
const mongoose = require('mongoose')
const MONGO_URI = process.env.MONGO_URI

const connectDB = async () => {
  try {
    mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
    })
    console.log('mongo-db connected')
  } catch (error) {
    console.error(error.message)
    // Exit proccess with failure
    process.exit(1)
  }
}

module.exports = connectDB
