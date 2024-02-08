import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'

import { SendError, throwErr } from '#app/utilities/error.js'
import { getUser } from '#app/utilities/user.js'

dotenv.config()

const JWT_SECRET = process.env.JWT_SECRET

// Custom middleware for PRIVATE AND PROTECTED ROUTES, which will allow us to verify a json webtoken sent in the req headers and log the user in if so

async function auth(req, res, next) {
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
    const User = await getUser(decoded.user.id)

    req.user = User

    //  call next to continue to the next middleware with the new validated user in req object
    next()
  } catch (err) {
    // if token is invalid or expired
    SendError(res, err)
  }
}

export default auth
