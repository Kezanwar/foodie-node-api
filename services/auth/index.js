import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import axios from 'axios'
import { addMinutes } from 'date-fns'
dotenv.config()

const JWT_SECRET = process.env.JWT_SECRET

class AuthService {
  //jwt sign
  jwtSign15Mins(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' })
  }
  jwtSign30Days(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' })
  }
  jwtSign365Days(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '365d' })
  }
  //jwt verify
  jwtVerify(token) {
    return jwt.verify(token, JWT_SECRET)
  }

  #auth_methods = {
    jwt: 'jwt',
    google: 'google',
  }

  get jwtAuthMethod() {
    return this.#auth_methods.jwt
  }

  get googleAuthMethod() {
    return this.#auth_methods.google
  }

  isJWTAuthMethod(check) {
    return check === this.#auth_methods.jwt
  }
  isGoogleAuthMethod(check) {
    return check === this.#auth_methods.google
  }

  fetchGoogleAuthUser(token) {
    return axios.get(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${token}`)
  }

  createOTP() {
    const arr = []
    let start = 0
    while (start <= 5) {
      arr.push(Math.floor(Math.random() * 10))
      start++
    }
    return arr.join('')
  }

  createChangePWExpiryDate() {
    return addMinutes(new Date(), 15).toISOString()
  }

  async hashUserGeneratedPW(password) {
    const salt = await bcrypt.genSalt(10)
    const hash = await bcrypt.hash(password, salt)
    return hash
  }

  async hashServerGeneratedPW(password) {
    const salt = await bcrypt.genSalt(10)
    const hash = await bcrypt.hash(password + process.env.GOOGLE_REGISTER_EMAIL_PW_SECRET, salt)
    return hash
  }

  async comparePasswordToHash(password, hash) {
    const match = bcrypt.compare(password, hash)
    return match
  }
}

const Auth = new AuthService()

export default Auth
