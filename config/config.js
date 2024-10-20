import dotenv from 'dotenv'
dotenv.config()

export const PORT = process.env.PORT

export const baseUrl = process.env.BASE_URL

export const RAPID_API_KEY = process.env.RAPID_KEY

export const JWT_SECRET = process.env.JWT_SECRET

export const REDIS_URL = process.env.REDIS_URL

export const MONGO_URI = process.env.MONGO_URI

export const GOOGLE_REGISTER_EMAIL_PW_SECRET = process.env.GOOGLE_REGISTER_EMAIL_PW_SECRET

export const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY

export const MIXPANEL_TOKEN = process.env.MIXPANEL_TOKEN

const appEnv = process.env.APP_ENV

export const stripeSecretApiKey = process.env.STRIPE_SECRET_KEY
export const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET

export const bucketName = process.env.BUCKET_NAME
export const bucketRegion = process.env.BUCKET_REGION
export const S3AccessKey = process.env.S3_ACCESS_KEY
export const S3SecretKey = process.env.S3_SECRET_KEY

export const S3BaseUrl = process.env.S3_BUCKET_BASE_URL

export const isDev = appEnv === 'development'
export const isStaging = appEnv === 'staging'
export const isProd = appEnv === 'production'

export const dashboardUrl = isStaging
  ? 'https://dashboard.thefoodiestaging.app'
  : isProd
  ? 'https://dashboard.thefoodie.app'
  : 'http://localhost:3033'

export const landingUrl = isDev || isStaging ? 'https://thefoodiestaging.app' : isProd ? 'https://thefoodie.app' : null

export const inidividualPriceID = process.env.INDIVIDUAL_PLAN_PRICE_ID
export const premiumPriceID = process.env.PREMIUM_PLAN_PRICE_ID
