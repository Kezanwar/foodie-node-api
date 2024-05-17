import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import axios from 'axios'
import { addMinutes } from 'date-fns'
dotenv.config()

const JWT_SECRET = process.env.JWT_SECRET

class Auth {
  //jwt sign
  static jwtSign15Mins(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' })
  }
  static jwtSign30Days(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' })
  }
  static jwtSign365Days(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '365d' })
  }
  //jwt verify
  static jwtVerify(token) {
    return jwt.verify(token, JWT_SECRET)
  }

  static #auth_methods = {
    jwt: 'jwt',
    google: 'google',
  }

  static get jwtAuthMethod() {
    return this.#auth_methods.jwt
  }

  static get googleAuthMethod() {
    return this.#auth_methods.google
  }

  static isJWTAuthMethod(check) {
    return check === this.#auth_methods.jwt
  }
  static isGoogleAuthMethod(check) {
    return check === this.#auth_methods.google
  }

  static fetchGoogleOAuthUser(token) {
    return axios.get(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${token}`)
  }

  static createOTP() {
    const arr = []
    let start = 0
    while (start <= 5) {
      arr.push(Math.floor(Math.random() * 10))
      start++
    }
    return arr.join('')
  }

  static createChangePWExpiryDate() {
    return addMinutes(new Date(), 15).toISOString()
  }

  static async hashUserGeneratedPW(password) {
    const salt = await bcrypt.genSalt(10)
    const hash = await bcrypt.hash(password, salt)
    return hash
  }

  static async hashServerGeneratedPW(password) {
    const salt = await bcrypt.genSalt(10)
    const hash = await bcrypt.hash(password + process.env.GOOGLE_REGISTER_EMAIL_PW_SECRET, salt)
    return hash
  }

  static async comparePasswordToHash(password, hash) {
    const match = bcrypt.compare(password, hash)
    return match
  }
}

export default Auth
