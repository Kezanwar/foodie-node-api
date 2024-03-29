import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'

import { SendError, throwErr } from '#app/utilities/error.js'
import { getUser } from '#app/utilities/user.js'
import User from '#app/models/User.js'
import { makeMongoIDs } from '#app/utilities/document.js'
import { redis } from '#app/server.js'

dotenv.config()

const JWT_SECRET = process.env.JWT_SECRET

export async function authWithCache(req, res, next) {
  // Get token from header
  const token = req.header('x-auth-token')
  // check if no token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' })
  }

  console.count()
  console.log('-------')
  console.log('auth with cache....')

  try {
    // verify token
    const decoded = jwt.verify(token, JWT_SECRET)

    if (!decoded) throwErr('token not valid')

    const userFromCache = await redis.getUserByID(decoded.user.id)

    if (userFromCache) {
      console.log('is user from redis')
      console.log('-------')
      req.user = userFromCache
    } else {
      console.log('is user from mongoDB')
      console.log('-------')
      //  attach dedcoded user in token to req.user in req object
      const userFromDB = await getUser(decoded.user.id)
      await redis.setUserByID(userFromDB)
      req.user = userFromDB
    }

    //  call next to continue to the next middleware with the new validated user in req object
    next()
  } catch (err) {
    // if token is invalid or expired
    SendError(res, err)
  }
}
export async function authNoCache(req, res, next) {
  // Get token from header
  const token = req.header('x-auth-token')
  // check if no token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' })
  }

  try {
    // verify token
    const decoded = jwt.verify(token, JWT_SECRET)

    if (!decoded) throwErr('token not valid')

    //  attach dedcoded user in token to req.user in req object
    const userFromDB = await getUser(decoded.user.id)

    req.user = userFromDB

    //  call next to continue to the next middleware with the new validated user in req object
    next()
  } catch (err) {
    // if token is invalid or expired
    SendError(res, err)
  }
}

export async function authWithFavFollow(req, res, next) {
  // Get token from header
  const token = req.header('x-auth-token')
  // check if no token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' })
  }

  try {
    // verify token
    const decoded = jwt.verify(token, JWT_SECRET)

    if (!decoded) throwErr('token not valid')
    //  attach dedcoded user in token to req.user in req object

    if (!decoded.user.id) throwErr('no ID passed')
    const userReq = await User.aggregate([
      {
        $match: {
          _id: makeMongoIDs(decoded.user.id),
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
                  avatar: { $concat: [process.env.S3_BUCKET_BASE_URL, '$restaurant.avatar'] },
                  cover_photo: { $concat: [process.env.S3_BUCKET_BASE_URL, '$restaurant.cover_photo'] },
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

    const [user] = userReq

    if (!user) throwErr('User doesnt exist', 401)

    req.results = user

    //  call next to continue to the next middleware with the new validated user in req object
    next()
  } catch (err) {
    // if token is invalid or expired
    SendError(res, err)
  }
}
