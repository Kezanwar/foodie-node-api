import dotenv from 'dotenv'
dotenv.config()
import { connect, Types } from 'mongoose'

import User from '#app/models/User.js'
import { S3BaseUrl } from '#app/services/aws/index.js'

const MONGO_URI = process.env.MONGO_URI

class DBService {
  //connection
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

  //util
  makeMongoIDs(...args) {
    if (args.length === 1) return new Types.ObjectId(args[0])
    else return args.map((i) => new Types.ObjectId(i))
  }

  //user
  getUserByID(id) {
    return User.findById(id)
  }
  getUserByEmail(email) {
    return User.findOne({ email: email.toLowerCase() })
  }
  getUserByEmailWithPassword(email) {
    return User.findOne({ email: email.toLowerCase() }).select('+password')
  }
  getUserWithFavAndFollow(id) {
    return User.aggregate([
      {
        $match: {
          _id: this.makeMongoIDs(id),
        },
      },
      {
        $lookup: {
          from: 'deals', // Replace with the name of your linked collection
          localField: 'favourites.deal',
          foreignField: '_id',
          pipeline: [
            {
              $project: {
                name: 1,
                description: 1,
                start_date: 1,
                end_date: 1,
              },
            },
          ],
          as: 'favourited_deals',
        },
      },
      {
        $lookup: {
          from: 'locations', // Replace with the name of your linked collection
          localField: 'following.location_id',
          foreignField: '_id',
          pipeline: [
            {
              $project: {
                location: {
                  nickname: '$nickname',
                  _id: '$_id',
                },
                restaurant: {
                  id: '$restaurant.id',
                  name: '$restaurant.name',
                  avatar: { $concat: [S3BaseUrl, '$restaurant.avatar'] },
                  cover_photo: { $concat: [S3BaseUrl, '$restaurant.cover_photo'] },
                },
              },
            },
          ],
          as: 'following_locations',
        },
      },
      {
        $project: {
          user: '$$ROOT',
          favourites: '$favourited_deals',
          following: '$following_locations',
        },
      },
    ])
  }
}

const DB = new DBService()

export default DB
