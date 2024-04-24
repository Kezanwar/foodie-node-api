export const baseUrl = process.env.BASE_URL

const appEnv = process.env.APP_ENV

export const isDev = appEnv === 'development'
export const isStaging = appEnv === 'staging'
export const isProd = appEnv === 'production'

export const dashboardUrl = isStaging
  ? 'https://dashboard.thefoodiestaging.app'
  : isProd
  ? 'https://dashboard.thefoodie.app'
  : 'http://localhost:3033'

export const landingUrl = isDev || isStaging ? 'https://thefoodiestaging.app' : isProd ? 'https://thefoodie.app' : null
