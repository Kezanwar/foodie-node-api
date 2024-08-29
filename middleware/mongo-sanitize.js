import ExpressMongoSanitize from 'express-mongo-sanitize'

const mongoSanitize = ExpressMongoSanitize({
  allowDots: true,
})

export default mongoSanitize
