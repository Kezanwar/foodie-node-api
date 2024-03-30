import dotenv from 'dotenv'
dotenv.config()

export const JWT_SECRET = process.env.JWT_SECRET

export const AUTH_METHODS = {
  jwt: 'jwt',
  google: 'google',
}
