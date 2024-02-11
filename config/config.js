export const baseUrl = process.env.BASE_URL

export const appEnv = process.env.APP_ENV

export const dashboardUrl =
  appEnv === 'development'
    ? 'http://localhost:3033'
    : appEnv === 'staging'
    ? 'https://dashboard.thefoodiestaging.app'
    : appEnv === 'production'
    ? 'https://dashboard.thefoodie.app'
    : null

export const landingUrl =
  appEnv === 'development'
    ? 'http://localhost:3000'
    : appEnv === 'staging'
    ? 'https://thefoodiestaging.app'
    : appEnv === 'production'
    ? 'https://thefoodie.app'
    : null
