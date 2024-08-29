import rateLimit from 'express-rate-limit'

const rateLimiter = rateLimit({
  //   windowMs: 24 * 60 * 60 * 1000, // 24 hrs in milliseconds
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60,
  message: 'You have exceeded the 60 requests in 1 minute limit!',
  standardHeaders: true,
  legacyHeaders: false,
})

export default rateLimiter
