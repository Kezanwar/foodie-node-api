import { Redis } from '#app/server.js'

import Err from '#app/services/error/index.js'
import Auth from '#app/services/auth/index.js'
import User from '#app/models/User.js'

import { getUser } from '#app/utilities/user.js'
import { makeMongoIDs } from '#app/utilities/document.js'
import { S3BaseUrl } from '../services/aws/index.js'

export async function authWithCache(req, res, next) {
  // Get token from header
  const token = req.header('x-auth-token')
  // check if no token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' })
  }

  try {
    // verify token
    const decoded = Auth.jwtVerify(token)

    if (!decoded) Err.throw('token not valid')

    const userFromCache = await Redis.getUserByID(decoded.user.id)

    if (userFromCache) {
      req.user = userFromCache
    } else {
      //  attach dedcoded user in token to req.user in req object
      const userFromDB = await getUser(decoded.user.id)
      await Redis.setUserByID(userFromDB)
      req.user = userFromDB
    }

    //  call next to continue to the next middleware with the new validated user in req object
    next()
  } catch (err) {
    // if token is invalid or expired
    Err.send(res, err)
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
    const decoded = Auth.jwtVerify(token)

    if (!decoded) Err.throw('token not valid')

    //  attach dedcoded user in token to req.user in req object
    const userFromDB = await getUser(decoded.user.id)

    req.user = userFromDB

    //  call next to continue to the next middleware with the new validated user in req object
    next()
  } catch (err) {
    // if token is invalid or expired
    Err.send(res, err)
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
    const decoded = Auth.jwtVerify(token)

    if (!decoded) Err.throw('token not valid')
    //  attach dedcoded user in token to req.user in req object

    if (!decoded.user.id) Err.throw('no ID passed')
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

    const [user] = userReq

    if (!user) Err.throw('User doesnt exist', 401)

    req.results = user

    //  call next to continue to the next middleware with the new validated user in req object
    next()
  } catch (err) {
    // if token is invalid or expired
    Err.send(res, err)
  }
}
