export const baseUrl = process.env.BASE_URL

export const appEnv = process.env.APP_ENV

export const feUrl =
  appEnv === 'development'
    ? 'http://localhost:3033/'
    : appEnv === 'staging'
    ? 'https://foodie-restaurant-react-staging.onrender.com/'
    : appEnv === 'production'
    ? 'dashboard.thefoodie.app'
    : null
