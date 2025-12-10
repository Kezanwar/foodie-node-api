import dotenv from 'dotenv'
dotenv.config()
import { connect } from 'mongoose'
import { MONGO_URI } from '#app/config/config.js'

class DB {
  //admin

  static async getDBBackup() {}

  //connection
  static async connect() {
    try {
      await connect(MONGO_URI, { autoIndex: true })
      console.log('mongo-db connected 🚀')
    } catch (error) {
      console.error('mongo-db failed to connect... 😡')
      // Exit proccess with failure
      process.exit(1)
    }
  }
}

export default DB
