export const baseUrl = process.env.BASE_URL

const appEnv = process.env.APP_ENV

export const stripeSecretApiKey = process.env.STRIPE_SECRET_KEY

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
