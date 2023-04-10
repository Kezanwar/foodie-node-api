import rateLimit from 'express-rate-limit'

const rateLimiterMiddlware = rateLimit({
  //   windowMs: 24 * 60 * 60 * 1000, // 24 hrs in milliseconds
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20,
  message: 'You have exceeded the 20 requests in 1 minute limit!',
  standardHeaders: true,
  legacyHeaders: false,
})

export default rateLimiterMiddlware
