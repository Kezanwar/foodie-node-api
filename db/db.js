import dotenv from 'dotenv'
dotenv.config()
import { connect } from 'mongoose'
const MONGO_URI = process.env.MONGO_URI

const connectDB = async () => {
  try {
    connect(MONGO_URI, {
      useNewUrlParser: true,
    })
    console.log('mongo-db connected 🚀😎')
  } catch (error) {
    console.error(error.message)
    // Exit proccess with failure
    process.exit(1)
  }
}

export default connectDB
