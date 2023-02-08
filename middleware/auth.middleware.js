const jwt = require('jsonwebtoken')
require('dotenv').config()

const JWT_SECRET = process.env.JWT_SECRET

// Custom middleware for PRIVATE AND PROTECTED ROUTES, which will allow us to verify a json webtoken sent in the req headers and log the user in if so

module.exports = function (req, res, next) {
  // Get token from header
  const token = req.header('x-auth-token')
  // console.log(token)
  // check if no token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' })
  }

  try {
    // verify token
    const decoded = jwt.verify(token, JWT_SECRET)
    //  attach dedcoded user in token to req.user in req object
    req.user = decoded.user
    //  call next to continue to the next middleware with the new validated user in req object
    next()
  } catch (err) {
    // if token is invalid or expired
    res.status(401).json({ msg: 'token not valid' })
  }
}
