import dotenv from 'dotenv'
dotenv.config()
import { connect } from 'mongoose'
const MONGO_URI = process.env.MONGO_URI

class DBService {
  async connect() {
    try {
      await connect(MONGO_URI)
      console.log('mongo-db connected 🚀')
    } catch (error) {
      console.error(error)
      // Exit proccess with failure
      process.exit(1)
    }
  }
}

const DB = new DBService()

export default DB
