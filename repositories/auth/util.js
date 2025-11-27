import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import axios from 'axios'
import { addMinutes } from 'date-fns'
import appleSignin from 'apple-signin-auth'
import { GOOGLE_REGISTER_EMAIL_PW_SECRET, JWT_SECRET } from '#app/config/config.js'

class AuthUtil {
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
    apple: 'apple',
  }

  static get jwtAuthMethod() {
    return this.#auth_methods.jwt
  }

  static get googleAuthMethod() {
    return this.#auth_methods.google
  }

  static get appleAuthMethod() {
    return this.#auth_methods.apple
  }

  static isJWTAuthMethod(check) {
    return check === this.#auth_methods.jwt
  }
  static isGoogleAuthMethod(check) {
    return check === this.#auth_methods.google
  }

  static isAppleAuthMethod(check) {
    return check === this.#auth_methods.apple
  }

  static fetchGoogleOAuthUser(token) {
    return axios.get(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${token}`)
  }

  static verifyAppleIdToken(id_token) {
    return appleSignin.verifyIdToken(
      id_token, // We need to pass the token that we wish to decode.
      {
        audience: 'com.thefoodie.app', // client id - The same one we used  on the frontend, this is the secret key used for encoding and decoding the token.
        ignoreExpiration: true, // Token will not expire unless you manually do so.
      }
    )
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
    const hash = await bcrypt.hash(password + GOOGLE_REGISTER_EMAIL_PW_SECRET, salt)
    return hash
  }

  static async comparePasswordToHash(password, hash) {
    const match = bcrypt.compare(password, hash)
    return match
  }
}

export default AuthUtil
