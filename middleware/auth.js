import Redis from '#app/services/cache/redis.js'
import Err from '#app/services/error/index.js'
import Auth from '#app/services/auth/index.js'
import DB from '#app/services/db/index.js'

export async function authWithCache(req, res, next) {
  // Get token from header
  const token = req.header('x-auth-token')
  // check if no token

  try {
    if (!token) {
      Err.throw('No token, authorization denied', 401)
    }
    // verify token
    const decoded = Auth.jwtVerify(token)

    if (!decoded) {
      Err.throw('token not valid')
    }

    const userFromCache = await Redis.getUserByID(decoded.user.id)

    if (userFromCache) {
      req.user = userFromCache
    } else {
      //  attach dedcoded user in token to req.user in req object
      const userFromDB = await DB.getUserByID(decoded.user.id)
      await Redis.setUserByID(userFromDB)
      req.user = userFromDB
    }

    //  call next to continue to the next middleware with the new validated user in req object
    next()
  } catch (err) {
    // if token is invalid or expired
    Err.send(req, res, err)
  }
}
export async function authNoCache(req, res, next) {
  // Get token from header
  const token = req.header('x-auth-token')
  // check if no token

  try {
    if (!token) {
      Err.throw('No token, authorization denied', 401)
    }
    // verify token
    const decoded = Auth.jwtVerify(token)

    if (!decoded) {
      Err.throw('token not valid')
    }

    //  attach dedcoded user in token to req.user in req object
    const userFromDB = await DB.getUserByID(decoded.user.id)

    req.user = userFromDB

    //  call next to continue to the next middleware with the new validated user in req object
    next()
  } catch (err) {
    // if token is invalid or expired
    Err.send(req, res, err)
  }
}
