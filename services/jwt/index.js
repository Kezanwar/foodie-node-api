import pkg from 'jsonwebtoken'
import { JWT_SECRET } from '#app/constants/auth.js'

const { sign, verify } = pkg

class JWTService {
  //sign
  sign15Mins(payload) {
    return sign(payload, JWT_SECRET, { expiresIn: '15m' })
  }
  sign30Days(payload) {
    return sign(payload, JWT_SECRET, { expiresIn: '30d' })
  }
  sign365Days(payload) {
    return sign(payload, JWT_SECRET, { expiresIn: '365d' })
  }

  //verify
  verify(token) {
    return verify(token, JWT_SECRET)
  }
}

const jwt = new JWTService()

export default jwt
